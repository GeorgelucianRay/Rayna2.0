// nluEngine.js
export function normalize(s) {
  const DIAC = { á:"a", é:"e", í:"i", ó:"o", ú:"u", ü:"u", ñ:"n",
                 Á:"a", É:"e", Í:"i", Ó:"o", Ú:"u", Ü:"u", Ñ:"n" };
  return (s || "")
    .toLowerCase()
    .replace(/[áéíóúüñÁÉÍÓÚÜÑ]/g, c => DIAC[c] ?? c)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ed(a,b){ // Damerau–Levenshtein simplu
  const al=a.length, bl=b.length;
  const d=Array.from({length:al+1},(_,i)=>Array.from({length:bl+1},(_,j)=>(i===0?j:j===0?i:0)));
  for(let i=1;i<=al;i++){
    for(let j=1;j<=bl;j++){
      const c=a[i-1]===b[j-1]?0:1;
      d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+c);
      if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1]) d[i][j]=Math.min(d[i][j],d[i-2][j-2]+c);
    }
  }
  return d[al][bl];
}
const fuzzyEq=(a,b)=>{a=normalize(a);b=normalize(b); if(a===b) return true; const L=Math.max(a.length,b.length); const tol=L<=4?1:2; return ed(a,b)<=tol;};

function includesAny(text, arr){ if(!arr?.length) return false; const n=normalize(text); return arr.some(p=> n.includes(normalize(p))); }
function hasToken(text, list){ if(!list?.length) return false; const toks=normalize(text).split(" ").filter(Boolean); return list.some(w => toks.some(tk => fuzzyEq(tk,w))); }

/* -------------------- Capture: cameraName -------------------- */
function captureCameraName(raw, stopwords=[]) {
  const service = new Set([
    ...(stopwords||[]),
    "la","el","una","un","de","del","al",
    "camara","cámara","camera","camaras","cámaras",
    "abre","abrir","abreme","ábreme","ver","muestra","mostrar","desplegar",
    "deschide","vreau","sa","să","vad","văd","quiero",
    "por","favor","pf","pls","porfavor","please","entonces","ok","vale",
    "añadir","anadir","agregar","crear","nueva","nuevo",
    "adauga","adaugă","adaug","adăuga","adaugare","add","poner","publicar"
  ]);
  const toks = normalize(raw).split(" ").filter(Boolean).filter(w => !service.has(w));
  if (toks.length >= 1) {
    const candidate = toks.slice(-3).join(" ").trim();
    if (!candidate || ["camara","cámara","camera"].includes(candidate)) return null;
    if (/^[a-z0-9._ -]{2,}$/i.test(candidate)) return candidate;
  }
  const trimmed = raw.trim().replace(/[?!.]+$/,"");
  if (/^[A-Za-z0-9._ -]{2,}$/.test(trimmed)) return trimmed;
  return null;
}

/* -------------------- Capture: placeName --------------------- */
function capturePlaceName(raw, stopwords = []) {
  const service = new Set([
    ...(stopwords||[]),
    // articole / legături
    "a","al","la","el","de","del","pe","către",
    // verbe/întrebări tip GPS
    "quiero","llegar","llevar","ir","navegar","como","cómo","llego",
    "vreau","sa","să","ajung","merg",
    "info","informacion","información","donde","dónde","esta","está",
    "despre"
  ]);
  const toks = normalize(raw).split(" ").filter(Boolean).filter(w => !service.has(w));
  if (toks.length >= 1) {
    const cand = toks.slice(-4).join(" ").trim();
    if (/^[a-z0-9._ -]{2,}$/i.test(cand)) return cand;
  }
  const trimmed = raw.trim().replace(/[?!.]+$/,"");
  if (/^[A-Za-z0-9._ -]{2,}$/.test(trimmed)) return trimmed;
  return null;
}

/* ---------------------- Intent detect ------------------------ */
export function detectIntent(message, intentsJson) {
  const text = message;
  const intents = [...intentsJson].sort((a,b)=> (b.priority||0)-(a.priority||0));

  for (const it of intents) {
    if (it.id === "fallback") continue;

    // 1) potrivire pe patterns
    let ok = includesAny(text, it.patterns_any) || hasToken(text, it.patterns_any);

    // 1.1) negative_any — ex.: “añadir” inhibă ver_camara
    if (ok && it.negative_any) {
      const negHit = includesAny(text, it.negative_any) || hasToken(text, it.negative_any);
      if (negHit) ok = false;
    }

    // 2) Heuristică ver_camara (scurt sau indicii cameră fără "crear")
    if (!ok && it.id === "ver_camara") {
      const tokens = normalize(text).split(" ").filter(Boolean);
      const hasCameraCue = includesAny(text, [
        "camara","cámara","camera","abre","abrir","ver","muestra","mostrar","desplegar","deschide"
      ]);
      const createCue = includesAny(text, [
        "añadir","anadir","agregar","crear","nueva","nuevo",
        "adauga","adaugă","adaug","adăuga","adaugare","add",
        "poner","publicar","alta"
      ]);
      if ((hasCameraCue && !createCue) || tokens.length <= 2) ok = true;
    }

    // 3) Heuristică GPS: dacă userul scrie doar numele (1–2 tokens) și
    //    intentul e de navigare sau info, acceptăm.
    if (!ok && (it.id === "gps_navegar_a" || it.id === "gps_info_de")) {
      const tokens = normalize(text).split(" ").filter(Boolean);
      if (tokens.length <= 2) ok = true;
    }

    if (!ok) continue;

    // 4) slots
    const slots = {};
    if (it.slots?.cameraName) {
      const name = captureCameraName(text, it.stopwords);
      if (name) slots.cameraName = name;
    }
    if (it.slots?.placeName) {
      const pname = capturePlaceName(text, it.stopwords);
      if (pname) slots.placeName = pname;
    }

    return { intent: it, slots };
  }

  // 5) fallback
  const fb = intents.find(i=>i.id==="fallback");
  return { intent: fb, slots:{} };
}
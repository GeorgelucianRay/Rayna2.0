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

function includesAny(text, arr){ const n=normalize(text); return (arr||[]).some(p=> n.includes(normalize(p))); }
function hasToken(text, list){ const toks=normalize(text).split(" "); return (list||[]).some(w => toks.some(tk => fuzzyEq(tk,w))); }

// ——— extrage numele camerei din mesaj (mai strict) ———
function captureCameraName(raw, stopwords=[]) {
  // cuvinte de serviciu pe care le ignorăm din extragere
  const service = new Set([
    ...(stopwords||[]),
    "la","el","una","un","de","del","al","la",
    "camara","cámara","camera","camaras","cámaras",
    "abre","abrir","abreme","ábreme","ver","muestra","mostrar","desplegar",
    "deschide","vreau","sa","să","vad","văd","quiero","por","favor","pf","pls",
    "entonces","ok","vale","porfavor","please","la","el","una","un"
  ]);

  const toks = normalize(raw).split(" ").filter(Boolean).filter(w => !service.has(w));
  if (toks.length >= 1) {
    const candidate = toks.slice(-3).join(" ").trim(); // ultimele 1–3 cuvinte
    // respinge dacă candidatul lipsește sau e doar „camara/cámara/camera”
    if (!candidate || ["camara","cámara","camera"].includes(candidate)) return null;
    // acceptă doar dacă are min 2 caractere utile
    if (/^[a-z0-9._ -]{2,}$/i.test(candidate)) return candidate;
  }

  // fallback: mesaje scurte de tip "TCB?" / "TCB"
  const trimmed = raw.trim().replace(/[?!.]+$/,"");
  if (/^[A-Za-z0-9._ -]{2,}$/.test(trimmed)) return trimmed;
  return null;
}

export function detectIntent(message, intentsJson) {
  const text = message;
  const intents = [...intentsJson].sort((a,b)=> (b.priority||0)-(a.priority||0));

  for (const it of intents) {
    if (it.id === "fallback") continue;

    // 1) potrivire pe patterns
    let ok = includesAny(text, it.patterns_any) || hasToken(text, it.patterns_any);

    // 1.1) negative_any — dacă apare, anulăm matchul (ex.: "añadir" inhibă ver_camara)
    if (ok && it.negative_any) {
      const negHit = includesAny(text, it.negative_any) || hasToken(text, it.negative_any);
      if (negHit) ok = false;
    }

    // 2) Heuristică suplimentară doar pentru ver_camara:
    //    - indicii de cameră (verbe/cuvinte dedicate), și să NU fie cuvinte de creare
    //    - sau mesaj foarte scurt (≤2 tokens), ex. "TCB?"
    if (!ok && it.id === "ver_camara") {
      const tokens = normalize(text).split(" ").filter(Boolean);
      const hasCameraCue = includesAny(text, ["camara","cámara","camera","abre","abrir","ver","muestra","mostrar","desplegar","deschide"]);
      const createCue    = includesAny(text, ["añadir","anadir","agregar","crear","nueva","nuevo","adauga","adaugă","adaug","add","poner","publicar"]);
      if ((hasCameraCue && !createCue) || tokens.length <= 2) ok = true;
    }

    if (!ok) continue;

    // 3) slots
    const slots = {};
    if (it.slots?.cameraName) {
      const name = captureCameraName(text, it.stopwords);
      if (name) slots.cameraName = name;
    }

    return { intent: it, slots };
  }

  // fallback
  const fb = intents.find(i=>i.id==="fallback");
  return { intent: fb, slots:{} };
}
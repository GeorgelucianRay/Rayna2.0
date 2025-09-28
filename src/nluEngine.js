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

function ed(a,b){ // Damerau-Levenshtein simplu
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

// extrage numele camerei din mesaj
function captureCameraName(raw, stopwords=[]) {
  const service = new Set([...(stopwords||[]), "la","el","una","un","camara","cámara","camera","abre","abrir","ver","muestra","desplegar","deschide","vreau","să","vad","văd","quiero"]);
  const toks = normalize(raw).split(" ").filter(Boolean).filter(w => !service.has(w));
  if (toks.length >= 1) {
    return toks.slice(-3).join(" "); // ultimele 1–3 cuvinte
  }
  const trimmed = raw.trim().replace(/[?!.]+$/,"");
  if (/^[A-Za-z0-9._ -]{2,}$/.test(trimmed)) return trimmed;
  return null;
}

export function detectIntent(message, intentsJson) {
   const text = message;
   const intents = [...intentsJson].sort((a,b)=> (b.priority||0)-(a.priority||0));
   for (const it of intents) {
     if (it.id === "fallback") continue;

    let ok = includesAny(text, it.patterns_any) || hasToken(text, it.patterns_any);

    // Pentru ver_camara, permitem și:
    //  a) indicii explicite (cuvânt „camara/cámara/camera” sau verbe „abre/ver/…”)
    //  b) mesaj foarte scurt (≤2 tokens), ex. "TCB?"
    if (!ok && it.id === "ver_camara") {
      const tokens = normalize(text).split(" ").filter(Boolean);
      const hasCameraCue =
        includesAny(text, ["camara","cámara","camera","abre","abrir","ver","muestra","desplegar","deschide"]);
      if (hasCameraCue || tokens.length <= 2) ok = true;
    }

     if (!ok) continue;

     // slots
     const slots = {};
     if (it.slots?.cameraName) {
       const name = captureCameraName(text, it.stopwords);
       if (name) slots.cameraName = name;
     }

     return { intent: it, slots };
   }

   const fb = intents.find(i=>i.id==="fallback");
   return { intent: fb, slots:{} };
}

    // slots
    const slots = {};
    if (it.slots?.cameraName) {
      const name = captureCameraName(text, it.stopwords);
      if (name) slots.cameraName = name;
    }

    return { intent: it, slots };
  }
  // nimic găsit: fallback
  const fb = intents.find(i=>i.id==="fallback");
  return { intent: fb, slots:{} };
}
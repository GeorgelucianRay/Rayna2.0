// src/components/chat/nlu/semantic.js
// Variantă FĂRĂ TFJS — funcționează pe iOS/Android/Desktop.
// Folosește tokenizare + Jaccard similarity (unigrams + bigrams).

const IDX_KEY = 'semantic-index-v2';
const KB_KEY  = 'semantic-kb-v2';

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // scoate diacritice
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokensUnigrams(s) {
  const stop = new Set(['la','el','un','una','de','del','al','a','cu','si','și','si','que','qué','care','ce','când','cand','cuando','quan','de','din','pe','en','y','i','și','the','to','for']);
  return norm(s)
    .split(' ')
    .filter(w => w && !stop.has(w));
}
function tokensBigrams(arr) {
  const out = [];
  for (let i=0;i<arr.length-1;i++){
    out.push(arr[i] + ' ' + arr[i+1]);
  }
  return out;
}
function featurize(text){
  const u = tokensUnigrams(text);
  const b = tokensBigrams(u);
  return new Set([...u, ...b]);
}
function jaccard(setA, setB){
  if (!setA || !setB || setA.size === 0 || setB.size === 0) return 0;
  let inter = 0;
  for (const t of setA) if (setB.has(t)) inter++;
  const union = setA.size + setB.size - inter;
  return inter / (union || 1);
}

// ---------------- Intents index ----------------
export async function buildIntentIndex(intentsData){
  const items = [];
  for (const it of (intentsData || [])) {
    const id = it.id || it.action || 'unknown';
    const patterns = it.patterns_any || it.patterns || [];
    const fall = (it.title || id);
    const list = (patterns.length ? patterns : [fall])
      .map(t => String(t).trim())
      .filter(Boolean);

    for (const text of list) {
      items.push({ id, text, meta: { type:'intent' }, feat: featurize(text) });
    }
  }
  const index = { items };
  try { localStorage.setItem(IDX_KEY, JSON.stringify(serializeIndex(index))); } catch {}
  return index;
}

export async function getIntentIndex(intentsData){
  try {
    const raw = localStorage.getItem(IDX_KEY);
    if (raw) return deserializeIndex(JSON.parse(raw));
  } catch {}
  return buildIntentIndex(intentsData);
}

export async function searchIndex(query, index, { topK = 3 } = {}){
  if (!index?.items?.length) return [];
  const qFeat = featurize(query);
  const scored = index.items.map(it => ({
    item: it,
    score: jaccard(qFeat, it.feat),
  }));
  scored.sort((a,b)=>b.score-a.score);
  return scored.slice(0, topK);
}

function serializeIndex(index){
  // Set -> array pentru localStorage
  return {
    items: (index.items || []).map(it => ({
      ...it,
      feat: Array.from(it.feat || []),
    })),
  };
}
function deserializeIndex(obj){
  return {
    items: (obj.items || []).map(it => ({
      ...it,
      feat: new Set(it.feat || []),
    })),
  };
}

// ---------------- KB index ----------------
export async function buildKbIndex(rows){
  // rows: [{id,q,a,lang?}]
  const items = (rows || []).map(r => ({
    id: r.id,
    text: r.q,
    meta: { type:'kb', a: r.a, lang: r.lang || null },
    feat: featurize(r.q),
  }));
  const index = { items };
  try { localStorage.setItem(KB_KEY, JSON.stringify(serializeIndex(index))); } catch {}
  return index;
}

export async function getKbIndex(fetchRows){
  try {
    const raw = localStorage.getItem(KB_KEY);
    if (raw) return deserializeIndex(JSON.parse(raw));
  } catch {}
  const rows = (await fetchRows?.()) || [];
  return buildKbIndex(rows);
}
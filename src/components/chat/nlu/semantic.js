// src/components/chat/nlu/semantic.js
import * as tf from '@tensorflow/tfjs';
import * as use from '@tensorflow-models/universal-sentence-encoder';
import localforage from 'localforage';

const MODEL_KEY = 'use-model-ready-v1';
const IDX_KEY   = 'semantic-index-v1'; // intenții
const KB_KEY    = 'semantic-kb-v1';    // FAQ (opțional)

let _model = null;

async function loadModel() {
  if (_model) return _model;
  _model = await use.load();
  // mic marker în cache; nu salvăm modelul (se cache-uiește de TF automat)
  await localforage.setItem(MODEL_KEY, true).catch(()=>{});
  return _model;
}

export async function embed(texts) {
  const m = await loadModel();
  const vec = await m.embed(texts);
  const arr = await vec.array();
  vec.dispose?.();
  return arr; // [[d1..d512], [..]]
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i=0;i<a.length;i++){ dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  const denom = Math.sqrt(na)*Math.sqrt(nb) || 1;
  return dot/denom;
}

export async function buildIntentIndex(intentsData) {
  // pregătim corpus: pattern-uri (sau titluri) pe care vrei să le “nimească”
  const items = [];
  for (const it of (intentsData || [])) {
    const id = it.id || it.action || 'unknown';
    const patterns = it.patterns?.length ? it.patterns : [it.title || id];
    for (const p of patterns) {
      const text = String(p).trim();
      if (!text) continue;
      items.push({ id, text, meta: { type:'intent', weight: 1.0 } });
    }
  }
  if (!items.length) return { items:[], embeddings:[] };

  const embs = await embed(items.map(x => x.text));
  const index = { items, embeddings: embs };
  await localforage.setItem(IDX_KEY, index).catch(()=>{});
  return index;
}

export async function getIntentIndex(intentsData) {
  const cached = await localforage.getItem(IDX_KEY).catch(()=>null);
  if (cached?.items?.length) return cached;
  return buildIntentIndex(intentsData);
}

export async function searchIndex(query, index, { topK=3 } = {}) {
  const [qv] = await embed([query]);
  const scored = index.items.map((it, i) => ({
    item: it, score: cosine(qv, index.embeddings[i])
  }));
  scored.sort((a,b)=>b.score-a.score);
  return scored.slice(0, topK);
}

// —————— KB (opțional) ——————
export async function buildKbIndex(rows) {
  // rows: [{id, q, a}]
  const items = rows.map(r => ({ id: r.id, text: r.q, meta:{ type:'kb', a: r.a } }));
  const embs = await embed(items.map(x=>x.text));
  const index = { items, embeddings: embs };
  await localforage.setItem(KB_KEY, index).catch(()=>{});
  return index;
}
export async function getKbIndex(fetchRows) {
  // fetchRows: funcție async ce întoarce [{id, q, a}]
  const cached = await localforage.getItem(KB_KEY).catch(()=>null);
  if (cached?.items?.length) return cached;
  const rows = await fetchRows();
  return buildKbIndex(rows);
}
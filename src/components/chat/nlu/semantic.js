// TFJS + Universal Sentence Encoder (USE) pentru potrivire semantică
// - construim index din pattern-uri (toate limbile) pentru fiecare intent
// - căutăm cel mai apropiat intent (cosine similarity)
// - cache local cu localforage (edge/device) pentru încărcări rapide

import * as tf from '@tensorflow/tfjs';
import * as use from '@tensorflow-models/universal-sentence-encoder';
import localforage from 'localforage';

const MODEL_MARKER = 'use-model-ready-v1';
const INTENT_IDX   = 'rayna-intent-index-v1';
const KB_IDX       = 'rayna-kb-index-v1';

let _model = null;

async function loadModel() {
  if (_model) return _model;
  _model = await use.load(); // se cache-uiește automat de TFJS în IndexedDB
  await localforage.setItem(MODEL_MARKER, true).catch(() => {});
  return _model;
}

export async function embed(texts) {
  const m = await loadModel();
  const t = await m.embed(texts);
  const arr = await t.array();
  t.dispose?.();
  return arr; // [[512], ...]
}

function cosine(a, b) {
  let dot=0, na=0, nb=0;
  for (let i=0;i<a.length;i++){ dot+=a[i]*b[i]; na+=a[i]*a[i]; nb+=b[i]*b[i]; }
  const denom = Math.sqrt(na)*Math.sqrt(nb) || 1;
  return dot/denom;
}

// —————————————————————————————————————————————
// INDEX INTENȚII
// Acceptă fie it.patterns, fie it.patterns_any (ca în fișierele tale)
function patternsOf(it) {
  if (Array.isArray(it.patterns_any) && it.patterns_any.length) return it.patterns_any;
  if (Array.isArray(it.patterns) && it.patterns.length) return it.patterns;
  const t = it?.title || it?.id || it?.action || '';
  return t ? [t] : [];
}

export async function buildIntentIndex(intentsData=[]) {
  const items = [];
  for (const it of intentsData) {
    const id = it.id || it.action || 'unknown';
    const pats = patternsOf(it);
    for (const p of pats) {
      const text = String(p || '').trim();
      if (!text) continue;
      items.push({ id, text });
    }
  }
  if (!items.length) {
    const empty = { items: [], embs: [] };
    await localforage.setItem(INTENT_IDX, empty).catch(()=>{});
    return empty;
  }

  const embs = await embed(items.map(x => x.text));
  const index = { items, embs };
  await localforage.setItem(INTENT_IDX, index).catch(()=>{});
  return index;
}

export async function getIntentIndex(intentsData=[]) {
  const cached = await localforage.getItem(INTENT_IDX).catch(()=>null);
  if (cached?.items?.length) return cached;
  return buildIntentIndex(intentsData);
}

export async function searchIntentIndex(query, intentsIndex, { topK=3 } = {}) {
  if (!intentsIndex?.items?.length) return [];
  const [qv] = await embed([query]);
  const scored = intentsIndex.items.map((it, i) => ({
    id: it.id,
    text: it.text,
    score: cosine(qv, intentsIndex.embs[i]),
  }));
  scored.sort((a,b)=>b.score-a.score);
  return scored.slice(0, topK);
}

// —————————————————————————————————————————————
// INDEX KB (FAQ din Supabase) — opțional
export async function buildKbIndex(rows=[]) {
  // rows: [{id, q, a, lang?}]
  if (!rows.length) {
    const empty = { items:[], embs:[] };
    await localforage.setItem(KB_IDX, empty).catch(()=>{});
    return empty;
  }
  const items = rows.map(r => ({ id: r.id, q: r.q, a: r.a, lang: r.lang || 'es' }));
  const embs  = await embed(items.map(x => x.q));
  const index = { items, embs };
  await localforage.setItem(KB_IDX, index).catch(()=>{});
  return index;
}

export async function getKbIndex(fetchRows) {
  const cached = await localforage.getItem(KB_IDX).catch(()=>null);
  if (cached?.items?.length) return cached;
  const rows = typeof fetchRows === 'function' ? (await fetchRows()) : [];
  return buildKbIndex(rows);
}

export async function searchKbIndex(query, kbIndex, { topK=3 } = {}) {
  if (!kbIndex?.items?.length) return [];
  const [qv] = await embed([query]);
  const scored = kbIndex.items.map((it, i) => ({
    id: it.id,
    q: it.q,
    a: it.a,
    lang: it.lang || 'es',
    score: cosine(qv, kbIndex.embs[i]),
  }));
  scored.sort((a,b)=>b.score-a.score);
  return scored.slice(0, topK);
}
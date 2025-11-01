// Motor semantic cu TensorFlow.js + Universal Sentence Encoder (USE)
// - construiește indexuri locale (intents + KB) și le cache-uiește cu localforage
// - suportă căutare semantică (cosine similarity)
//
// Dependențe (deja instalate conform discuției):
//   npm i @tensorflow/tfjs @tensorflow-models/universal-sentence-encoder localforage

import * as tf from "@tensorflow/tfjs";
import * as use from "@tensorflow-models/universal-sentence-encoder";
import localforage from "localforage";

const MODEL_READY_KEY = "use-model-ready-v1";
const INTENT_INDEX_KEY = "semantic-intents-v1";
const KB_INDEX_KEY = "semantic-kb-v1";

let _model = null;

async function loadModel() {
  if (_model) return _model;
  _model = await use.load();
  // marcăm în cache că modelul a fost încărcat (nu salvăm binarele)
  await localforage.setItem(MODEL_READY_KEY, true).catch(() => {});
  return _model;
}

export async function embed(texts) {
  const model = await loadModel();
  const t = await model.embed(texts);
  const arr = await t.array();
  t.dispose?.();
  return arr; // [[512], [512], ...]
}

function cosine(a, b) {
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
  return dot / denom;
}

/**
 * Construiește index semantic pentru INTENȚII.
 * Așteaptă obiecte cu:
 *  - id / action
 *  - patterns sau patterns_any (lista de fraze de antrenare)
 */
export async function buildIntentIndex(intentsData) {
  const items = [];
  for (const it of intentsData || []) {
    const id = it.id || it.action || "unknown";
    const patterns = (it.patterns_any && it.patterns_any.length
      ? it.patterns_any
      : it.patterns) || [it.title || id];

    for (const p of patterns) {
      const text = String(p || "").trim();
      if (!text) continue;
      items.push({ id, text, meta: { type: "intent" } });
    }
  }
  if (!items.length) {
    const empty = { items: [], embeddings: [] };
    await localforage.setItem(INTENT_INDEX_KEY, empty).catch(() => {});
    return empty;
  }

  const embeddings = await embed(items.map((x) => x.text));
  const index = { items, embeddings };
  await localforage.setItem(INTENT_INDEX_KEY, index).catch(() => {});
  return index;
}

export async function getIntentIndex(intentsData) {
  const cached = await localforage.getItem(INTENT_INDEX_KEY).catch(() => null);
  if (cached?.items?.length) return cached;
  return buildIntentIndex(intentsData || []);
}

export async function searchIndex(query, index, { topK = 3 } = {}) {
  if (!index?.items?.length) return [];
  const [qv] = await embed([String(query || "")]);
  const scores = index.items.map((it, i) => ({
    item: it,
    score: cosine(qv, index.embeddings[i]),
  }));
  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, topK);
}

/** KB index (opțional) — rows: [{ id, q, a }] */
export async function buildKbIndex(rows) {
  const items = (rows || []).map((r) => ({
    id: r.id,
    text: String(r.q || "").trim(),
    meta: { type: "kb", a: r.a },
  }));
  if (!items.length) {
    const empty = { items: [], embeddings: [] };
    await localforage.setItem(KB_INDEX_KEY, empty).catch(() => {});
    return empty;
  }
  const embeddings = await embed(items.map((x) => x.text));
  const index = { items, embeddings };
  await localforage.setItem(KB_INDEX_KEY, index).catch(() => {});
  return index;
}

export async function getKbIndex(fetchRows) {
  const cached = await localforage.getItem(KB_INDEX_KEY).catch(() => null);
  if (cached?.items?.length) return cached;
  const rows = (typeof fetchRows === "function" ? await fetchRows() : []) || [];
  return buildKbIndex(rows);
}
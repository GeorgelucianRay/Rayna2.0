// src/components/chat/semanticFallback.js
// Fallback semantic fără TFJS: căutăm cu Jaccard în intenții și, opțional, în KB.

import { getIntentIndex, searchIndex, getKbIndex } from './nlu/semantic';

export async function semanticMatch({ userText, intentsData, fetchKbRows }) {
  const query = String(userText || '').trim();
  if (!query) return null;

  // 1) Intent semantic
  const intentIdx = await getIntentIndex(intentsData);
  const topIntents = await searchIndex(query, intentIdx, { topK: 3 });
  if (topIntents[0]?.score >= 0.28) {
    // prag rezonabil; ajustează după cum simți
    const bestId = topIntents[0].item.id;
    const found = (intentsData || []).find(i => (i.id || i.action) === bestId);
    if (found) return { kind: 'intent', intent: found, score: topIntents[0].score };
  }

  // 2) KB semantic (opțional)
  if (fetchKbRows) {
    const kbIdx = await getKbIndex(fetchKbRows);
    const topKb = await searchIndex(query, kbIdx, { topK: 3 });
    if (topKb[0]?.score >= 0.30) {
      const it = topKb[0].item;
      return { kind: 'kb', answer: it.meta?.a, score: topKb[0].score };
    }
  }

  return null;
}
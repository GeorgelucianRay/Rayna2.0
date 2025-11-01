// src/components/chat/semanticFallback.js
import { getIntentIndex, searchIndex, getKbIndex } from './nlu/semantic';

/**
 * Întoarce:
 *  - { kind:'intent', intent }  dacă găsește intenție cu scor ok
 *  - { kind:'kb', answer }      dacă găsește răspuns din KB
 *  - null                       dacă nu e suficient de sigur
 */
export async function semanticMatch({ userText, intentsData, fetchKbRows }) {
  if (!userText || userText.trim().length < 2) return null;

  // 1) cautăm în intenții
  const idx = await getIntentIndex(intentsData);
  const top = await searchIndex(userText, idx, { topK: 3 });
  const best = top[0];

  // praguri empirice: >0.72 foarte sigur; >0.6 acceptabil dacă e scurt
  if (best && best.score >= 0.72) {
    const intent = intentsData.find(i => (i.id===best.item.id || i.action===best.item.id));
    if (intent) return { kind:'intent', intent, score: best.score };
  }

  // 2) optional — fallback pe KB (FAQ) dacă există fetchKbRows
  if (typeof fetchKbRows === 'function') {
    const kbIndex = await getKbIndex(fetchKbRows);
    if (kbIndex?.items?.length) {
      const kt = await searchIndex(userText, kbIndex, { topK: 3 });
      const kbest = kt[0];
      if (kbest && kbest.score >= 0.68) {
        return { kind:'kb', answer: kbest.item.meta.a, score: kbest.score };
      }
    }
  }

  return null;
}
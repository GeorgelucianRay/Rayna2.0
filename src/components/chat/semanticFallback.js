// “Fața prietenoasă” peste semantic.js:
// - caută mai întâi un intent apropiat semantic
// - dacă nu e destul de aproape, caută în KB (FAQ supabase) dacă îi dai fetchKbRows
// - respectă limba utilizatorului când livrează răspuns

import { getIntentIndex, searchIntentIndex, getKbIndex, searchKbIndex } from './nlu/semantic';
import { pickTextByLang } from './nlu/lang';

// praguri recomandate (USE cosine):
const THRESH_INTENT = 0.72;  // cât de sigur vrei să fie pe intenții
const THRESH_KB     = 0.70;  // pentru FAQ

export async function semanticMatch({ userText, intentsData, lang='es', fetchKbRows }) {
  // 1) Intent semantic
  const idx = await getIntentIndex(intentsData);
  const topI = await searchIntentIndex(userText, idx, { topK: 3 });

  if (topI[0]?.score >= THRESH_INTENT) {
    const winnerId = topI[0].id;
    const intent = intentsData.find(i => (i.id || i.action) === winnerId);
    if (intent) {
      return { kind: 'intent', intent };
    }
  }

  // 2) FAQ KB (opțional)
  if (typeof fetchKbRows === 'function') {
    const kb = await getKbIndex(fetchKbRows);
    const topK = await searchKbIndex(userText, kb, { topK: 3 });
    if (topK[0]?.score >= THRESH_KB) {
      const a = topK[0].a;
      // a poate fi string simplu sau obiect {es,ro,ca}
      const txt = typeof a === 'object' ? pickTextByLang(a, lang) : String(a || '');
      return { kind: 'kb', answer: txt || '' };
    }
  }

  return null; // nimic semnificativ
}
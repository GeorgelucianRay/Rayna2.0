// Fallback semantic (intenții + KB) bazat pe USE (tfjs) și cache local
// Folosește indexul semantic din: ./nlu/semantic
// Detectează limba cu: ./nlu/lang

import { getIntentIndex, getKbIndex, searchIndex } from "./nlu/semantic";
import { detectLanguage } from "./nlu/lang";

/**
 * semanticMatch({ userText, intentsData, fetchKbRows? })
 * întoarce:
 *  - { kind: 'intent', intent, score, lang }
 *  - { kind: 'kb', answer, score, lang, id }
 *  - null (dacă nu s-a găsit nimic)
 */
export async function semanticMatch({ userText, intentsData, fetchKbRows } = {}) {
  const text = String(userText || "").trim();
  if (!text) return null;

  // 1) detectăm limba pe baza textului primit
  const lang = detectLanguage(text); // 'es' | 'ro' | 'ca'

  // 2) Construim corpus pentru INTENȚII
  // — normalizează structura pentru indexul semantic:
  //    semantic.js se uită după "patterns", iar tu ai "patterns_any"
  const intentsNormalized = (intentsData || []).map((it) => ({
    ...it,
    patterns: it.patterns_any && it.patterns_any.length
      ? it.patterns_any
      : (it.patterns || [it.title || it.id || it.action || ""]),
  }));

  // 3) Căutăm INTENȚII (top K)
  let bestIntent = null;
  try {
    const idx = await getIntentIndex(intentsNormalized);
    const top = await searchIndex(text, idx, { topK: 3 }); // primele 3 sugestii
    // praguri recomandate (poți regla):
    // 0.80 = foarte încrezător, 0.72 = acceptabil
    const TH_STRICT = 0.80;
    const TH_LOOSE  = 0.72;

    if (top && top.length) {
      const { item, score } = top[0] || {};
      if (item && score >= TH_LOOSE) {
        // găsește intenția originală (cu toate câmpurile)
        const intentObj =
          intentsData.find(it =>
            (it.id && it.id === item.id) ||
            (it.action && it.action === item.id)
          ) || null;

        if (intentObj) {
          bestIntent = { intent: intentObj, score: Number(score || 0) };
        }
      }
    }
  } catch (e) {
    // dacă tfjs/use încă nu s-a încărcat, continuăm fără intent semantic
    console.warn("[semanticMatch:intents] fallback error", e);
  }

  // 4) Căutăm în KB (dacă ai furnizat fetchKbRows)
  let bestKB = null;
  if (typeof fetchKbRows === "function") {
    try {
      const kbIndex = await getKbIndex(fetchKbRows);
      const topKb = await searchIndex(text, kbIndex, { topK: 3 });
      const TH_KB = 0.75;

      if (topKb && topKb.length) {
        const { item, score } = topKb[0] || {};
        if (item && score >= TH_KB) {
          // item.meta.a = răspunsul
          bestKB = {
            id: item.id,
            answer: item?.meta?.a || "",
            score: Number(score || 0),
          };
        }
      }
    } catch (e) {
      console.warn("[semanticMatch:kb] fallback error", e);
    }
  }

  // 5) Alegem rezultatul cel mai bun:
  //    - dacă avem și intent, și KB, alegem scorul mai mare
  //    - dacă sunt apropiate, favorizăm INTENȚIA (că are flux/handler)
  if (bestIntent && bestKB) {
    if (bestIntent.score >= bestKB.score - 0.02) {
      return { kind: "intent", intent: bestIntent.intent, score: bestIntent.score, lang };
    }
    return { kind: "kb", answer: bestKB.answer, score: bestKB.score, id: bestKB.id, lang };
  }

  if (bestIntent) {
    return { kind: "intent", intent: bestIntent.intent, score: bestIntent.score, lang };
  }
  if (bestKB) {
    return { kind: "kb", answer: bestKB.answer, score: bestKB.score, id: bestKB.id, lang };
  }

  return null;
}
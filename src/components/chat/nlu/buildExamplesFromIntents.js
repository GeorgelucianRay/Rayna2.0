// src/components/chat/nlu/buildExamplesFromIntents.js
export function buildExamplesFromIntents(intents /*, lang */) {
  const out = [];
  for (const it of intents || []) {
    const list = it.utterances || [];
    for (const raw of list) {
      // accepți fie string simplu, fie obiect { text, lang }
      const u = typeof raw === 'string' ? { text: raw } : raw;
      // dacă vrei să filtrezi pe limbi, deblochează asta:
      // if (lang && u.lang && u.lang !== lang) continue;
      out.push({
        text: (u.text || '').replace(/\{[^}]+\}/g, '').trim(),
        intentId: it.id,
      });
    }
  }
  return out;
}
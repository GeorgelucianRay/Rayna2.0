// src/components/chat/nlu/shorten.js
import nlp from 'compromise';

export function shortenForNLU(text, { maxChars=320 } = {}) {
  if (!text) return '';
  const clean = String(text).replace(/\s+/g,' ').trim();
  if (clean.length <= maxChars) return clean;

  // Strategy: păstrăm propozițiile care conțin substantive proprii/verbe-cheie
  const doc = nlp(clean);
  const sentences = doc.sentences().out('array');
  const scored = sentences.map(s=>{
    const d = nlp(s);
    const proper = d.match('#ProperNoun').out('array').length;
    const verbs  = d.verbs().out('array').length;
    const nums   = d.numbers().out('array').length;
    const score = proper*2 + verbs + nums*1.5 + (s.length>60?1:0);
    return { s, score };
  });
  scored.sort((a,b)=>b.score-a.score);
  const pick = [];
  let total=0;
  for (const x of scored) {
    if (total + x.s.length + 1 > maxChars) continue;
    pick.push(x.s);
    total += x.s.length+1;
    if (total>=maxChars-40) break;
  }
  return pick.length ? pick.join(' ') : clean.slice(0, maxChars);
}
// src/components/chat/semanticFallback.js
import * as use from '@tensorflow-models/universal-sentence-encoder';
import { buildExamplesFromIntents } from './nlu/buildExamplesFromIntents';

let modelPromise = null;
async function getModel() {
  if (!modelPromise) modelPromise = use.load();
  return modelPromise;
}

export async function semanticMatch({ userText, intentsData, lang }) {
  const examples = buildExamplesFromIntents(intentsData /*, lang */); // deocamdată fără filtru
  if (!examples.length) return null;

  const model = await getModel();
  const corpus = examples.map(e => e.text);

  const [qEmb, cEmb] = await Promise.all([
    model.embed([userText]),
    model.embed(corpus),
  ]);

  const q = qEmb.arraySync()[0];
  const C = cEmb.arraySync();

  const sim = C.map(v => {
    let dot = 0, nq = 0, nv = 0;
    for (let i=0;i<v.length;i++){ dot+=q[i]*v[i]; nq+=q[i]*q[i]; nv+=v[i]*v[i]; }
    return dot / (Math.sqrt(nq)*Math.sqrt(nv));
  });

  let best = -1, bestIdx = -1;
  sim.forEach((s,i)=>{ if (s>best) { best = s; bestIdx = i; } });

  const THRESHOLD = 0.62; // ajustează la nevoie
  if (best >= THRESHOLD) {
    const { intentId } = examples[bestIdx];
    const intent = intentsData.find(it => it.id === intentId);
    return { kind: 'intent', intent, score: best };
  }
  return null;
}
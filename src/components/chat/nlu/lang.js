// src/components/chat/nlu/lang.js
import { franc } from 'franc';

// mapare coduri franc -> ce folosim noi
const MAP = {
  // spaniolă
  spa: 'es', est: 'es', // est = eroare ocazională, îl corectăm la es
  // catalană
  cat: 'ca', ron: 'ro', // ron = română (ISO 639-2)
  // română
  rum: 'ro', // cod vechi
};

const FALLBACK = 'es';

export function detectLang(text) {
  const s = String(text || '').trim();
  if (!s) return FALLBACK;
  // franc cere minim ~3+ litere ca să întoarcă ceva ok
  let code3 = 'und';
  try {
    code3 = franc(s, { minLength: 3 });
  } catch {}
  const lang = MAP[code3] || FALLBACK;
  return lang;
}

// mini helper pentru a afișa text localizat
export const STRINGS = {
  es: {
    hi: (name) => (name ? `Hola, ${name}. ¿En qué te puedo ayudar hoy?` : '¡Hola! ¿En qué te puedo ayudar hoy?'),
    aprender: 'Aprender',
    reclamar: 'Reclamar',
    say: 'Escribe aquí… (p. ej.: Quiero llegar a TCB)',
    not_understood: 'No te he entendido.',
    report_prompt: 'Claro, dime qué problema hay. Me encargo de resolverlo.',
    reported_ok: 'Gracias. He registrado el reporte. Me encargo de revisarlo.',
    reported_fail: 'Lo siento, no he podido registrar el reporte ahora mismo.',
    need_problem: 'Necesito que me escribas el problema para poder reportarlo.',
    need_location: 'Necesito tu ubicación',
    ask_time: '¿Cuánto disco te queda? (ej.: 1:25 o 45 min)',
  },
  ca: {
    hi: (name) => (name ? `Hola, ${name}. En què et puc ajudar avui?` : 'Hola! En què et puc ajudar avui?'),
    aprender: 'Aprendre',
    reclamar: 'Reclamar',
    say: 'Escriu aquí… (p. ex.: Vull arribar a TCB)',
    not_understood: 'No t’he entès.',
    report_prompt: 'És clar, digue’m quin problema hi ha. M’encarrego de resoldre-ho.',
    reported_ok: 'Gràcies. He registrat la incidència. Ho revisaré.',
    reported_fail: 'Ho sento, no he pogut registrar la incidència ara mateix.',
    need_problem: 'Necessito que m’escriguis el problema per poder registrar-lo.',
    need_location: 'Necessito la teva ubicació',
    ask_time: 'Quant disc et queda? (ex.: 1:25 o 45 min)',
  },
  ro: {
    hi: (name) => (name ? `Salut, ${name}. Cu ce te pot ajuta azi?` : 'Salut! Cu ce te pot ajuta azi?'),
    aprender: 'Învățare',
    reclamar: 'Reclamă',
    say: 'Scrie aici… (ex.: Vreau să ajung la TCB)',
    not_understood: 'Nu te-am înțeles.',
    report_prompt: 'Sigur, spune-mi ce problemă este. Mă ocup să o rezolv.',
    reported_ok: 'Mulțumesc. Am înregistrat reclamația. Mă ocup să o verific.',
    reported_fail: 'Îmi pare rău, nu am putut înregistra reclamația acum.',
    need_problem: 'Am nevoie să-mi scrii problema ca să o pot înregistra.',
    need_location: 'Am nevoie de locația ta',
    ask_time: 'Cât disc ți-a rămas? (ex.: 1:25 sau 45 min)',
  },
};

export function i18nPick(strings, lang, key) {
  const L = strings[lang] ? lang : 'es';
  return strings[L][key];
}
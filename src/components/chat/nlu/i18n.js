// src/components/chat/nlu/i18n.js
import { pickTextByLang } from "./lang";

/**
 * Returnează textul potrivit în funcție de limbă.
 * Acceptă fie string, fie obiect { es, ro, ca }.
 */
export function botText(textObjOrString, lang = "es") {
  return pickTextByLang(textObjOrString, lang);
}

/**
 * Adaugă un mesaj de la bot în lista de mesaje, localizat.
 * Extra poate conține orice alt payload pentru bulă (render, tag, etc.)
 */
export function pushBot(setMessages, textObjOrString, lang = "es", extra = {}) {
  const reply_text = botText(textObjOrString, lang);
  if (!reply_text) return;
  setMessages((m) => [...m, { from: "bot", reply_text, ...extra }]);
}

/**
 * Stringuri comune în es/ro/ca.
 * Le folosim pentru salut, “nu te-am înțeles”, “procesez…” etc.
 */
export const STR = {
  greeting: {
    es: (name) =>
      name ? `Hola, ${name}. ¿En qué te puedo ayudar hoy?`
           : "¡Hola! ¿En qué te puedo ayudar hoy?",
    ro: (name) =>
      name ? `Bună, ${name}. Cu ce te pot ajuta azi?`
           : "Bună! Cu ce te pot ajuta azi?",
    ca: (name) =>
      name ? `Hola, ${name}. En què et puc ajudar avui?`
           : "Hola! En què et puc ajudar avui?",
  },

  thinking: {
    es: "Un segundo… entendiendo tu mensaje…",
    ro: "O secundă… procesez mesajul…",
    ca: "Un segon… estic entenent el teu missatge…",
  },

  dontUnderstand: {
    es: "No te he entendido.",
    ro: "Nu te-am înțeles.",
    ca: "No t'he entès.",
  },
};
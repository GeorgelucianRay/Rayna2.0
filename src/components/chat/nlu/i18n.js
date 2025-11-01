// src/components/chat/nlu/i18n.js

// Mesaje scurte, folosite ca fallback-uri UI
export const STR = {
  hello: { es: "¡Hola! ¿En qué te puedo ayudar hoy?",
           ro: "Salut! Cu ce te pot ajuta?",
           ca: "Hola! En què et puc ajudar avui?" },
  nlu_loading: { es: "Un segundo… entendiendo tu mensaje…",
                 ro: "O secundă… procesez mesajul tău…",
                 ca: "Un segon… estic entenent el teu missatge…" },
  not_understood: { es: "No te he entendido.",
                    ro: "Nu te-am înțeles.",
                    ca: "No t'he entès." }
};

// Helper mic pentru a împinge rapid un răspuns bot în lista de mesaje
export function pushBot(setMessages, reply_text, extra = {}) {
  setMessages((m) => [...m, { from: "bot", reply_text, ...extra }]);
}
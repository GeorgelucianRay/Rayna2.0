// src/components/chat/actions/handleStatic.js
export async function handleStatic({ intent, setMessages, lang = 'es' }) {
  const byLang = intent?.response?.text;
  let reply = null;

  if (byLang && typeof byLang === 'object') {
    reply = byLang[lang] || byLang.es || Object.values(byLang)[0];
  } else if (typeof intent?.response?.text === 'string') {
    reply = intent.response.text; // compatibilitate veche
  }

  if (reply) {
    setMessages(m => [...m, { from: "bot", reply_text: reply }]);
  }
}
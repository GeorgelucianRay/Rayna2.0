// src/components/chat/actions/handleStatic.jsx
export default async function handleStatic({ intent, setMessages, lang = 'es' }) {
  const byLang = intent?.response?.text;
  let reply = null;

  if (byLang && typeof byLang === 'object') {
    reply = byLang[lang] || byLang.es || Object.values(byLang)[0];
  } else if (typeof intent?.response?.text === 'string') {
    reply = intent.response.text; // compat veche
  }

  if (reply) {
    setMessages(m => [...m, { from: "bot", reply_text: reply }]);
  }
}
// src/components/chat/routerIntent.js
import { handleStatic } from "./actions";

function pickReplyFromIntent(intent, lang='es') {
  // suportă EXACT structura ta: intent.response.text.{es,ro,ca}
  const byLang = intent?.response?.text;
  if (byLang && typeof byLang === 'object') {
    return byLang[lang] || byLang.es || Object.values(byLang)[0];
  }
  return null;
}

export async function routeIntent({
  det, intentsData,
  role, profile,
  setMessages, setAwaiting, setSaving,
  runAction,
  lang = 'es',        // ⬅️ primit din RaynaHub
}) {
  const { intent, slots } = det || {};

  if (!intent) {
    setMessages(m => [...m, { from:"bot", reply_text: lang==='ro' ? "Nu te-am înțeles." : lang==='ca' ? "No t'he entès." : "No te he entendido." }]);
    return;
  }

  if (intent.type === "static") {
    return handleStatic({ intent, setMessages, lang });
  }

  if (intent.type === "dialog") {
    // dacă ai un sistem de dialog separat, pasează lang acolo
    // await handleDialog.entry({ intent, role, setMessages, setAwaiting, setSaving, lang });
    // return;
  }

  if (intent.type === "action") {
    // 1) REPLICA de "pre-răspuns" localizată (dacă există)
    const pre = pickReplyFromIntent(intent, lang);
    if (pre) {
      setMessages(m => [...m, { from:"bot", reply_text: pre }]);
    }
    // 2) Rulează handlerul acțiunii (pasează lang)
    await runAction(intent, slots, pre ?? "", lang);
    return;
  }

  // fallback
  setMessages(m => [...m, { from:"bot", reply_text: lang==='ro' ? "Nu te-am înțeles." : lang==='ca' ? "No t'he entès." : "No te he entendido." }]);
}
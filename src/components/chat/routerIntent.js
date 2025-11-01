// src/components/chat/routerIntent.js
import { handleStatic, handleDialog } from "./actions";

export async function routeIntent({
  det, intentsData, role, profile,
  setMessages, setAwaiting, setSaving,
  runAction,
}) {
  const { intent, slots } = det || {};
  if (!intent || !intent.type) {
    const fb = intentsData.find((i) => i.id === "fallback")?.response?.text || "No te he entendido.";
    setMessages((m) => [...m, { from: "bot", reply_text: fb }]);
    return;
  }

  if (intent.type === "static") {
    await handleStatic({ intent, setMessages });
    return;
  }

  if (intent.type === "dialog") {
    const handled = await handleDialog.entry({
      intent, role, setMessages, setAwaiting, saving:false, setSaving,
    });
    if (handled) return;
  }

  if (intent.type === "action") {
    await runAction(intent, slots, det?.text || "");
    return;
  }

  const fb =
    intentsData.find((i) => i.id === "fallback")?.response?.text ||
    "No te he entendido.";
  setMessages((m) => [...m, { from: "bot", reply_text: fb }]);
}
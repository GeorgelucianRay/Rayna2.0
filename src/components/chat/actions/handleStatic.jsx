// src/components/chat/actions/handleStatic.jsx
import React from "react";
import ActionsRenderer from "../ui/ActionsRenderer";
import { tpl } from "../helpers/templating";

export default async function handleStatic({ intent, setMessages }) {
  const objs = intent.response?.objects || [];
  if (!objs.length) {
    setMessages((m) => [...m, { from: "bot", reply_text: intent.response.text }]);
    return;
  }
  const first = objs[0];
  if (first?.type === "card") {
    const card = {
      title: tpl(first.title || "", {}),
      subtitle: tpl(first.subtitle || "", {}),
      actions: (first.actions || []).map((a) => ({
        ...a,
        label: tpl(a.label || "", {}),
        route: tpl(a.route || "", {}),
        newTab: a.newTab,
      })),
    };
    setMessages((m) => [
      ...m,
      { from: "bot", reply_text: intent.response.text, render: () => <ActionsRenderer card={card} /> },
    ]);
    return;
  }
  setMessages((m) => [...m, { from: "bot", reply_text: intent.response.text }]);
}

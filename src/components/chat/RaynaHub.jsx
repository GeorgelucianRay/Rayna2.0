// src/components/chat/RaynaHub.jsx
import React, { useEffect, useRef, useState } from "react";
import styles from "../Chatbot.module.css";
import { useAuth } from "../../AuthContext.jsx";
import intentsData from "../../rayna.intents.json";
import { detectIntent } from "../../nluEngine";

// UI
import BotBubble from "./ui/BotBubble";
import SimpleList from "./ui/SimpleList";

// helpers
import { scrollToBottom } from "./helpers/miniScroll";

// handlers
import handleStatic from "./actions/handleStatic";
import handleDialog from "./actions/handleDialog";
import handleOpenCamera from "./actions/handleOpenCamera";
import handleShowAnnouncement from "./actions/handleShowAnnouncement";
import handleGpsNavigate from "./actions/handleGpsNavigate";
import handleGpsInfo from "./actions/handleGpsInfo";
import handleGpsLists from "./actions/handleGpsLists";

export default function RaynaHub() {
  const { profile } = useAuth();
  const role = profile?.role || "driver";

  const [messages, setMessages] = useState([
    { from: "bot", reply_text: intentsData.find((i) => i.id === "saludo")?.response?.text || "¡Hola!" },
  ]);
  const [text, setText] = useState("");
  const [awaiting, setAwaiting] = useState(null);
  const [saving, setSaving] = useState(false);
  const endRef = useRef(null);

  useEffect(() => scrollToBottom(endRef), [messages]);

  const send = async () => {
    const userText = text.trim();
    if (!userText) return;
    setMessages((m) => [...m, { from: "user", text: userText }]);
    setText("");

    // awaiting dialog steps (ex: anuncio)
    if (awaiting === "anuncio_text") {
      await handleDialog.stepAnuncio({
        userText,
        role,
        setMessages,
        setAwaiting,
        saving,
        setSaving,
        intentsData,
      });
      return;
    }

    const { intent, slots } = detectIntent(userText, intentsData);

    // dispatcher minimalist
    if (intent.type === "static") {
      await handleStatic({ intent, setMessages });
      return;
    }

    if (intent.type === "dialog") {
      const handled = await handleDialog.entry({ intent, role, setMessages, setAwaiting, saving, setSaving });
      if (handled) return;
    }

    if (intent.type === "action") {
      if (intent.action === "open_camera") {
        await handleOpenCamera({ intent, slots, setMessages });
        return;
      }
      if (intent.action === "show_announcement") {
        await handleShowAnnouncement({ intent, setMessages });
        return;
      }
      if (intent.id === "gps_navegar_a" || intent.action === "gps_route_preview") {
        await handleGpsNavigate({ intent, slots, setMessages });
        return;
      }
      if (intent.id === "gps_info_de") {
        await handleGpsInfo({ intent, slots, setMessages });
        return;
      }
      if (intent.action === "gps_list") {
        await handleGpsLists({ intent, setMessages });
        return;
      }
    }

    // fallback
    setMessages((m) => [
      ...m,
      { from: "bot", reply_text: intentsData.find((i) => i.id === "fallback")?.response?.text || "No te he entendido." },
    ]);
  };

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.logoDot} />
        <div className={styles.headerTitleWrap}>
          <div className={styles.brand}>Rayna 2.0</div>
          <div className={styles.tagline}>Tu transportista virtual</div>
        </div>
        <button className={styles.closeBtn} onClick={() => window.history.back()}>×</button>
      </header>

      <main className={styles.chat}>
        {messages.map((m, i) =>
          m.from === "user" ? (
            <div key={i} className={`${styles.bubble} ${styles.me}`}>{m.text}</div>
          ) : (
            <BotBubble key={i} reply_text={m.reply_text}>{m.render ? m.render() : null}</BotBubble>
          )
        )}
        <div ref={endRef} />
      </main>

      <footer className={styles.inputBar}>
        <input
          className={styles.input}
          placeholder="Escribe aquí… (ej.: Quiero llegar a TCB)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => (e.key === "Enter" ? send() : null)}
        />
        <button className={styles.sendBtn} onClick={send}>Enviar</button>
      </footer>
    </div>
  );
}
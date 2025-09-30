import React, { useEffect, useRef, useState } from "react";
import styles from "./Chatbot.module.css";

// din src/
import { useAuth } from "../../AuthContext";
import intentsData from "../../rayna.intents.json";
import { detectIntent } from "../../nluEngine";

// barrels locale
import { BotBubble } from "./ui";
import { scrollToBottom } from "./helpers";
import {
  handleStatic,
  handleDialog,
  handleOpenCamera,
  handleShowAnnouncement,
  handleGpsNavigate,
  handleGpsInfo,
  handleGpsLists,
} from "./actions";

// 🔹 importăm helper-ul nou pentru avatarul Raynei
import { getRaynaAvatarUrl } from "./data/queries";

export default function RaynaHub() {
  const { profile, loading } = useAuth();
  const role = profile?.role || "driver";

  const [messages, setMessages] = useState([]);            // <- pornim fără mesaj
  const [text, setText] = useState("");
  const [awaiting, setAwaiting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [raynaAvatar, setRaynaAvatar] = useState(null);    // <- avatarul Raynei
  const endRef = useRef(null);

  useEffect(() => scrollToBottom(endRef), [messages]);

  // === Încarcă avatarul Raynei (o singură dată) ===
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const url = await getRaynaAvatarUrl();
        if (alive) setRaynaAvatar(url);
      } catch (e) {
        // fallback tăcut
      }
    })();
    return () => { alive = false; };
  }, []);

  // === Salut personalizat (după ce avem profile pentru userul logat) ===
  useEffect(() => {
    if (messages.length > 0) return;     // nu rescrie conversația dacă a început
    if (loading) return;                  // așteptăm contextul

    const saludo = intentsData.find((i) => i.id === "saludo")?.response?.text
      || "¡Hola! ¿En qué te puedo ayudar hoy?";

    const firstName = (() => {
      const n = (profile?.nombre_completo || "").trim();
      if (n) return n.split(/\s+/)[0];
      return profile?.username || "";
    })();

    const reply = firstName
      ? `Hola, ${firstName}. ¿En qué te puedo ayudar hoy?`
      : saludo;

    setMessages([{ from: "bot", reply_text: reply }]);
  }, [loading, profile, messages.length]);

  const send = async () => {
    const userText = text.trim();
    if (!userText) return;

    setMessages((m) => [...m, { from: "user", text: userText }]);
    setText("");

    if (awaiting === "anuncio_text") {
      await handleDialog.stepAnuncio({
        userText, role, setMessages, setAwaiting, saving, setSaving, intentsData,
      });
      return;
    }

    const { intent, slots } = detectIntent(userText, intentsData);

    if (intent.type === "static") {
      await handleStatic({ intent, setMessages }); return;
    }
    if (intent.type === "dialog") {
      const handled = await handleDialog.entry({
        intent, role, setMessages, setAwaiting, saving, setSaving,
      });
      if (handled) return;
    }
    if (intent.type === "action") {
      if (intent.action === "open_camera")        return await handleOpenCamera({ intent, slots, setMessages });
      if (intent.action === "show_announcement")  return await handleShowAnnouncement({ intent, setMessages });
      if (intent.id === "gps_navegar_a" || intent.action === "gps_route_preview")
        return await handleGpsNavigate({ intent, slots, setMessages });
      if (intent.id === "gps_info_de")            return await handleGpsInfo({ intent, slots, setMessages });
      if (intent.action === "gps_list")           return await handleGpsLists({ intent, setMessages });
    }

    setMessages((m) => [
      ...m,
      { from: "bot", reply_text: intentsData.find((i) => i.id === "fallback")?.response?.text || "No te he entendido." },
    ]);
  };

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        {/* Avatarul Raynei din DB; fallback local dacă nu există/nu se încarcă */}
        <img
          src={raynaAvatar || "/avatar-fallback.png"}
          alt="Rayna"
          className={styles.avatar}
          onError={(e) => { e.currentTarget.src = "/avatar-fallback.png"; }}
        />

        <div className={styles.headerTitleWrap}>
          <div className={styles.brand}>Rayna 2.0</div>
          <div className={styles.tagline}>
            {profile?.nombre_completo || "Tu transportista virtual"}
          </div>
        </div>

        <button className={styles.closeBtn} onClick={() => window.history.back()}>×</button>
      </header>

      <main className={styles.chat}>
        {messages.map((m, i) =>
          m.from === "user" ? (
            <div key={i} className={`${styles.bubble} ${styles.me}`}>{m.text}</div>
          ) : (
            <BotBubble key={i} reply_text={m.reply_text}>
              {m.render ? m.render() : null}
            </BotBubble>
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
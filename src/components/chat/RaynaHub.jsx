// src/components/chat/RaynaHub.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./Chatbot.module.css";

import { useAuth } from "../../AuthContext";
import { detectIntent, normalize } from "../../nlu";

import useIOSNoInputZoom from "../../hooks/useIOSNoInputZoom";

import { BotBubble } from "./ui";
import { scrollToBottom } from "./helpers";
import { supabase } from "../../supabaseClient";

// intenții
import ALL_INTENTS from "../../intents";

// ——— refactor intern (doar în /chat)
import { makeQuickAprender, makeQuickReport } from "./quickActions";
import { makeGeoHelpers } from "./geo";
import { dispatchAction } from "./dispatchAction";
import { handleAwaiting } from "./awaitingHandlers";
import { routeIntent } from "./routerIntent";

// ✅ avatar din /public
const RAYNA_AVATAR = "/AvatarRayna.PNG";

export default function RaynaHub() {
  useIOSNoInputZoom();

  const { profile, loading } = useAuth();
  const role = profile?.role || "driver";

  // —— chat state
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [awaiting, setAwaiting] = useState(null);
  const [saving, setSaving] = useState(false);

  // —— context parking
  const [parkingCtx, setParkingCtx] = useState(null);

  // —— intenții
  const intentsData = useMemo(() => ALL_INTENTS || [], []);

  const endRef = useRef(null);
  useEffect(() => scrollToBottom(endRef), [messages]);

  // —— geo helpers (refactor)
  const { tryGetUserPos, askUserLocationInteractive } = makeGeoHelpers({
    styles, setMessages, setAwaiting, setParkingCtx,
  });

  // —— quick actions (refactor)
  const quickAprender = makeQuickAprender({ supabase, styles, setMessages });
  const quickReport   = makeQuickReport({ setMessages, setAwaiting });

  // —— salut personalizat
  useEffect(() => {
    if (loading) return;
    if (messages.length > 0) return;

    const saludoDefault =
      intentsData.find((i) => i.id === "saludo")?.response?.text ||
      "¡Hola! ¿En qué te puedo ayudar hoy?";

    const firstName = (() => {
      const n = (profile?.nombre_completo || "").trim();
      if (n) return n.split(/\s+/)[0];
      return profile?.username || "";
    })();

    setMessages([{ from:"bot", reply_text: firstName ? `Hola, ${firstName}. ¿En qué te puedo ayudar hoy?` : saludoDefault }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, profile]);

  // —— dispecer acțiuni (refactor)
  const runAction = (intent, slots, userText) =>
    dispatchAction({
      intent, slots, userText,
      profile, role,
      setMessages, setAwaiting, saving, setSaving,
      parkingCtx, setParkingCtx,
      askUserLocationInteractive, tryGetUserPos,
    });

  // —— trimitere mesaje
  const send = async () => {
    const userText = text.trim();
    if (!userText) return;

    setMessages((m) => [...m, { from: "user", text: userText }]);
    setText("");

    // 0) blocuri „awaiting” (refactor)
    const wasHandled = await handleAwaiting({
      awaiting, setAwaiting,
      userText, profile, role,
      setMessages, setSaving, saving,
      intentsData,
      parkingCtx, setParkingCtx,
    });
    if (wasHandled) return;

    // 1) detect intenție + rutare (refactor)
    const det = detectIntent(userText, intentsData);
    await routeIntent({
      det, intentsData,
      role, profile,
      setMessages, setAwaiting, setSaving,
      runAction,
    });
  };

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <img
          src={RAYNA_AVATAR}
          alt="Rayna"
          className={styles.avatar}
          onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
        />
        <div className={styles.headerTitleWrap}>
          <div className={styles.brand}>Rayna 2.0</div>
          <div className={styles.tagline}>Tu transportista virtual</div>
        </div>
        <button className={styles.closeBtn} onClick={() => window.history.back()}>×</button>
      </header>

      <div className={styles.subHeaderBar}>
        <div className={styles.headerQuickActions}>
          <button type="button" className={styles.quickBtn} onClick={quickAprender} aria-label="Abrir Aprender">
            Aprender
          </button>
          <button type="button" className={styles.quickBtn} onClick={quickReport} aria-label="Reclamar un error">
            Reclamar
          </button>
        </div>
      </div>

      <main className={styles.chat}>
        {messages.map((m, i) =>
          m.from === "user"
            ? <div key={i} className={`${styles.bubble} ${styles.me}`}>{m.text}</div>
            : <BotBubble key={i} reply_text={m.reply_text}>{m.render ? m.render() : null}</BotBubble>
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
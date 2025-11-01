// src/components/chat/RaynaHub.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./Chatbot.module.css";

import { useAuth } from "../../AuthContext";
import { detectIntent } from "../../nlu";
import useIOSNoInputZoom from "../../hooks/useIOSNoInputZoom";

import { BotBubble } from "./ui";
import { scrollToBottom } from "./helpers";
import { supabase } from "../../supabaseClient";

// —— multi-limbă
import { detectLang, pickTextByLang } from "./nlu/lang";

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

  // —— salut personalizat (în limba utilizatorului la primul mesaj tastat)
  // dacă userul nu scrie nimic, păstrăm salutul implicit în ES (comportament anterior)
  useEffect(() => {
    if (loading) return;
    if (messages.length > 0) return;

    const defaultSaludo = (() => {
      const sal = intentsData.find((i) => i.id === "saludo")?.response?.text;
      if (!sal) return "¡Hola! ¿En qué te puedo ayudar hoy?";
      // fără input de la utilizator, folosim ES
      return pickTextByLang(sal, "es") || "¡Hola! ¿En qué te puedo ayudar hoy!";
    })();

    const firstName = (() => {
      const n = (profile?.nombre_completo || "").trim();
      if (n) return n.split(/\s+/)[0];
      return profile?.username || "";
    })();

    const saludo = firstName
      ? `Hola, ${firstName}. ¿En qué te puedo ayudar hoy?`
      : defaultSaludo;

    setMessages([{ from: "bot", reply_text: saludo }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, profile]);

  // —— dispecer acțiuni (refactor)
  const runAction = (intent, slots, userText, lang) =>
    dispatchAction({
      intent, slots, userText,
      profile, role, lang,
      setMessages, setAwaiting, saving, setSaving,
      parkingCtx, setParkingCtx,
      askUserLocationInteractive, tryGetUserPos,
    });

  // —— trimitere mesaje
  const send = async () => {
    const userText = text.trim();
    if (!userText) return;

    // 1) detectăm limba mesajului curent
    const lang = detectLang(userText); // 'es' | 'ro' | 'ca'

    setMessages((m) => [...m, { from: "user", text: userText }]);
    setText("");

    // 2) blocuri „awaiting” — trecem limba pentru ca handler-ele să o poată folosi
    const wasHandled = await handleAwaiting({
      awaiting, setAwaiting,
      userText, profile, role, lang,
      setMessages, setSaving, saving,
      intentsData,
      parkingCtx, setParkingCtx,
    });
    if (wasHandled) return;

    // 3) detectare intent clasic
    let det = detectIntent(userText, intentsData);
    // forțăm limba detectată în acest pas (det.lang e ignorat dacă exista)
    if (!det) det = {};
    det.lang = lang;

    // 4) rutare intent (dacă există) — handler-ele primesc 'lang'
    if (det?.intent?.type) {
      await routeIntent({
        det, intentsData,
        role, profile, lang,
        setMessages, setAwaiting, setSaving,
        runAction: (intent, slots, txt) => runAction(intent, slots, txt, lang),
      });
      return;
    }

    // 5) fallback în limba utilizatorului
    const fbObj = intentsData.find((i) => i.id === "fallback")?.response?.text;
    const fb = pickTextByLang(
      fbObj || {
        es: "No te he entendido.",
        ro: "Nu te-am înțeles.",
        ca: "No t'he entès.",
      },
      lang
    );
    setMessages((m) => [...m, { from: "bot", reply_text: fb }]);
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
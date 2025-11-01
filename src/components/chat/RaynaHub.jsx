// src/components/chat/RaynaHub.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./Chatbot.module.css";

import { useAuth } from "../../AuthContext";
import { detectIntent, normalize } from "../../nlu";

import useIOSNoInputZoom from "../../hooks/useIOSNoInputZoom";

import { BotBubble } from "./ui";
import { scrollToBottom } from "./helpers";
import { supabase } from "../../supabaseClient";

import { semanticMatch } from "./semanticFallback";
import { shortenForNLU } from "./nlu/shorten";
import { getIntentIndex } from "./nlu/semantic"; // ⬅️ pentru pre-încălzire (pasul 6)

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

  // ——— marker pentru “loading NLU” (pasul 5)
  const nluInitRef = useRef(false);

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

    setMessages([
      {
        from: "bot",
        reply_text: firstName
          ? `Hola, ${firstName}. ¿En qué te puedo ayudar hoy?`
          : saludoDefault
      }
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, profile]);

  // —— pre-încălzire index semantic (pasul 6)
  useEffect(() => {
    if (!loading) {
      getIntentIndex(intentsData).catch(() => {});
    }
  }, [loading, intentsData]);

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

    // 1) detectare intent clasic (cu pre-procesare pentru mesaje lungi)
    const rawText = userText;
    const preNLU  = shortenForNLU(rawText); // dacă e scurt, rămâne neschimbat
    let det = detectIntent(preNLU, intentsData);

    // 2) fallback semantic (intenții / KB) doar dacă detectIntent nu a găsit nimic clar
    if (!det?.intent?.type) {
      // — pasul 5: afișăm un mic mesaj de “încărc NLU” doar o singură dată
      let addedNLULoading = false;
      if (!nluInitRef.current) {
        setMessages(m => [
          ...m,
          { from:"bot", reply_text:"Un segundo… entendiendo tu mensaje…", _tag:"nlu-loading" }
        ]);
        addedNLULoading = true;
      }

      const sem = await semanticMatch({
  userText: preNLU,
  intentsData,
  fetchKbRows: async () => {
    // ia doar câmpurile necesare
    const { data, error } = await supabase
      .from('kb_faq')
      .select('id,q,a,lang,tags')
      .eq('is_active', true)
      .limit(500); // ajustează după nevoie; 200-500 e ok
    return data || [];
  }
});

      // scoatem mesajul de încărcare dacă l-am arătat
      if (addedNLULoading) {
        nluInitRef.current = true;
        setMessages(m => m.filter(b => b._tag !== "nlu-loading"));
      }

      if (sem?.kind === 'intent') {
        det = { intent: sem.intent, slots: {}, lang: 'es' };
      } else if (sem?.kind === 'kb') {
        setMessages(m => [...m, { from:"bot", reply_text: sem.answer }]);
        return;
      }
    }

    // 3) dacă avem un intent (din detectIntent sau semantic), rutăm normal
    if (det?.intent?.type) {
      await routeIntent({
        det, intentsData,
        role, profile,
        setMessages, setAwaiting, setSaving,
        runAction,
      });
      return;
    }

    // 4) fallback final
    const fb =
      intentsData.find((i) => i.id === "fallback")?.response?.text ||
      "No te he entendido.";
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
          <button
            type="button"
            className={styles.quickBtn}
            onClick={quickAprender}
            aria-label="Abrir Aprender"
          >
            Aprender
          </button>
          <button
            type="button"
            className={styles.quickBtn}
            onClick={quickReport}
            aria-label="Reclamar un error"
          >
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
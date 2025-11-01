// src/components/chat/RaynaHub.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./Chatbot.module.css";

import { useAuth } from "../../AuthContext";
import { detectIntent /*, normalize*/ } from "../../nlu";

import useIOSNoInputZoom from "../../hooks/useIOSNoInputZoom";

import { BotBubble } from "./ui";
import { scrollToBottom } from "./helpers";
import { supabase } from "../../supabaseClient";

import { semanticMatch } from "./semanticFallback";
import { shortenForNLU } from "./nlu/shorten";
import { getIntentIndex } from "./nlu/semantic"; // pre-încălzire semantică
import { detectLang, STRINGS } from "./nlu/lang"; // ⬅️ NOU: detecție limbă + texte

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

  // ——— marker “loading NLU” (afișat o singură dată)
  const nluInitRef = useRef(false);

  // —— limba curentă a conversației (default ES)
  const [chatLang, setChatLang] = useState("es");

  // —— geo helpers (refactor)
  const { tryGetUserPos, askUserLocationInteractive } = makeGeoHelpers({
    styles, setMessages, setAwaiting, setParkingCtx,
  });

  // —— quick actions (refactor)
  const quickAprender = makeQuickAprender({ supabase, styles, setMessages });
  const quickReport   = makeQuickReport({ setMessages, setAwaiting });

  // —— salut personalizat (localizat)
  useEffect(() => {
    if (loading) return;
    if (messages.length > 0) return;

    const firstName = (() => {
      const n = (profile?.nombre_completo || "").trim();
      if (n) return n.split(/\s+/)[0];
      return profile?.username || "";
    })();

    setMessages([
      {
        from: "bot",
        reply_text: STRINGS[chatLang].hi(firstName)
      }
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, profile]);

  // —— pre-încălzire index semantic (TFJS)
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

    // 1) detectăm limba din mesaj și fixăm limba conversației
    const msgLang = detectLang(userText);           // 'es' | 'ca' | 'ro' (fallback 'es')
    if (msgLang !== chatLang) setChatLang(msgLang);

    setMessages((m) => [...m, { from: "user", text: userText }]);
    setText("");

    // 2) awaiting blocks (wizard-uri, reclame, parking time etc.)
    const wasHandled = await handleAwaiting({
      awaiting, setAwaiting,
      userText, profile, role,
      setMessages, setSaving, saving,
      intentsData,
      parkingCtx, setParkingCtx,
    });
    if (wasHandled) return;

    // 3) NLU clasic (+ pre-procesare pentru fraze lungi)
    const preNLU = shortenForNLU(userText); // dacă e scurt, rămâne neschimbat
    let det = detectIntent(preNLU, intentsData);

    // 4) fallback semantic (intenții + KB) doar dacă detectIntent nu a găsit nimic clar
    if (!det?.intent?.type) {
      // arătăm “încărc NLU” o singură dată
      let addedNLULoading = false;
      if (!nluInitRef.current) {
        setMessages(m => [
          ...m,
          { from:"bot", reply_text: (STRINGS[msgLang]?.not_understood ?? STRINGS.es.not_understood) + "…", _tag:"nlu-loading" }
        ]);
        addedNLULoading = true;
      }

      const sem = await semanticMatch({
        userText: preNLU,
        intentsData,
        // poți folosi msgLang în semanticMatch când activezi utterances multilingve:
        // lang: msgLang,
        fetchKbRows: async () => {
          const { data /*, error*/ } = await supabase
            .from('kb_faq')
            .select('id,q,a,lang,tags')
            .eq('is_active', true)
            .limit(500);
          return data || [];
        }
      });

      // scoatem mesajul de încărcare dacă l-am arătat
      if (addedNLULoading) {
        nluInitRef.current = true;
        setMessages(m => m.filter(b => b._tag !== "nlu-loading"));
      }

      if (sem?.kind === 'intent') {
        det = { intent: sem.intent, slots: {}, lang: msgLang };
      } else if (sem?.kind === 'kb') {
        setMessages(m => [...m, { from:"bot", reply_text: sem.answer }]);
        return;
      }
    }

    // 5) dacă avem un intent (din detectIntent sau semantic), rutăm normal
    if (det?.intent?.type) {
      await routeIntent({
        det, intentsData,
        role, profile,
        setMessages, setAwaiting, setSaving,
        runAction,
      });
      return;
    }

    // 6) fallback final — localizat
    const fb = STRINGS[msgLang]?.not_understood || STRINGS.es.not_understood;
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
            {STRINGS[chatLang].aprender}
          </button>
          <button
            type="button"
            className={styles.quickBtn}
            onClick={quickReport}
            aria-label="Reclamar un error"
          >
            {STRINGS[chatLang].reclamar}
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
          placeholder={STRINGS[chatLang].say}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => (e.key === "Enter" ? send() : null)}
        />
        <button className={styles.sendBtn} onClick={send}>Enviar</button>
      </footer>
    </div>
  );
}
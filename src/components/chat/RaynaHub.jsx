// src/components/chat/RaynaHub.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./Chatbot.module.css";

import { useAuth } from "../../AuthContext";
import { detectIntent } from "../../nlu";

import useIOSNoInputZoom from "../../hooks/useIOSNoInputZoom";
import { BotBubble } from "./ui";
import { scrollToBottom } from "./helpers";
import { supabase } from "../../supabaseClient";

import { shortenForNLU } from "./nlu/shorten";
import { semanticMatch } from "./semanticFallback";
import { detectLanguage, normalizeLang } from "./nlu/lang"; // ⬅️ PAS1
import { STR, pushBot } from "./nlu/i18n";                  // ⬅️ PAS2
import { getIntentIndex } from "./nlu/semantic";            // pre-încălzire USE

// intenții (ale tale existente)
import ALL_INTENTS from "../../intents";

// refactor intern (ale tale existente)
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

  // —— limbă curentă (se decide per-mesaj, dar ținem ultima detecție)
  const langRef = useRef("es");

  const endRef = useRef(null);
  useEffect(() => scrollToBottom(endRef), [messages]);

  // ——— marker pentru “loading NLU” (o singură dată)
  const nluInitRef = useRef(false);

  // —— geo helpers
  const { tryGetUserPos, askUserLocationInteractive } = makeGeoHelpers({
    styles, setMessages, setAwaiting, setParkingCtx,
  });

  // —— quick actions
  const quickAprender = makeQuickAprender({ supabase, styles, setMessages });
  const quickReport   = makeQuickReport({ setMessages, setAwaiting });

  // —— salut personalizat (în limba implicită detectată din navigator)
  useEffect(() => {
    if (loading) return;
    if (messages.length > 0) return;

    // limba implicită a UI
    const uiLang = normalizeLang(
      profile?.preferred_lang ||
      (navigator.language || "es")
    );
    langRef.current = uiLang;

    const firstName = (() => {
      const n = (profile?.nombre_completo || "").trim();
      if (n) return n.split(/\s+/)[0];
      return profile?.username || "";
    })();

    const greetText = STR.greeting[uiLang](firstName);
    pushBot(setMessages, greetText, uiLang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, profile]);

  // —— pre-încălzire index semantic (Universal Sentence Encoder) — optional dar util
  useEffect(() => {
    if (!loading) {
      getIntentIndex(intentsData).catch(() => {});
    }
  }, [loading, intentsData]);

  // —— dispecer acțiuni (rămâne ca la tine)
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

    // 0) detectăm limba acestui mesaj și o memorăm
    const detected = normalizeLang(detectLanguage(userText));
    langRef.current = detected || langRef.current || "es";

    setMessages((m) => [...m, { from: "user", text: userText }]);
    setText("");

    // 1) blocuri „awaiting”
    const wasHandled = await handleAwaiting({
      awaiting, setAwaiting,
      userText, profile, role,
      setMessages, setSaving, saving,
      intentsData,
      parkingCtx, setParkingCtx,
    });
    if (wasHandled) return;

    // 2) detectare intent clasic (cu scurtare pentru NLU)
    const preNLU = shortenForNLU(userText);
    let det = detectIntent(preNLU, intentsData);

    // 3) fallback semantic (intenții / KB) numai dacă n-am găsit nimic
    if (!det?.intent?.type) {
      let addedNLULoading = false;
      if (!nluInitRef.current) {
        pushBot(setMessages, STR.thinking, langRef.current, { _tag: "nlu-loading" });
        addedNLULoading = true;
      }

      const sem = await semanticMatch({
        userText: preNLU,
        intentsData,
        fetchKbRows: async () => {
          // dacă ai creat tabela kb_faq:
          const { data } = await supabase
            .from("kb_faq")
            .select("id,q,a,lang,tags")
            .eq("is_active", true)
            .limit(500);
          return data || [];
        }
      });

      if (addedNLULoading) {
        nluInitRef.current = true;
        setMessages((m) => m.filter((b) => b._tag !== "nlu-loading"));
      }

      if (sem?.kind === "intent") {
        det = { intent: sem.intent, slots: {}, lang: langRef.current };
      } else if (sem?.kind === "kb") {
        // răspuns direct din KB, în limba curentă dacă există
        const answer = typeof sem.answer === "object"
          ? (sem.answer[langRef.current] || sem.answer.es || sem.answer.ro || sem.answer.ca)
          : sem.answer;
        pushBot(setMessages, answer, langRef.current);
        return;
      }
    }

    // 4) dacă avem un intent → rutăm normal
    if (det?.intent?.type) {
      await routeIntent({
        det, intentsData,
        role, profile,
        setMessages, setAwaiting, setSaving,
        runAction,
        // poți trece lang dacă handler-ele tale vor să știe:
        lang: langRef.current,
      });
      return;
    }

    // 5) fallback final în limba curentă
    pushBot(setMessages, STR.dontUnderstand, langRef.current);
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
            : <BotBubble key={i} reply_text={m.reply_text}>
                {m.render ? m.render() : null}
              </BotBubble>
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
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
import { detectLanguage, normalizeLang } from "./nlu/lang";
import { STR, pushBot } from "./nlu/i18n";
import { getIntentIndex } from "./nlu/semantic";

import ALL_INTENTS from "../../intents";
import { makeQuickAprender, makeQuickReport } from "./quickActions";
import { makeGeoHelpers } from "./geo";
import { dispatchAction } from "./dispatchAction";
import { handleAwaiting } from "./awaitingHandlers";
import { routeIntent } from "./routerIntent";
import handleDepotChat, { extractContainerCode } from "./actions/handleDepotChat.jsx";

// ✅ avatar din /public
const RAYNA_AVATAR = "/AvatarRayna.PNG";

/* ─────────────────────────────
   Error bus minim (FĂRĂ UI)
   ───────────────────────────── */
function ensureErrorBus() {
  if (!window.__raynaReportError) {
    window.__raynaReportError = (err, meta = {}) => {
      const payload = {
        message: err?.message || String(err),
        stack: err?.stack || null,
        meta,
        ts: Date.now(),
      };
      // eslint-disable-next-line no-console
      console.error("🛑 Rayna error:", payload);
    };
  }
}

// ——— fallback i18n
const FBGREET = (lang, name) => {
  const N = name ? `${name}. ` : "";
  if (lang === "ro") return `Salut, ${N}Cu ce te pot ajuta azi?`;
  if (lang === "ca") return `Hola, ${N}En què et puc ajudar avui?`;
  return `¡Hola, ${N}¿En qué te puedo ayudar hoy?`;
};
const FBTHINK = (lang) =>
  (lang === "ro"
    ? "O secundă… înțeleg ce ai scris…"
    : lang === "ca"
    ? "Un segon… estic entenent el teu missatge…"
    : "Un segundo… entendiendo tu mensaje…");
const FBDONT = (lang) =>
  (lang === "ro"
    ? "Nu te-am înțeles."
    : lang === "ca"
    ? "No t'he entès."
    : "No te he entendido.");

export default function RaynaHub() {
  useIOSNoInputZoom();
  ensureErrorBus();

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

  // —— limbă curentă
  const langRef = useRef("es");

  const endRef = useRef(null);
  useEffect(() => scrollToBottom(endRef), [messages]);

  // ——— marker pentru “loading NLU”
  const nluInitRef = useRef(false);

  // —— geo helpers
  const { tryGetUserPos, askUserLocationInteractive } = makeGeoHelpers({
    styles, setMessages, setAwaiting, setParkingCtx,
  });

  // —— quick actions
  const quickAprender = makeQuickAprender({ supabase, styles, setMessages });
  const quickReport   = makeQuickReport({ setMessages, setAwaiting });

  // —— hook global pentru erori ne-prinse
  useEffect(() => {
    const onUR = (ev) => {
      try { window.__raynaReportError(ev.reason || ev, { phase: "unhandledrejection" }); } catch {}
    };
    const onOE = (msg, src, line, col, err) => {
      try { window.__raynaReportError(err || msg, { phase: "window.onerror", src, line, col }); } catch {}
    };
    window.addEventListener("unhandledrejection", onUR);
    const prev = window.onerror;
    window.onerror = onOE;
    return () => {
      window.removeEventListener("unhandledrejection", onUR);
      window.onerror = prev || null;
    };
  }, []);

  // —— salut personalizat
  useEffect(() => {
    if (loading) return;
    if (messages.length > 0) return;

    const uiLang = normalizeLang(
      profile?.preferred_lang || (navigator.language || "es")
    );
    langRef.current = uiLang;

    const firstName = (() => {
      const n = (profile?.nombre_completo || "").trim();
      if (n) return n.split(/\s+/)[0];
      return profile?.username || "";
    })();

    const greetText =
      (STR?.greeting &&
        (typeof STR.greeting[uiLang] === "function"
          ? STR.greeting[uiLang](firstName)
          : STR.greeting[uiLang])) ||
      FBGREET(uiLang, firstName);

    pushBot(setMessages, greetText, { lang: uiLang });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, profile]);

  // —— pre-încălzire index semantic
  useEffect(() => {
    if (!loading) {
      getIntentIndex(intentsData).catch(() => {});
    }
  }, [loading, intentsData]);

  // —— dispecer acțiuni
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
    const userTextLocal = text.trim();
    if (!userTextLocal) return;

    try {
      // 0) detectăm limba
      const detected = normalizeLang(detectLanguage(userTextLocal));
      langRef.current = detected || langRef.current || "es";

      setMessages((m) => [...m, { from: "user", text: userTextLocal }]);
      setText("");

      // ——— Short-circuit Depot (cod container)
      const code = extractContainerCode(userTextLocal);
      if (code) {
        await handleDepotChat({ userText: userTextLocal, profile, setMessages });
        return;
      }

      // 1) awaiting blocks
      const wasHandled = await handleAwaiting({
        awaiting, setAwaiting,
        userText: userTextLocal, profile, role,
        setMessages, setSaving, saving,
        intentsData,
        parkingCtx, setParkingCtx,
      });
      if (wasHandled) return;

      // 2) intent clasic
      const preNLU = shortenForNLU(userTextLocal);
      let det = detectIntent(preNLU, intentsData);

      // 3) fallback semantic
      if (!det?.intent?.type) {
        let addedNLULoading = false;
        if (!nluInitRef.current) {
          const thinking =
            (STR?.thinking && STR.thinking[langRef.current]) ||
            FBTHINK(langRef.current);
          pushBot(setMessages, thinking, { _tag: "nlu-loading", lang: langRef.current });
          addedNLULoading = true;
        }

        const sem = await semanticMatch({
          userText: preNLU,
          intentsData,
          fetchKbRows: async () => {
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
          const answer =
            typeof sem.answer === "object"
              ? (sem.answer[langRef.current] || sem.answer.es || sem.answer.ro || sem.answer.ca)
              : sem.answer;
          pushBot(setMessages, answer, { lang: langRef.current });
          return;
        }
      }

      // 4) rutare intent
      if (det?.intent?.type) {
        await routeIntent({
          det, intentsData,
          role, profile,
          setMessages, setAwaiting, setSaving,
          runAction,
          lang: langRef.current,
        });
        return;
      }

      // 5) fallback final
      const dont =
        (STR?.dontUnderstand && STR.dontUnderstand[langRef.current]) ||
        FBDONT(langRef.current);
      pushBot(setMessages, dont, { lang: langRef.current });
    } catch (err) {
      try { window.__raynaReportError(err, { phase: "send", userText: userTextLocal }); } catch {}
      setMessages((m) => [
        ...m,
        { from: "bot", reply_text: "Ups, algo ha fallado procesando tu mensaje. Intenta de nuevo." },
      ]);
    }
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
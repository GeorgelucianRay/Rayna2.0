// src/components/chat/RaynaHub.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./Chatbot.module.css";

import { useAuth } from "../../AuthContext";
import { detectIntent } from "../../nlu";

import useIOSNoInputZoom from "../../hooks/useIOSNoInputZoom";

import { BotBubble } from "./ui";
import { scrollToBottom } from "./helpers";
import { supabase } from "../../supabaseClient";

import { semanticMatch } from "./semanticFallback";
import { shortenForNLU } from "./nlu/shorten";
import { getIntentIndex } from "./nlu/semantic";

import ALL_INTENTS from "../../intents";

import { makeQuickAprender, makeQuickReport } from "./quickActions";
import { makeGeoHelpers } from "./geo";
import { dispatchAction } from "./dispatchAction";
import { handleAwaiting } from "./awaitingHandlers";
import { routeIntent } from "./routerIntent";

// ⬇️ NOU: detectare limbă cu 'franc'
import { franc } from "franc";

// avatar
const RAYNA_AVATAR = "/AvatarRayna.PNG";

// Lang map pentru franc -> 'es' | 'ro' | 'ca'
function detectLang(text) {
  try {
    const iso3 = franc(text || "", { minLength: 3 }); // 'spa','ron','cat',...
    if (iso3 === "spa") return "es";
    if (iso3 === "ron") return "ro";
    if (iso3 === "cat") return "ca";
  } catch {}
  // heuristici simple de rezervă
  const s = (text || "").toLowerCase();
  if (/[ăâîșţț]/i.test(s)) return "ro";
  if (/\bél\b|\bla\b|\bpara\b|\bquiero\b/.test(s)) return "es";
  if (/\bel\b|\bla\b|\bper\b|\bvull\b/.test(s)) return "ca";
  return "es";
}

export default function RaynaHub() {
  useIOSNoInputZoom();

  const { profile, loading } = useAuth();
  const role = profile?.role || "driver";

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [awaiting, setAwaiting] = useState(null);
  const [saving, setSaving] = useState(false);

  const [parkingCtx, setParkingCtx] = useState(null);
  const intentsData = useMemo(() => ALL_INTENTS || [], []);

  const endRef = useRef(null);
  useEffect(() => scrollToBottom(endRef), [messages]);

  // ⬇️ NOU: limba curentă a conversației (default spaniolă)
  const [chatLang, setChatLang] = useState("es");

  const nluInitRef = useRef(false);

  const { tryGetUserPos, askUserLocationInteractive } = makeGeoHelpers({
    styles, setMessages, setAwaiting, setParkingCtx,
  });

  const quickAprender = makeQuickAprender({ supabase, styles, setMessages });
  const quickReport   = makeQuickReport({ setMessages, setAwaiting });

  useEffect(() => {
    if (loading) return;
    if (messages.length > 0) return;

    const saludoDefault =
      intentsData.find((i) => i.id === "saludo")?.response?.text?.es ||
      "¡Hola! ¿En qué te puedo ayudar hoy?";

    const firstName = (() => {
      const n = (profile?.nombre_completo || "").trim();
      if (n) return n.split(/\s+/)[0];
      return profile?.username || "";
    })();

    setMessages([{
      from: "bot",
      reply_text: firstName ? `Hola, ${firstName}. ¿En qué te puedo ayudar hoy?` : saludoDefault
    }]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, profile]);

  useEffect(() => {
    if (!loading) {
      getIntentIndex(intentsData).catch(() => {});
    }
  }, [loading, intentsData]);

  const runAction = (intent, slots, userText) =>
    dispatchAction({
      intent, slots, userText,
      profile, role,
      setMessages, setAwaiting, saving, setSaving,
      parkingCtx, setParkingCtx,
      askUserLocationInteractive, tryGetUserPos,
      lang: chatLang,                      // ⬅️ trimitem limba
    });

  const send = async () => {
    const userText = text.trim();
    if (!userText) return;

    // ⬇️ detectăm și fixăm limba pentru acest mesaj
    const langDetected = detectLang(userText);
    setChatLang(langDetected);

    setMessages((m) => [...m, { from: "user", text: userText }]);
    setText("");

    const wasHandled = await handleAwaiting({
      awaiting, setAwaiting,
      userText, profile, role,
      setMessages, setSaving, saving,
      intentsData,
      parkingCtx, setParkingCtx,
      lang: langDetected,               // ⬅️ trecem limba
    });
    if (wasHandled) return;

    const preNLU  = shortenForNLU(userText);
    let det = detectIntent(preNLU, intentsData);

    if (!det?.intent?.type) {
      let addedNLULoading = false;
      if (!nluInitRef.current) {
        setMessages(m => [
          ...m,
          { from:"bot", reply_text:(langDetected==='ro'
              ? "Un moment… înțeleg ce ai scris…"
              : langDetected==='ca'
                ? "Un segon… entenc el teu missatge…"
                : "Un segundo… entendiendo tu mensaje…"),
            _tag:"nlu-loading" }
        ]);
        addedNLULoading = true;
      }

      const sem = await semanticMatch({
        userText: preNLU,
        intentsData,
        fetchKbRows: async () => {
          const { data } = await supabase
            .from('kb_faq')
            .select('id,q,a,lang,tags')
            .eq('is_active', true)
            .limit(500);
          return data || [];
        }
      });

      if (addedNLULoading) {
        nluInitRef.current = true;
        setMessages(m => m.filter(b => b._tag !== "nlu-loading"));
      }

      if (sem?.kind === 'intent') {
        det = { intent: sem.intent, slots: {}, lang: langDetected };
      } else if (sem?.kind === 'kb') {
        setMessages(m => [...m, { from:"bot", reply_text: sem.answer }]);
        return;
      }
    }

    if (det?.intent?.type) {
      await routeIntent({
        det, intentsData,
        role, profile,
        setMessages, setAwaiting, setSaving,
        runAction,
        lang: langDetected,            // ⬅️ IMPORTANT
      });
      return;
    }

    const fb =
      (intentsData.find(i => i.id === "fallback")?.response?.text?.[langDetected]) ||
      (langDetected==='ro' ? "Nu te-am înțeles." : langDetected==='ca' ? "No t'he entès." : "No te he entendido.");
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
// src/components/chat/RaynaHub.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import styles from "./Chatbot.module.css";
import { useAuth } from "../../AuthContext";
import { detectIntent } from "../../nlu";
import useIOSNoInputZoom from "../../hooks/useIOSNoInputZoom";
import { scrollToBottom } from "./helpers";
import { supabase } from "../../supabaseClient";
import { shortenForNLU } from "./nlu/shorten";
import { semanticMatch } from "./semanticFallback";
import { detectLanguage, normalizeLang } from "./nlu/lang";
import { createRaynaAiBridge } from "./ai/raynaAiBridge";
import useRaynaChat from "./useRaynaChat";
import { groqExtract, groqAnswer } from "./refactored/services/groqOrchestrator";
import { pickContainerForLoad } from "./refactored/services/pickContainerForLoad";
import { STR, pushBot } from "./nlu/i18n";
import { getIntentIndex } from "./nlu/semantic";
import ALL_INTENTS from "../../intents";
import { makeQuickAprender, makeQuickReport } from "./quickActions";
import { makeGeoHelpers } from "./geo";
import { dispatchAction } from "./dispatchAction";
import { handleAwaiting } from "./awaitingHandlers";
import { routeIntent } from "./routerIntent";
import handleDepotChat from "./actions/handleDepotChat.jsx";
import ErrorTray from "./ui/ErrorTray.jsx";
import ChatLayout from "./refactored/ChatLayout.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import {
  pickScene,
  SCENE_BY_INTENT,
  preloadImage,
  parseRequestedLimit,
} from "./raynahub/helpers";

const RAYNA_AVATAR = "/AvatarRayna.PNG";

/* ───────── Error bus: __raynaBus, __raynaLog, __raynaReportError ───────── */
function ensureErrorBus() {
  if (!window.__raynaBus) {
    window.__raynaBus = {
      logs: [],
      push(level, title, data) {
        this.logs.push({ level, title, data, ts: Date.now() });
        try {
          window.dispatchEvent(new CustomEvent("rayna-log"));
        } catch { }
      },
      clear() {
        this.logs = [];
      },
    };
  }
  if (!window.__raynaLog) {
    window.__raynaLog = (title, data, level = "info") => {
      window.__raynaBus.push(level, title, data);
      if (level === "error") console.error("🧰", title, data);
      else console.log("🧰", title, data);
    };
  }
  if (!window.__raynaReportError) {
    window.__raynaReportError = (err, meta = {}) => {
      const payload = {
        message: err?.message || String(err),
        stack: err?.stack || null,
        ...meta,
      };
      window.__raynaBus.push("error", meta?.title || "Unhandled error", payload);
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
  lang === "ro"
    ? "O secundă… înțeleg ce ai scris…"
    : lang === "ca"
      ? "Un segon… estic entenent el teu missatge…"
      : "Un segundo… entendiendo tu mensaje…";
const FBDONT = (lang) =>
  lang === "ro" ? "Nu te-am înțeles." : lang === "ca" ? "No t'he entès." : "No te he entendido.";



/* ---------- Icons ---------- */
const IconClose = () => (
  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
    close
  </span>
);
const IconStories = () => (
  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
    auto_stories
  </span>
);
const IconReport = () => (
  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
    report_problem
  </span>
);
const IconAttach = () => (
  <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
    attach_file
  </span>
);
const IconSend = () => (
  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
    send
  </span>
);





/* ---------- Typing effect (ONLY for last bot message) ---------- */
function TypingText({ text = "", speed = 14, enabled = true, onDone }) {
  const [out, setOut] = useState(enabled ? "" : String(text || ""));
  const timerRef = useRef(null);

  useEffect(() => {
    const full = String(text || "");
    if (!enabled) {
      setOut(full);
      return;
    }
    if (!full) {
      setOut("");
      return;
    }

    setOut("");
    let i = 0;

    const tick = () => {
      i += 1;
      setOut(full.slice(0, i));

      if (i >= full.length) {
        timerRef.current = null;
        onDone?.();
        return;
      }

      const ch = full[i - 1];
      const pause = ch === "." || ch === "!" || ch === "?" ? 140 : ch === "," || ch === ";" ? 80 : 0;

      timerRef.current = window.setTimeout(tick, speed + pause);
    };

    timerRef.current = window.setTimeout(tick, speed);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [text, speed, enabled, onDone]);

  return <>{out}</>;
}




export default function RaynaHub() {
  useIOSNoInputZoom();
  ensureErrorBus();

  const { profile, loading } = useAuth();
  const role = String(profile?.role || "driver").toLowerCase();
  const isAdmin = role === "admin";

  const navigate = useNavigate();
  const location = useLocation();

  const goHome = useCallback(() => {
    const r = String(profile?.role || "").toLowerCase();
    const target = r === "admin" || r === "dispecer" ? "/dispecer-homepage" : "/sofer-homepage";

    const isHash = !!(location?.hash && location.hash.startsWith("#/"));
    if (isHash) {
      window.location.hash = `#${target}`;
      return;
    }
    navigate(target, { replace: true });
  }, [profile?.role, navigate, location]);

  const [text, setText] = useState("");
  const [awaiting, setAwaiting] = useState(null);
  const [saving, setSaving] = useState(false);

  const [parkingCtx, setParkingCtx] = useState(null);
  const intentsData = useMemo(() => ALL_INTENTS || [], []);
  const langRef = useRef("es");
  const aiRef = useRef(null);
  if (!aiRef.current) {
    aiRef.current = createRaynaAiBridge({
      intentsData,
      langRef,
      logger: (title, data, level) => window.__raynaLog?.(title, data, level),
    });
  }
  const ai = aiRef.current;

  const endRef = useRef(null);

  const nluInitRef = useRef(false);

  // crossfade layers (A/B)
  const [bgA, setBgA] = useState(SCENE_BY_INTENT.default);
  const [bgB, setBgB] = useState(SCENE_BY_INTENT.default);
  const [showA, setShowA] = useState(true);
  // crossfade layers (A/B) state above

  const setSceneWithFade = useCallback(
    async (nextUrl) => {
      if (!nextUrl) return;
      const current = showA ? bgA : bgB;
      if (current === nextUrl) return;

      await preloadImage(nextUrl);

      if (showA) setBgB(nextUrl);
      else setBgA(nextUrl);

      requestAnimationFrame(() => setShowA((s) => !s));
    },
    [showA, bgA, bgB]
  );

  // requestedLimitRef used to trim long container lists (kept in RaynaHub)
  const requestedLimitRef = useRef(null);

  // runActionRef will be set after we define runAction (so the hook can call it)
  const runActionRef = useRef(null);

  // initialize chat hook (manages messages, sendMessage, typing refs)
  const { messages, setMessages, sendMessage, typedDoneRef, lastBotIndex: lastBotIndexFromHook } = useRaynaChat({
    profile,
    role,
    intentsData,
    ai,
    supabase,
    setSceneWithFade,
    handleDepotChat,
    handleAwaiting,
    routeIntent,
    runActionRef,
    setAwaiting,
    setSaving,
    saving,
    parkingCtx,
    setParkingCtx,
    requestedLimitRef,
    nluInitRef,
    langRef,
    awaiting,
  });

  useEffect(() => scrollToBottom(endRef), [messages]);

  const { tryGetUserPos, askUserLocationInteractive } = makeGeoHelpers({
    styles,
    setMessages,
    setAwaiting,
    setParkingCtx,
  });

  const quickAprender = makeQuickAprender({ supabase, styles, setMessages });
  const quickReport = makeQuickReport({ setMessages, setAwaiting });

  // Global error hooks → către bus
  useEffect(() => {
    const onUR = (ev) => {
      try {
        window.__raynaReportError(ev.reason || ev, { phase: "unhandledrejection" });
      } catch { }
    };
    const onOE = (msg, src, line, col, err) => {
      try {
        window.__raynaReportError(err || msg, { phase: "window.onerror", src, line, col });
      } catch { }
    };
    window.addEventListener("unhandledrejection", onUR);
    const prev = window.onerror;
    window.onerror = onOE;
    return () => {
      window.removeEventListener("unhandledrejection", onUR);
      window.onerror = prev || null;
    };
  }, []);

  // Greeting
  useEffect(() => {
    if (loading || messages.length > 0) return;

    const uiLang = normalizeLang(profile?.preferred_lang || navigator.language || "es");
    langRef.current = uiLang;

    const firstName = (() => {
      const n = (profile?.nombre_completo || "").trim();
      if (n) return n.split(/\s+/)[0];
      return profile?.username || "";
    })();

    const greetText =
      (STR?.greeting &&
        (typeof STR.greeting[uiLang] === "function" ? STR.greeting[uiLang](firstName) : STR.greeting[uiLang])) ||
      FBGREET(uiLang, firstName);

    pushBot(setMessages, greetText, { lang: uiLang });
    setSceneWithFade(SCENE_BY_INTENT.office);
  }, [loading, profile, setSceneWithFade, messages.length, setMessages]); // eslint-disable-line

  // Warm-up semantic
  useEffect(() => {
    if (!loading) getIntentIndex(intentsData).catch(() => { });
  }, [loading, intentsData]);

  const runAction = async (intent, slots, userText) => {
    const result = await dispatchAction({
      intent,
      slots,
      userText,
      profile,
      role,
      setMessages,
      setAwaiting,
      saving,
      setSaving,
      parkingCtx,
      setParkingCtx,
      askUserLocationInteractive,
      tryGetUserPos,
    });

    // ✅ dacă acțiunea returnează {context}, bridge-ul îl reține
    ai.captureContext(result);

    return result;
  };
  // expose runAction to the hook via ref
  runActionRef.current = runAction;


  // window.__raynaOpenMap(pos)
  useEffect(() => {
    window.__raynaOpenMap = (pos) => {
      const query = `?focus=${encodeURIComponent(pos || "")}`;
      const isHash = !!(location?.hash && location.hash.startsWith("#/"));
      if (isHash) {
        window.location.hash = `#/mapa${query}`;
        return;
      }
      navigate(`/mapa${query}`);
    };
    return () => {
      delete window.__raynaOpenMap;
    };
  }, [navigate, location]);

  // last bot index (for typing only last bot message)
  const lastBotIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.from !== "user") return i;
    }
    return -1;
  }, [messages]);

  const renderBot = (m, i) => {
    const isAi = m?._tag === "ai";
    const label = isAi ? "Rayna AI" : "Rayna System";

    const isLastBot = i === lastBotIndex;
    const typingAllowed = isLastBot && !typedDoneRef.current.has(i);

    const botText = m.reply_text ?? m.text ?? "";

    return (
      <div key={i} className={styles.rowLeft}>
        <div className={styles.avatarSm}>
          <img src={RAYNA_AVATAR} alt="Rayna" onError={(e) => (e.currentTarget.style.display = "none")} />
        </div>
        <div className={styles.msgColLeft}>
          <div className={styles.msgLabel}>{label}</div>
          <div className={styles.bubbleAi}>
            <TypingText text={botText} speed={14} enabled={typingAllowed} onDone={() => typedDoneRef.current.add(i)} />
            {m.render ? <div className={styles.renderWrap}>{m.render()}</div> : null}
            {m.actions ? (
              <div className={styles.actionsRow}>
                {m.actions.map((a, idx) => (
                  <button
                    key={idx}
                    className={styles.actionBtn}
                    type="button"
                    onClick={() => {
                      try {
                        if (a.type === "view_position") {
                          const pos = a.payload?.position;
                          if (pos) window.__raynaOpenMap?.(pos);
                        } else if (a.type === "programar") {
                          setAwaiting({ type: "programar", data: a.payload });
                          pushBot(setMessages, "Iniciando programación...", { lang: langRef.current });
                        }
                      } catch (e) {
                        window.__raynaLog?.("Action/Err", { action: a, err: e?.message || String(e) }, "error");
                      }
                    }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  const renderUser = (m, i) => {
    const label = profile?.nombre_completo ? String(profile.nombre_completo).split(/\s+/)[0] : "Operador";
    return (
      <div key={i} className={styles.rowRight}>
        <div className={styles.msgColRight}>
          <div className={styles.msgLabel}>{label}</div>
          <div className={styles.bubbleMe}>{m.text}</div>
        </div>
      </div>
    );
  };

  return (
    <ChatLayout
      styles={styles}
      bgA={bgA}
      bgB={bgB}
      showA={showA}
      messages={messages}
      renderBot={renderBot}
      renderUser={renderUser}
      endRef={endRef}
      text={text}
      setText={setText}
      send={() => {
        const userTextLocal = text.trim();
        if (!userTextLocal) return;
        setText("");
        sendMessage(userTextLocal);
      }}
      goHome={goHome}
      quickAprender={quickAprender}
      quickReport={quickReport}
      isAdmin={isAdmin}
    />
  );
}
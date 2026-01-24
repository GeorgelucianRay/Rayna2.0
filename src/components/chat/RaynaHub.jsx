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
import { STR, pushBot } from "./nlu/i18n";
import { getIntentIndex } from "./nlu/semantic";
import ALL_INTENTS from "../../intents";
import { makeQuickAprender, makeQuickReport } from "./quickActions";
import { makeGeoHelpers } from "./geo";
import { dispatchAction } from "./dispatchAction";
import { handleAwaiting } from "./awaitingHandlers";
import { routeIntent } from "./routerIntent";
import handleDepotChat, { extractContainerCode } from "./actions/handleDepotChat.jsx";
import ErrorTray from "./ui/ErrorTray.jsx";
import { useNavigate, useLocation } from "react-router-dom";

const RAYNA_AVATAR = "/AvatarRayna.PNG";

/* ───────── Error bus: __raynaBus, __raynaLog, __raynaReportError ───────── */
function ensureErrorBus() {
  if (!window.__raynaBus) {
    window.__raynaBus = {
      logs: [],
      push(level, title, data) {
        this.logs.push({ level, title, data, ts: Date.now() });
        try { window.dispatchEvent(new CustomEvent("rayna-log")); } catch {}
      },
      clear() { this.logs = []; },
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
      const payload = { message: err?.message || String(err), stack: err?.stack || null, ...meta };
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

/* ---------- Scene images in /public/rayna chat/... ---------- */
const SCENE_BY_INTENT = {
  default: "/rayna%20chat/rayna%20office.png",
  archivo: "/rayna%20chat/rayna%20archivo.png",
  depot: "/rayna%20chat/rayna%20depot.png",
  mecanic: "/rayna%20chat/rayna%20mecanic.png",
  office: "/rayna%20chat/rayna%20office.png",
  soferi: "/rayna%20chat/rayna%20soferi.png",
};

function pickScene({ intentType, userText }) {
  const t = String(intentType || "").toLowerCase();
  const u = String(userText || "").toLowerCase();

  if (u.includes("depot") || u.includes("conten") || u.includes("container") || u.includes("contenedor") ||
      u.includes("slot") || u.includes("patio") || u.includes("terminal") || u.includes("tcb"))
    return SCENE_BY_INTENT.depot;

  if (u.includes("archivo") || u.includes("document") || u.includes("acta") || u.includes("contrato") ||
      u.includes("factura") || u.includes("pdf") || u.includes("nomina") || u.includes("nómina") || u.includes("albaran"))
    return SCENE_BY_INTENT.archivo;

  if (u.includes("mecanic") || u.includes("mecánico") || u.includes("taller") || u.includes("repar") ||
      u.includes("averia") || u.includes("avería") || u.includes("service") || u.includes("itv"))
    return SCENE_BY_INTENT.mecanic;

  if (u.includes("sofer") || u.includes("șofer") || u.includes("chofer") || u.includes("conduc") ||
      u.includes("tahograf") || u.includes("tacografo") || u.includes("descanso") || u.includes("conducción"))
    return SCENE_BY_INTENT.soferi;

  if (u.includes("dispecer") || u.includes("dispatch") || u.includes("oficina") || u.includes("ruta") ||
      u.includes("plan") || u.includes("program") || u.includes("cliente") || u.includes("email"))
    return SCENE_BY_INTENT.office;

  if (t.includes("depot")) return SCENE_BY_INTENT.depot;
  if (t.includes("mec") || t.includes("taller")) return SCENE_BY_INTENT.mecanic;
  if (t.includes("doc") || t.includes("pdf") || t.includes("nomina")) return SCENE_BY_INTENT.archivo;
  if (t.includes("driver") || t.includes("sofer") || t.includes("chofer")) return SCENE_BY_INTENT.soferi;
  if (t.includes("admin") || t.includes("office") || t.includes("dispatch")) return SCENE_BY_INTENT.office;

  return SCENE_BY_INTENT.default;
}

/* ---------- Icons ---------- */
const IconClose = () => <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>;
const IconStories = () => <span className="material-symbols-outlined" style={{ fontSize: 18 }}>auto_stories</span>;
const IconReport = () => <span className="material-symbols-outlined" style={{ fontSize: 18 }}>report_problem</span>;
const IconAttach = () => <span className="material-symbols-outlined" style={{ fontSize: 22 }}>attach_file</span>;
const IconSend = () => <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>;

/* ---------- helpers: preload image (important for clean fade) ---------- */
function preloadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

/* =========================
   AI FALLBACK (Groq via /api/rayna-chat)
   - keep tokens low
   ========================= */
const shortenForAI = (s, max = 220) => {
  const t = String(s || "").trim().replace(/\s+/g, " ");
  return t.length > max ? t.slice(0, max) : t;
};

async function callAiFallback({ text, lang }) {
  const r = await fetch("/api/rayna-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, lang }),
  });

  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err?.message || "AI request failed");
  }
  return r.json();
}

async function logNluAiFallback({
  supabase,
  profile,
  role,
  lang,
  userText,
  nluText,
  nluIntent,
  nluMeta,
  aiModel,
  aiAnswer,
  aiUsage,
  latencyMs,
  route,
}) {
  try {
    const userId = profile?.id || profile?.user_id || null;

    await supabase.from("nlu_ai_fallback_logs").insert([{
      user_id: userId,
      role,
      lang,

      user_text: userText,

      nlu_text: nluText || null,
      nlu_intent: nluIntent || null,
      nlu_meta: nluMeta || null,

      ai_model: aiModel || null,
      ai_answer: aiAnswer || null,
      ai_usage: aiUsage || null,
      latency_ms: latencyMs ?? null,

      route: route || null,
    }]);
  } catch {
    // nu blocăm chat-ul dacă logging-ul pică
  }
}

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
      const pause =
        ch === "." || ch === "!" || ch === "?" ? 140 :
        ch === "," || ch === ";" ? 80 : 0;

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

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [awaiting, setAwaiting] = useState(null);
  const [saving, setSaving] = useState(false);

  const [parkingCtx, setParkingCtx] = useState(null);
  const intentsData = useMemo(() => ALL_INTENTS || [], []);
  const langRef = useRef("es");

  const endRef = useRef(null);
  useEffect(() => scrollToBottom(endRef), [messages]);

  const nluInitRef = useRef(false);

  // scene logic
  const [sceneImg, setSceneImg] = useState(SCENE_BY_INTENT.default);

  // crossfade layers (A/B)
  const [bgA, setBgA] = useState(SCENE_BY_INTENT.default);
  const [bgB, setBgB] = useState(SCENE_BY_INTENT.default);
  const [showA, setShowA] = useState(true);

  // typing control: once a bot message finished typing, keep it static
  const typedDoneRef = useRef(new Set()); // stores message indices that are done

  const setSceneWithFade = useCallback(async (nextUrl) => {
    if (!nextUrl) return;

    const current = showA ? bgA : bgB;
    if (current === nextUrl) {
      setSceneImg(nextUrl);
      return;
    }

    await preloadImage(nextUrl);

    if (showA) setBgB(nextUrl);
    else setBgA(nextUrl);

    requestAnimationFrame(() => setShowA((s) => !s));

    setSceneImg(nextUrl);
  }, [showA, bgA, bgB]);

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
    const onUR = (ev) => { try { window.__raynaReportError(ev.reason || ev, { phase: "unhandledrejection" }); } catch {} };
    const onOE = (msg, src, line, col, err) => { try { window.__raynaReportError(err || msg, { phase: "window.onerror", src, line, col }); } catch {} };
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
      (STR?.greeting && (typeof STR.greeting[uiLang] === "function" ? STR.greeting[uiLang](firstName) : STR.greeting[uiLang])) ||
      FBGREET(uiLang, firstName);

    pushBot(setMessages, greetText, { lang: uiLang });

    setSceneWithFade(SCENE_BY_INTENT.office);
  }, [loading, profile, setSceneWithFade]); // eslint-disable-line

  // Warm-up semantic
  useEffect(() => {
    if (!loading) getIntentIndex(intentsData).catch(() => {});
  }, [loading, intentsData]);

  const runAction = (intent, slots, userText) =>
    dispatchAction({
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

  const send = async () => {
    const userTextLocal = text.trim();
    if (!userTextLocal) return;

    window.__raynaLastUserText = userTextLocal;

    try {
      const detected = normalizeLang(detectLanguage(userTextLocal));
      langRef.current = detected || langRef.current || "es";

      setMessages((m) => [...m, { from: "user", text: userTextLocal }]);
      setText("");

      // change scene immediately based on text
      setSceneWithFade(pickScene({ intentType: null, userText: userTextLocal }));

      const code = extractContainerCode(userTextLocal);
      if (code) {
        window.__raynaLog("Depot/ShortCircuit", { code });
        setSceneWithFade(SCENE_BY_INTENT.depot);
        await handleDepotChat({ userText: userTextLocal, profile, setMessages });
        return;
      }

      const wasHandled = await handleAwaiting({
        awaiting,
        setAwaiting,
        userText: userTextLocal,
        profile,
        role,
        setMessages,
        setSaving,
        saving,
        intentsData,
        parkingCtx,
        setParkingCtx,
      });
      if (wasHandled) return;

      const preNLU = shortenForNLU(userTextLocal);
      let det = detectIntent(preNLU, intentsData);

      if (!det?.intent?.type) {
        let addedNLULoading = false;

        if (!nluInitRef.current) {
          const thinking = (STR?.thinking && STR.thinking[langRef.current]) || FBTHINK(langRef.current);
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
          },
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
              ? sem.answer[langRef.current] || sem.answer.es || sem.answer.ro || sem.answer.ca
              : sem.answer;

          setSceneWithFade(pickScene({ intentType: "kb", userText: userTextLocal }));
          pushBot(setMessages, answer, { lang: langRef.current });
          return;
        }
      }

      if (det?.intent?.type) {
        setSceneWithFade(pickScene({ intentType: det.intent.type, userText: userTextLocal }));

        await routeIntent({
          det,
          intentsData,
          role,
          profile,
          setMessages,
          setAwaiting,
          setSaving,
          runAction,
          lang: langRef.current,
        });
        return;
      }

      /* =========================
         AI fallback (NEW)
         - only when NLU + semantic did not produce intent/kb
         - low tokens: shortenForAI()
         ========================= */
      const started = performance.now();
      pushBot(setMessages, "…", { _tag: "ai-loading", lang: langRef.current });

      try {
        const aiRes = await callAiFallback({
          text: shortenForAI(userTextLocal, 220),
          lang: langRef.current,
        });

        const latencyMs = Math.round(performance.now() - started);

        // remove loading bubble
        setMessages((m) => m.filter((b) => b._tag !== "ai-loading"));

        // accept multiple response shapes safely
        const aiText =
          (aiRes && typeof aiRes === "object" && (aiRes.text || aiRes.answer || aiRes.message)) ||
          (typeof aiRes === "string" ? aiRes : "") ||
          "";

        const finalText = String(aiText || "").trim() || ((STR?.dontUnderstand && STR.dontUnderstand[langRef.current]) || FBDONT(langRef.current));

        // scene for AI answer (based on user text)
        setSceneWithFade(pickScene({ intentType: "ai", userText: userTextLocal }));

        pushBot(setMessages, finalText, { lang: langRef.current });

        // log to supabase for later NLU improvements
        await logNluAiFallback({
          supabase,
          profile,
          role,
          lang: langRef.current,
          userText: userTextLocal,
          nluText: preNLU,
          nluIntent: det?.intent?.type || null,
          nluMeta: det || null,
          aiModel: aiRes?.model || aiRes?.meta?.model || null,
          aiAnswer: finalText,
          aiUsage: aiRes?.usage || aiRes?.meta?.usage || null,
          latencyMs,
          route: "ai-fallback",
        });

        return;
      } catch (errAi) {
        setMessages((m) => m.filter((b) => b._tag !== "ai-loading"));
        window.__raynaLog?.("AI/Fallback failed", { message: errAi?.message || String(errAi) }, "error");
        // fall back to classic dont-understand
      }

      const dont = (STR?.dontUnderstand && STR.dontUnderstand[langRef.current]) || FBDONT(langRef.current);
      pushBot(setMessages, dont, { lang: langRef.current });
    } catch (err) {
      window.__raynaReportError?.(err, { phase: "send", userText: userTextLocal, title: "Chat send()" });
      setMessages((m) => [...m, { from: "bot", reply_text: "Ups, algo ha fallado procesando tu mensaje. Intenta de nuevo." }]);
    }
  };

  // Face disponibil window.__raynaOpenMap(pos) pentru cardul din chat.
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
    return () => { delete window.__raynaOpenMap; };
  }, [navigate, location]);

  // last bot index (for typing only last bot message)
  const lastBotIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.from !== "user") return i;
    }
    return -1;
  }, [messages]);

  const renderBot = (m, i) => {
    const label = "Rayna System";

    const isLastBot = i === lastBotIndex;
    const typingAllowed = isLastBot && !typedDoneRef.current.has(i);

    return (
      <div key={i} className={styles.rowLeft}>
        <div className={styles.avatarSm}>
          <img src={RAYNA_AVATAR} alt="Rayna" onError={(e) => (e.currentTarget.style.display = "none")} />
        </div>
        <div className={styles.msgColLeft}>
          <div className={styles.msgLabel}>{label}</div>
          <div className={styles.bubbleAi}>
            <TypingText
              text={m.reply_text}
              speed={14}
              enabled={typingAllowed}
              onDone={() => { typedDoneRef.current.add(i); }}
            />
            {m.render ? <div className={styles.renderWrap}>{m.render()}</div> : null}
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
    <div className={styles.stage}>
      <div className={styles.shell}>
        {/* background layers (crossfade) */}
        <div
          className={styles.bgA}
          style={{
            "--chat-bg": `url("${bgA}")`,
            opacity: showA ? 1 : 0,
          }}
        />
        <div
          className={styles.bgB}
          style={{
            "--chat-bg": `url("${bgB}")`,
            opacity: showA ? 0 : 1,
          }}
        />

        {/* OPTIONAL veil (recommended) */}
        <div className={styles.bgVeil} />

        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.avatarLg}>
              <img
                src={RAYNA_AVATAR}
                alt="Rayna"
                onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
              />
            </div>
            <div className={styles.headerTitles}>
              <div className={styles.brand}>Rayna 2.0</div>
              <div className={styles.tagline}>Hub de Logística</div>
            </div>
          </div>

          <button className={styles.iconBtn} onClick={goHome} aria-label="Cerrar y volver al inicio">
            <IconClose />
          </button>
        </header>

        <div className={styles.chips}>
          <button type="button" className={`${styles.chip} ${styles.chipPrimary}`} onClick={quickAprender} aria-label="Abrir Aprender">
            <span className={styles.chipIcon}><IconStories /></span>
            <span className={styles.chipText}>Aprender</span>
          </button>

          <button type="button" className={styles.chip} onClick={quickReport} aria-label="Reclamar un error">
            <span className={styles.chipIcon}><IconReport /></span>
            <span className={styles.chipText}>Reclamar</span>
          </button>
        </div>

        <main className={styles.chat}>
          {messages.map((m, i) => (m.from === "user" ? renderUser(m, i) : renderBot(m, i)))}
          <div ref={endRef} />
        </main>

        <footer className={styles.inputWrap}>
          <div className={styles.inputPill}>
            <button className={styles.attachBtn} type="button" aria-label="Adjuntar (en desarrollo)" title="Adjuntar (en desarrollo)">
              <IconAttach />
            </button>

            <input
              className={styles.input}
              placeholder="Escriba su consulta logística..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => (e.key === "Enter" ? send() : null)}
              inputMode="text"
            />

            <button className={styles.sendBtn} onClick={send} type="button">
              <span className={styles.sendText}>Enviar</span>
              <IconSend />
            </button>
          </div>

          <div className={styles.safePad} />
        </footer>

        {isAdmin ? <ErrorTray /> : null}
      </div>
    </div>
  );
}

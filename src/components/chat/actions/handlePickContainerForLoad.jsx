// src/components/chat/actions/handlePickContainerForLoad.jsx
import React from "react";
import { supabase } from "../../../supabaseClient";
import styles from "../Chatbot.module.css";

// Folosim parser-ele deja existente (evităm duplicarea)
import {
  parseSizeFromAnswer,
  parseNavieraFromAnswer,
} from "./handleDepotList.jsx";

/* ─────────────────────────────
   Logger UI (folosește ErrorTray dacă e prezent)
   ───────────────────────────── */
function logUI(title, data, level = "info") {
  try {
    if (window.__raynaLog) window.__raynaLog(title, data, level);
  } catch {}
}

/* ─────────────────────────────
   Context pick (sessionStorage)
   ───────────────────────────── */
const PICK_CTX_KEY = "pick_load_ctx";

function getPickCtx() {
  try { return JSON.parse(sessionStorage.getItem(PICK_CTX_KEY) || "{}"); }
  catch { return {}; }
}
function savePickCtx(p) {
  const next = { ...(getPickCtx() || {}), ...(p || {}) };
  sessionStorage.setItem(PICK_CTX_KEY, JSON.stringify(next));
  return next;
}
export function clearPickCtx() {
  sessionStorage.removeItem(PICK_CTX_KEY);
}

/* ─────────────────────────────
   Card simplu pentru rezultat
   ───────────────────────────── */
function ContainerPickCard({ row }) {
  const pos = row?.posicion ?? "—";
  const tip = row?.tipo ?? "—";
  const nav = row?.naviera ?? "—";
  const est = row?.estado ?? "—";
  const code = row?.matricula_contenedor ?? "—";

  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>Contenedor propuesto</div>
      <div style={{ fontSize: 14, lineHeight: 1.5, marginTop: 6 }}>
        <div><strong>Código:</strong> {code}</div>
        <div><strong>Posición:</strong> {pos}</div>
        <div><strong>Tipo:</strong> {tip}</div>
        <div><strong>Naviera:</strong> {nav}</div>
        <div><strong>Estado:</strong> {est}</div>
      </div>

      <div className={styles.cardActions} style={{ marginTop: 10 }}>
        <a
          className={styles.actionBtn}
          href={`/map3d?focus=${encodeURIComponent(pos)}`}
        >
          Ver mapa 3D
        </a>
      </div>
    </div>
  );
}

/* ─────────────────────────────
   Heuristica: “topmost” pe coloana de stivă
   ipoteză: ultima literă din `posicion` e nivelul (A < B < ... < H),
   deci cel cu litera “cea mai mare” e topul (nu are nimic deasupra).
   ───────────────────────────── */
function parseStackKey(pos = "") {
  // ex. "A2C" -> baza "A2", nivel "C"
  const m = String(pos).trim().match(/^([A-F][0-9]{1,2})([A-Z])$/i);
  if (!m) return { base: null, level: null };
  return { base: m[1].toUpperCase(), level: m[2].toUpperCase() };
}
function levelRank(l) {
  // A..Z crescător
  if (!l) return -1;
  return l.charCodeAt(0) - 65; // 'A' -> 0
}

/* ─────────────────────────────
   Găsire candidat optim:
   1) luăm TOATE contenedores pentru a afla topul pe fiecare stivă (base)
   2) aplicăm filtrele (size/naviera/estado pentru încărcare: “vacio”)
   3) păstrăm doar cele care sunt topmost în stiva lor
   4) returnăm primul (poți optimiza după reguli ulterioare)
   ───────────────────────────── */
async function pickBestContainer({ size, naviera }) {
  logUI("Pick/pickBestContainer:INPUT", { size, naviera });

  // 1) luăm toate pentru a calcula “topul” pe fiecare stivă
  const { data: allRows, error: eAll } = await supabase
    .from("contenedores")
    .select("id,matricula_contenedor,naviera,tipo,posicion,estado,detalles,created_at");
  if (eAll) throw eAll;

  // mapă: base -> rank maxim (top)
  const topByBase = {};
  for (const r of allRows || []) {
    const { base, level } = parseStackKey(r.posicion || "");
    if (!base || !level) continue;
    const rank = levelRank(level);
    if (!(base in topByBase) || rank > topByBase[base]) {
      topByBase[base] = rank;
    }
  }

  // 2) candidați compatibili pentru ÎNCĂRCARE:
  //    - implicit căutăm “vacio” / liber (dacă folosești altă convenție, ajustează)
  const candidates = (allRows || []).filter((r) => {
    // filtru naviera
    if (naviera && !(String(r.naviera || "").toUpperCase().includes(String(naviera).toUpperCase())))
      return false;

    // filtru size
    if (size === "40hc") {
      if (!String(r.tipo || "").toUpperCase().includes("40HC")) return false;
    } else if (size === "40") {
      const t = String(r.tipo || "").toUpperCase();
      if (!(t.startsWith("40") && !t.includes("40HC"))) return false;
    } else if (size === "20") {
      if (!String(r.tipo || "").toUpperCase().startsWith("20")) return false;
    }

    // filtru “pregătit pentru încărcare”: presupunem estado = 'vacio' sau null
    const est = (r.estado || "").toLowerCase();
    if (est && est !== "vacio") return false;

    return true;
  });

  // 3) păstrăm doar cele topmost în stiva lor
  const topCandidates = candidates.filter((r) => {
    const { base, level } = parseStackKey(r.posicion || "");
    if (!base || !level) return false;
    return levelRank(level) === topByBase[base];
  });

  // 4) ordonare simplă (poți schimba regula):
  //    cele mai recente la urmă (preferăm “de sus” dar și mai “vechi” ca să eliberăm depozitul)
  topCandidates.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));

  const best = topCandidates[0] || null;
  logUI("Pick/pickBestContainer:RESULT", { total: candidates.length, topOk: topCandidates.length, picked: best?.matricula_contenedor || null });
  return { best, alternatives: topCandidates.slice(1, 3) };
}

/* ─────────────────────────────
   START: pornește dialogul
   ───────────────────────────── */
export async function startPickContainerForLoad({ setMessages, setAwaiting }) {
  clearPickCtx();
  savePickCtx({ awaiting: "pick_load_ask_size", size: null, naviera: null });

  setMessages((m) => [
    ...m,
    { from: "bot", reply_text: "¿Qué tamaño necesitas? (20/40/40HC) Puedes decir también la naviera si ya la sabes." },
  ]);
  setAwaiting("pick_load_ask_size");
}

/* ─────────────────────────────
   AWAITING steps
   ───────────────────────────── */
export async function handleAwaitingPickForLoad({
  awaiting,
  userText,
  setMessages,
  setAwaiting,
}) {
  if (!awaiting?.startsWith?.("pick_load_")) return false;

  const ctx = getPickCtx();
  const t = String(userText || "");

  // Pas 1: mărimea (opțional) + posibil naviera în același răspuns
  if (awaiting === "pick_load_ask_size") {
    const size = parseSizeFromAnswer(t);         // "20" | "40" | "40hc" | null | false
    const nav  = parseNavieraFromAnswer(t);      // "MAERSK" | ... | null | undefined

    // Dacă nu am înțeles nimic, mai întreb
    if (size === false && nav === undefined) {
      setMessages((m) => [
        ...m,
        { from: "bot", reply_text: "No te he entendido. Dime: 20, 40 o 40HC (puedes añadir naviera: MAERSK, MSC…)" },
      ]);
      return true;
    }

    const next = {
      size:   size === false ? ctx.size ?? null : size,
      naviera:nav === undefined ? ctx.naviera ?? null : nav,
    };
    savePickCtx(next);

    // Dacă nu avem naviera, o cerem; altfel trecem la calcul
    if (!next.naviera) {
      setMessages((m) => [
        ...m,
        { from: "bot", reply_text: "¿De qué naviera? (MAERSK, MSC, HAPAG, ONE, COSCO… o di «sin preferencia»)" },
      ]);
      setAwaiting("pick_load_ask_naviera");
      savePickCtx({ awaiting: "pick_load_ask_naviera" });
      return true;
    }

    // Avem tot → calcul
    setAwaiting(null);
    savePickCtx({ awaiting: null });

    try {
      const { best, alternatives } = await pickBestContainer({ size: next.size, naviera: next.naviera });
      if (!best) {
        setMessages((m) => [...m, { from: "bot", reply_text: "No he encontrado un contenedor disponible con estos filtros." }]);
        return true;
      }
      setMessages((m) => [
        ...m,
        { from: "bot", reply_text: "¡Claro! Aquí tienes el contenedor perfecto:" ,
          render: () => <ContainerPickCard row={best} /> },
      ]);

      if (alternatives?.length) {
        setMessages((m) => [
          ...m,
          { from: "bot", reply_text: "Si prefieres otra opción con menos movimientos, aquí tienes otra propuesta:",
            render: () => <ContainerPickCard row={alternatives[0]} /> },
        ]);
      }
    } catch (e) {
      logUI("Pick/compute:ERROR", { error: e }, "error");
      setMessages((m) => [...m, { from: "bot", reply_text: "No he podido calcular ahora mismo. Intenta de nuevo." }]);
    }
    return true;
  }

  // Pas 2: naviera (dacă a lipsit)
  if (awaiting === "pick_load_ask_naviera") {
    const nav = parseNavieraFromAnswer(t); // null = fără preferință
    const next = { ...(ctx || {}), naviera: nav ?? null };
    savePickCtx(next);

    setAwaiting(null);
    savePickCtx({ awaiting: null });

    try {
      const { best, alternatives } = await pickBestContainer({ size: next.size, naviera: next.naviera });
      if (!best) {
        setMessages((m) => [...m, { from: "bot", reply_text: "No he encontrado un contenedor disponible con estos filtros." }]);
        return true;
      }
      setMessages((m) => [
        ...m,
        { from: "bot", reply_text: "¡Perfecto! Este es el contenedor óptimo:",
          render: () => <ContainerPickCard row={best} /> },
      ]);

      if (alternatives?.length) {
        setMessages((m) => [
          ...m,
          { from: "bot", reply_text: "También podrías considerar esta otra alternativa:",
            render: () => <ContainerPickCard row={alternatives[0]} /> },
        ]);
      }
    } catch (e) {
      logUI("Pick/compute:ERROR", { error: e }, "error");
      setMessages((m) => [...m, { from: "bot", reply_text: "No he podido calcular ahora mismo. Intenta de nuevo." }]);
    }
    return true;
  }

  return false;
}
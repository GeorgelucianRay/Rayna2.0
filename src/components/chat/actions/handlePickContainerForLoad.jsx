// src/components/chat/actions/handlePickContainerForLoad.jsx
import React from "react";
import styles from "../Chatbot.module.css";
import { supabase } from "../../../supabaseClient";

/* ─────────────────────────────
   Logger (ErrorTray) + ErrorBody
   ───────────────────────────── */
function logUI(title, data, level = "info") {
  try { if (window.__raynaLog) window.__raynaLog(title, data, level); } catch {}
}
function ErrorBody({ title = "Error", details }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>{title}</div>
      <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, marginTop: 8 }}>{details}</pre>
    </div>
  );
}

/* ─────────────────────────────
   Context local flux interactiv
   ───────────────────────────── */
const CTX_KEY = "pick_load_ctx";
const getCtx = () => JSON.parse(sessionStorage.getItem(CTX_KEY) || "{}");
const saveCtx = (p) => {
  const next = { ...(getCtx() || {}), ...(p || {}) };
  sessionStorage.setItem(CTX_KEY, JSON.stringify(next));
  return next;
};
export function clearPickLoadCtx() { sessionStorage.removeItem(CTX_KEY); }

/* ─────────────────────────────
   Helpers de parsare & poziții
   ───────────────────────────── */
// poziție: A2C => { fila:'A', col:2, nivel:'C' }
function parsePos(pos = "") {
  const m = String(pos).trim().match(/^([A-F])\s*([1-9]|10|7)\s*([A-Z])$/i);
  if (!m) return null;
  return { fila: m[1].toUpperCase(), col: parseInt(m[2],10), nivel: m[3].toUpperCase() };
}
const levelRank = ch => (ch && ch.length === 1) ? (ch.charCodeAt(0) - "A".charCodeAt(0)) : -1;

// top-of-stack: nu există nimeni cu același (fila, col) și nivel mai MARE
function computeTopOfStack(rows) {
  // indexăm toate nivelele existente pe (fila,col)
  const map = new Map(); // key: "A|2" -> set nivele
  for (const r of rows) {
    const p = parsePos(r.posicion || r.posicio || r.position || "");
    if (!p) continue;
    const k = `${p.fila}|${p.col}`;
    if (!map.has(k)) map.set(k, new Set());
    map.get(k).add(p.nivel);
  }
  return rows.filter(r => {
    const p = parsePos(r.posicion || r.posicio || r.position || "");
    if (!p) return false;
    const k = `${p.fila}|${p.col}`;
    const levels = map.get(k) || new Set();
    // e top dacă nu există nivel > al lui
    for (const lv of levels) {
      if (levelRank(lv) > levelRank(p.nivel)) return false;
    }
    return true;
  });
}

// ordonare deterministă (poți ajusta după preferințe)
function rankCandidates(rows) {
  return [...rows].sort((a, b) => {
    const pa = parsePos(a.posicion || "");
    const pb = parsePos(b.posicion || "");
    if (!pa && !pb) return 0;
    if (!pa) return 1;
    if (!pb) return -1;
    // prefer D–F înaintea A–C (mai “apropiate” de ieșire? — e un exemplu)
    const filaOrder = "DEFABC";
    const da = filaOrder.indexOf(pa.fila);
    const db = filaOrder.indexOf(pb.fila);
    if (da !== db) return da - db;
    // apoi coloană crescător
    if (pa.col !== pb.col) return pa.col - pb.col;
    // apoi nivel mai mare (C peste B) înseamnă mai probabil top
    return levelRank(pb.nivel) - levelRank(pa.nivel);
  });
}

/* ─────────────────────────────
   Parsere simple de răspuns
   ───────────────────────────── */
export function parseSizeAnswer(t = "") {
  const s = t.toLowerCase();
  if (/\b40\s*hc\b|\b40hc\b|\bhigh\s*cube\b|\balto\b/.test(s)) return "40hc";
  if (/\b40\b/.test(s)) return "40";
  if (/\b20\b/.test(s)) return "20";
  return null;
}
export function parseNavieraAnswer(t = "") {
  const KNOWN = ["MAERSK","MSC","HAPAG","HMM","ONE","COSCO","EVERGREEN","CMA","YANG MING","ZIM","MESSINA"];
  const up = t.toUpperCase();
  for (const k of KNOWN) if (up.includes(k)) return k;
  const m = t.match(/\bde\s+([A-Za-z0-9][\w\s-]{2,})/i);
  return m ? m[1].trim().toUpperCase() : null;
}
export function parseQtyAnswer(t = "") {
  const n = parseInt(String(t).match(/\d+/)?.[0] || "1", 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 10) : 1;
}

/* ─────────────────────────────
   Card container + buton Map3D
   ───────────────────────────── */
function ContainerCard({ row, onOpen3D }) {
  const pos = row?.posicion ?? "—";
  const p = parsePos(pos);
  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>
        Contenedor {row?.matricula_contenedor || "—"}
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.5, marginTop: 6 }}>
        <div><strong>Naviera:</strong> {row?.naviera || "—"}</div>
        <div><strong>Tipo:</strong> {row?.tipo || "—"}</div>
        <div><strong>Posición:</strong> {pos}</div>
        <div><strong>Estado:</strong> {row?.estado || "—"}</div>
      </div>
      <div className={styles.cardActions} style={{ marginTop: 8 }}>
        <button className={styles.actionBtn} onClick={() => onOpen3D?.(p, row)}>
          Ver mapa 3D
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────
   Query candidați (contenedores)
   ───────────────────────────── */
async function fetchCandidates({ size, naviera }) {
  logUI("PickLoad/fetchCandidates:INPUT", { size, naviera });
  let q = supabase
    .from("contenedores")
    .select("id,created_at,matricula_contenedor,naviera,tipo,posicion,estado,matricula_camion,detalles");
  // pentru încărcare avem nevoie de VACÍO
  q = q.eq("estado", "vacio");
  if (size === "40hc")      q = q.ilike("tipo", "%40HC%");
  else if (size === "40")   q = q.ilike("tipo", "40%").not.ilike("tipo", "%40HC%");
  else if (size === "20")   q = q.ilike("tipo", "20%");
  if (naviera)              q = q.ilike("naviera", `%${naviera}%`);

  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) {
    logUI("PickLoad/fetchCandidates:ERROR", { error }, "error");
    throw error;
  }
  logUI("PickLoad/fetchCandidates:OK", { rows: data?.length || 0 });
  return data || [];
}

/* ─────────────────────────────
   Render răspuns & salvare context
   ───────────────────────────── */
function pushExplaining(setMessages, text) {
  setMessages(m => [...m, { from: "bot", reply_text: text }]);
}
function showPicks({ picks, setMessages, setAwaiting }) {
  const ctx = saveCtx({ picks }); // salvăm pentru follow-up (ex: "de dónde sabes…")
  const first = picks[0];
  pushExplaining(setMessages, "¡Claro! Aquí tengo tu contenedor perfecto:");
  setMessages(m => [
    ...m,
    {
      from: "bot",
      reply_text: "",
      render: () => (
        <ContainerCard
          row={first}
          onOpen3D={(p) => {
            logUI("PickLoad/open3D", { pos: p, code: first?.matricula_contenedor });
            // Aici doar emitem eveniment simplu – tu în Map3D citești url/hash sau window event
            const qp = p ? `?pos=${p.fila}-${p.col}-${p.nivel}` : "";
            window.location.href = `/map3d${qp}`;
          }}
        />
      )
    }
  ]);
  // sugerăm user-ului “de unde știi…”
  setMessages(m => [...m, { from:"bot", reply_text:"Si quieres, te explico por qué es el más óptimo." }]);
  if (setAwaiting) setAwaiting("pick_load_why");
}

/* ─────────────────────────────
   Runner principal (cu interogare)
   ───────────────────────────── */
async function runPick({ size, naviera, qty = 1, setMessages, setAwaiting }) {
  logUI("PickLoad/runPick:INPUT", { size, naviera, qty });

  let data = [];
  try {
    data = await fetchCandidates({ size, naviera });
  } catch (e) {
    const details =
      (e?.message || "Unknown error") + "\n\n" +
      JSON.stringify({ hint: e?.hint, code: e?.code, details: e?.details }, null, 2);
    setMessages(m => [
      ...m,
      { from:"bot", reply_text:"No he podido buscar candidatos ahora.", render: () => <ErrorBody title="Supabase error" details={details} /> }
    ]);
    return;
  }

  // determinăm top-of-stack
  const topOnly = computeTopOfStack(data);
  logUI("PickLoad/topOnly", { total: data.length, top: topOnly.length });

  if (!topOnly.length) {
    setMessages(m => [...m, { from:"bot", reply_text:"No hay contenedores vacíos disponibles arriba de la pila para esos filtros." }]);
    return;
  }

  const ranked = rankCandidates(topOnly);
  const picks = ranked.slice(0, Math.max(1, qty));
  showPicks({ picks, setMessages, setAwaiting });
}

/* ─────────────────────────────
   API public: handler + awaiting
   ───────────────────────────── */
/**
 * Pornire flux:
 * - dacă lipsesc size/naviera/cantidad → întreabă etapizat (awaiting)
 * - altfel rulează selecția
 */
export default async function handlePickContainerForLoad({
  userText, setMessages, setAwaiting
}) {
  logUI("PickLoad/handle:RAW", { text: userText });

  const ctx = getCtx();
  let { size, naviera, qty } = ctx;

  // 1) extrage eventuale info din comanda inițială
  const s = parseSizeAnswer(userText || "");
  if (s) size = s;
  const n = parseNavieraAnswer(userText || "");
  if (n) naviera = n;
  if (!qty) qty = parseQtyAnswer(userText || "");

  // 2) întrebări lipsă
  if (!naviera) {
    saveCtx({ size, qty });
    setAwaiting("pick_load_naviera");
    setMessages(m => [...m, { from:"bot", reply_text:"¿De qué naviera lo necesitas? (Maersk, MSC, Hapag…)" }]);
    return;
  }
  if (!size) {
    saveCtx({ naviera, qty });
    setAwaiting("pick_load_size");
    setMessages(m => [...m, { from:"bot", reply_text:"¿De 20, 40 o 40HC?" }]);
    return;
  }

  // 3) gata — rulăm selecția
  saveCtx({ naviera, size, qty, picks: null });
  await runPick({ size, naviera, qty, setMessages, setAwaiting });
}

/**
 * Awaiting pentru etapele intermediare + “¿De dónde sabes…?”
 */
export async function handleAwaitingPickLoad({
  awaiting, userText, setMessages, setAwaiting
}) {
  if (!awaiting) return false;

  const ctx = getCtx();

  if (awaiting === "pick_load_naviera") {
    const naviera = parseNavieraAnswer(userText || "");
    if (!naviera) {
      setMessages(m => [...m, { from:"bot", reply_text:"No te he entendido. Dime una naviera (Maersk, MSC, …)" }]);
      return true;
    }
    saveCtx({ ...ctx, naviera });
    setAwaiting(null);
    // dacă lipsește size, întrebăm
    if (!ctx.size) {
      setAwaiting("pick_load_size");
      setMessages(m => [...m, { from:"bot", reply_text:"Perfecto. ¿De 20, 40 o 40HC?" }]);
      return true;
    }
    // altfel rulăm
    await runPick({ naviera, size: ctx.size, qty: ctx.qty || 1, setMessages, setAwaiting });
    return true;
  }

  if (awaiting === "pick_load_size") {
    const size = parseSizeAnswer(userText || "");
    if (!size) {
      setMessages(m => [...m, { from:"bot", reply_text:"No te he entendido. Dime 20, 40 o 40HC." }]);
      return true;
    }
    saveCtx({ ...ctx, size });
    setAwaiting(null);
    await runPick({ naviera: ctx.naviera, size, qty: ctx.qty || 1, setMessages, setAwaiting });
    return true;
  }

  if (awaiting === "pick_load_why") {
    setAwaiting(null);
    const picks = getCtx().picks || [];
    if (!picks.length) {
      setMessages(m => [...m, { from:"bot", reply_text:"Aún no tengo un candidato seleccionado." }]);
      return true;
    }
    // explicăm și (dacă există) arătăm #2
    setMessages(m => [...m, { from:"bot", reply_text:"Porque está arriba de su pila (no hay nada encima), así evitamos movimientos innecesarios." }]);

    if (picks.length >= 2) {
      const second = picks[1];
      setMessages(m => [
        ...m,
        {
          from: "bot",
          reply_text: "Aquí tienes la segunda mejor opción:",
          render: () => (
            <ContainerCard
              row={second}
              onOpen3D={(p) => {
                logUI("PickLoad/open3D#2", { pos: p, code: second?.matricula_contenedor });
                const qp = p ? `?pos=${p.fila}-${p.col}-${p.nivel}` : "";
                window.location.href = `/map3d${qp}`;
              }}
            />
          )
        }
      ]);
    } else {
      setMessages(m => [...m, { from:"bot", reply_text:"No hay otra opción igual de óptima ahora mismo." }]);
    }
    return true;
  }

  return false;
}
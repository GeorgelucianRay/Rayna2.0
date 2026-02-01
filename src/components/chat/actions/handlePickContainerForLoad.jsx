import React from "react";
import { supabase } from "../../../supabaseClient";
import styles from "../Chatbot.module.css";
import { parseNavieraFromAnswer } from "./handleDepotList.jsx";

/* ---------- Debug helper (ErrorTray) ---------- */
function logUI(title, data, level = "info") {
  try { window.__raynaLog?.(title, data, level); } catch {}
}

/* ---------- Route Map3D (fallback pentru link direct) ---------- */
const MAP3D_ROUTE = "/mapa";

/* ---------- Context local pentru fluxul "pick for load" ---------- */
const CTX_KEY = "pick_load_ctx";
const getCtx = () => JSON.parse(sessionStorage.getItem(CTX_KEY) || "{}");
const saveCtx = (p) => {
  const next = { ...(getCtx() || {}), ...(p || {}) };
  sessionStorage.setItem(CTX_KEY, JSON.stringify(next));
  return next;
};
const clearCtx = () => sessionStorage.removeItem(CTX_KEY);

/* ---------- Parsere pentru SIZE (bogat) ----------
 * Returnează: { base: "20"|"40"|"45"|null, special: "hc"|"ot"|"bajo"|null }
 */
export function parseSizeRich(text = "") {
  const t = String(text).toLowerCase();

  // 45
  if (/\b45\b/.test(t)) return { base: "45", special: null };

  // OPEN TOP (20/40)
  if (/\b(open\s*top|ot)\b/.test(t)) {
    if (/\b20\b/.test(t)) return { base: "20", special: "ot" };
    if (/\b40\b/.test(t)) return { base: "40", special: "ot" };
    return { base: null, special: "ot" }; // OT fără bază ⇒ mai cerem baza
  }

  // 40 HC / 40 ALTO / HIGH CUBE
  if (/\b40\s*hc\b|\b40hc\b/.test(t)) return { base: "40", special: "hc" };
  if (/\b40\s*(alto|high\s*cube)\b/.test(t)) return { base: "40", special: "hc" };

  // 40 BAJO (non-HC)
  if (/\b40\s*(bajo|normal|estandar|estándar)\b/.test(t)) return { base: "40", special: "bajo" };

  // 20 / 40 simple
  if (/\b20\b/.test(t)) return { base: "20", special: null };
  if (/\b40\b/.test(t)) return { base: "40", special: null };

  return { base: null, special: null };
}

/* ================================================================
 * 1) START — pornește dialogul și cere filtrele
 * ================================================================ */
export async function startPickContainerForLoad({ userText, setMessages, setAwaiting }) {
  logUI("PickLoad/START", { userText });

  clearCtx();

  // ✅ parsează chiar din primul mesaj
  const sizeObj = parseSizeRich(userText);
  const nav = parseNavieraFromAnswer(userText); // string | null | undefined

  // IMPORTANT:
  // - undefined = nu am înțeles (nu ating)
  // - null = explicit "fără preferință" (dar la tine naviera e obligatorie, deci o tratăm ca lipsă)
  const filters = {
    base: sizeObj.base ?? null,
    special: sizeObj.special ?? null,
    naviera: typeof nav === "string" && nav.trim() ? nav.trim() : null,
  };

  saveCtx({ step: "filters", filters });

  logUI("PickLoad/START_PARSED", { filters });

// ✅ STRICT: fără base + naviera nu căutăm nimic în DB
if (filters.naviera && filters.base) {
  return await _suggest(filters, setMessages, setAwaiting);
}


  // ✅ altfel întreabă DOAR ce lipsește
  if (!filters.base && !filters.special) {
    setMessages((m) => [
      ...m,
      {
        from: "bot",
        reply_text:
          "¿Qué tamaño necesitas? (20 / 20 OT / 40 bajo / 40 alto=HC / 40 OT / 45)",
      },
    ]);
    setAwaiting("pick_load_filters");
    logUI("PickLoad/AWAITING", { awaiting: "pick_load_filters" });
    return;
  }

  if (!filters.naviera) {
    setMessages((m) => [
      ...m,
      {
        from: "bot",
        reply_text:
          "¿De qué naviera lo necesitas? (Maersk, MSC, Evergreen, Hapag, ONE, COSCO, CMA, HMM, ZIM, Yang Ming, Messina…)",
      },
    ]);
    setAwaiting("pick_load_naviera");
    logUI("PickLoad/AWAITING", { awaiting: "pick_load_naviera" });
    return;
  }

  // fallback safe
  setAwaiting("pick_load_filters");
  logUI("PickLoad/AWAITING", { awaiting: "pick_load_filters" });
}


/* ================================================================
 * 2) AWAITING — filtre + bucla de feedback
 *    Stări: "pick_load_filters" | "pick_load_naviera" | "pick_load_feedback"
 * ================================================================ */
export async function handleAwaitingPickForLoad({
  awaiting,
  userText,
  setMessages,
  setAwaiting,
}) {
  // —— FEEDBACK LOOP
  if (awaiting === "pick_load_feedback") {
    const t = (userText || "").toLowerCase().trim();
    const NO = ["no", "nop", "no gracias", "gracias", "ya esta", "ya está"];
    if (NO.some(x => t.includes(x))) {
      setAwaiting(null);
      setMessages(m => [...m, { from: "bot", reply_text: "¡A ti! Si necesitas algo más, dime 😊" }]);
      return true;
    }
    // orice alt text -> reinterpretez ca noi filtre
    const sizeObj = parseSizeRich(userText);
    const nav = parseNavieraFromAnswer(userText);
    const ctx = getCtx();
    const prev = ctx.filters || {};
    const next = {
      base: sizeObj.base ?? prev.base,
      special: sizeObj.special ?? prev.special,
      naviera: (nav === undefined ? prev.naviera : nav),
    };
    saveCtx({ ...ctx, filters: next });
    return await _suggest(next, setMessages, setAwaiting);
  }

  // —— FILTRE inițiale (sau cerere navieră)
  if (awaiting !== "pick_load_filters" && awaiting !== "pick_load_naviera") return false;

  const ctx = getCtx();
  const prev = ctx.filters || { base: null, special: null, naviera: null };

  const sizeObj = parseSizeRich(userText);
  const nav = parseNavieraFromAnswer(userText); // string | null | undefined

  const next = {
    base: sizeObj.base ?? prev.base,
    special: sizeObj.special ?? prev.special,
    // null = fără preferință, undefined = nu am înțeles → păstrăm precedentul
    naviera: nav === undefined ? prev.naviera : nav,
  };
  saveCtx({ ...ctx, filters: next });

  logUI("PickLoad/INPUT", { userText, size: next, nav: next.naviera });

  // 1) obligatoriu: naviera
  if (!next.naviera) {
    setMessages((m) => [
      ...m,
      {
        from: "bot",
        reply_text:
          "¿De qué naviera lo necesitas? (Maersk, MSC, Evergreen, Hapag, ONE, COSCO, CMA, HMM, ZIM, Yang Ming, Messina…)",
      },
    ]);
    setAwaiting("pick_load_naviera");
    saveCtx({ ...ctx, step: "ask_naviera" });
    logUI("PickLoad/ASK_NAVIERA", next);
    return true;
  }
// ✅ obligatoriu: baza (20/40/45). Fără bază nu interogăm DB.
if (!next.base) {
  // dacă user a zis "OT" fără 20/40, întrebăm baza specific pentru OT
  if (next.special === "ot") {
    setMessages((m) => [
      ...m,
      { from: "bot", reply_text: "¿De qué base lo quieres: 20 o 40? (para el Open Top)" },
    ]);
    setAwaiting("pick_load_filters");
    saveCtx({ ...ctx, step: "ask_base_ot" });
    logUI("PickLoad/ASK_BASE_OT", next);
    return true;
  }

  setMessages((m) => [
    ...m,
    { from: "bot", reply_text: "¿Qué tamaño necesitas? (20 / 40 / 45)" },
  ]);
  setAwaiting("pick_load_filters");
  saveCtx({ ...ctx, step: "ask_base" });
  logUI("PickLoad/ASK_BASE", next);
  return true;
}

  // 2) dacă avem special fără bază (ex.: “open top”)
  if (!next.base && next.special) {
    setMessages((m) => [
      ...m,
      { from: "bot", reply_text: "¿De qué base lo quieres: 20 o 40? (para el Open Top)" },
    ]);
    setAwaiting("pick_load_filters");
    saveCtx({ ...ctx, step: "ask_base" });
    return true;
  }

  // 3) avem suficiente info → sugerăm
  return await _suggest(next, setMessages, setAwaiting);
}

/* ——— funcție internă: suggest + follow-up loop ——— */
async function _suggest(filters, setMessages, setAwaiting) {
  try {
    // ✅ safety net: nu interogăm DB fără filtre complete
    if (!filters?.base || !filters?.naviera) {
      logUI("PickLoad/SUGGEST_BLOCKED_MISSING_FILTERS", { filters }, "info");
      setMessages((m) => [
        ...m,
        { from: "bot", reply_text: "Necesito tamaño (20/40/45) y naviera para poder buscar." },
      ]);
      setAwaiting("pick_load_filters");
      return true;
    }

    const suggestion = await pickBestContainer(filters);

   saveCtx({ step: "suggested", lastSuggestion: suggestion || null });

    if (!suggestion) {
      setMessages((m) => [
        ...m,
        {
          from: "bot",
          reply_text:
            "No he encontrado un contenedor libre arriba con esos filtros. ¿Probamos otra combinación (tamaño/naviera)?",
        },
      ]);
      // rămânem în aceeași stare pentru următorul input
      setAwaiting("pick_load_feedback");
      return true;
    }

    const { row } = suggestion;
    const ranked = suggestion.ranked || [];
    const pos = row.posicion ?? "—";
    const tipo = row.tipo ?? "—";
    const navieraLabel = row.naviera ?? "—";
    const code = row.matricula_contenedor ?? "—";

    setMessages((m) => [
      ...m,
      {
        from: "bot",
        reply_text: "¡Claro! Aquí tengo tu contenedor perfecto 👇",
        render: () => (
          <div className={styles.card}>
            <div className={styles.cardTitle}>Contenedor sugerido</div>
            <div style={{ fontSize: 14, lineHeight: 1.5, marginTop: 6 }}>
              <div><strong>Código:</strong> {code}</div>
              <div><strong>Posición:</strong> {pos}</div>
              <div><strong>Tipo:</strong> {tipo}</div>
              <div><strong>Naviera:</strong> {navieraLabel}</div>
              <div><strong>Estado:</strong> {row.estado || "—"}</div>
            </div>
            <div className={styles.cardActions} style={{ marginTop: 10 }}>
              <button
                className={styles.actionBtn}
                onClick={() => window.__raynaOpenMap ? window.__raynaOpenMap(pos) : (window.location.href = buildMapHref(pos))}
              >
                Ver mapa 3D
              </button>
            </div>
          </div>
        ),
      },
      { from: "bot", reply_text: "¿Quieres que pruebe otra combinación (tamaño/naviera) o te sirve este? " },
    ]);

  saveCtx({ lastSuggestion: suggestion, ranked, filters });
  setAwaiting("pick_load_confirm");
    logUI("PickLoad/SUGGESTED", { pos, code, tipo, naviera: navieraLabel });
  } catch (e) {
    logUI("PickLoad/ERROR", { error: e }, "error");
    setMessages((m) => [
      ...m,
      { from: "bot", reply_text: "No he podido buscar ahora mismo. Intenta de nuevo." },
    ]);
  }
  return true;
}

export function handlePickConfirm({ userText, setMessages, setAwaiting }) {
  const t = (userText || "").toLowerCase();

  // finalizează
  if (/\b(no|gracias|listo|ya esta|ya está|vale asi)\b/.test(t)) {
    setAwaiting(null);
    setMessages(m => [...m, { from: "bot", reply_text: "¡Perfecto! Si necesitas algo más, dime 😊" }]);
    return true;
  }

  // întrebarea „de unde știi / de ce e perfect?”
  const askWhy = /\b(por que|por qué|de donde|de dónde|porque|why|motivo|razon|razón)\b/.test(t);
  if (askWhy) {
    const ctx = getCtx();
    const ranked = ctx.ranked || [];
    if (!ranked.length) {
      setAwaiting(null);
      setMessages(m => [...m, { from: "bot", reply_text: "He perdido el contexto de la selección. Pídeme otra vez el contenedor, por favor." }]);
      return true;
    }

    const best = ranked[0];
    const second = ranked[1];
    const reasonBest = best.moves === 0
      ? "porque encima no tiene ningún contenedor (0 movimientos)."
      : `porque requiere el menor número de movimientos arriba (${best.moves}).`;

    setMessages(m => [...m, { from: "bot", reply_text: `Lo elegí ${reasonBest}` }]);

    if (second) {
      const r2 = second.row, pos2 = r2.posicion ?? "—", code2 = r2.matricula_contenedor ?? "—";
      setMessages(m => [...m, {
        from: "bot",
        reply_text: "Aquí tienes la segunda mejor opción 👇",
        render: () => (
          <div className={styles.card}>
            <div className={styles.cardTitle}>Alternativa #2</div>
            <div style={{fontSize:14,lineHeight:1.5,marginTop:6}}>
              <div><strong>Código:</strong> {code2}</div>
              <div><strong>Posición:</strong> {pos2}</div>
              <div><strong>Tipo:</strong> {r2.tipo || "—"}</div>
              <div><strong>Naviera:</strong> {r2.naviera || "—"}</div>
              <div><strong>Movimientos sobre él:</strong> {second.moves}</div>
            </div>
            <div className={styles.cardActions} style={{marginTop:10}}>
              <button className={styles.actionBtn}
                onClick={() => window.__raynaOpenMap ? window.__raynaOpenMap(pos2) : (window.location.href = buildMapHref(pos2))}>
                Ver mapa 3D
              </button>
            </div>
          </div>
        )
      }]);
    }

    // rămânem în confirm; poate cere altă combinație sau „no”
    setAwaiting("pick_load_confirm");
    return true;
  }

  // orice alt text aici = vrea altă combinație → revenim la filtre
  setMessages(m => [...m, { from: "bot", reply_text: "Perfecto. Dime otra combinación (tamaño/naviera): por ejemplo «40 bajo MSC» o «20 OT Maersk»." }]);
  setAwaiting("pick_load_filters");
  return true;
}


export function buildMapHref(pos) {
  const hrefBase = (location.hash && location.hash.startsWith("#/"))
    ? `/#${MAP3D_ROUTE}`   // HashRouter
    : MAP3D_ROUTE;         // BrowserRouter
  return `${hrefBase}?focus=${encodeURIComponent(pos)}`;
}

/* ================================================================
 * 3) Algoritm: dacă nu există “libre arriba”, alege minim mutări
 *    Suportă: 20, 20 OT, 40 bajo, 40 alto(HC), 40 OT, 45
 * ================================================================ */
export async function pickBestContainer({ base, special, naviera }) {
  // 1) candidatos: solo vacíos — contenedores roto NO sirven para cargar
  let q = supabase
    .from("contenedores")
    .select("id,matricula_contenedor,naviera,tipo,posicion,estado,created_at")
    .eq("estado", "vacio");

  // tip/dimensiune
if (base === "45") {
  q = q.ilike("tipo", "45%");
} else if (base === "20") {
  if (special === "ot") q = q.ilike("tipo", "%20%OT%");
  else q = q.ilike("tipo", "20%");
} else if (base === "40") {
  if (special === "hc") {
    // prinde 40HC, 40 Alto, High Cube
    q = q.or("tipo.ilike.%40%HC%,tipo.ilike.%40%ALTO%,tipo.ilike.%HIGH%CUBE%");
  } else if (special === "ot") {
    q = q.ilike("tipo", "%40%OT%");
  } else if (special === "bajo") {
    q = q.ilike("tipo", "40%")
         .not.ilike("tipo", "%HC%")
         .not.ilike("tipo", "%ALTO%")
         .not.ilike("tipo", "%OT%");
  } else {
    q = q.ilike("tipo", "40%");
  }
}

// naviera (obligatoriu în flux)
if (naviera) q = q.ilike("naviera", `%${naviera}%`);

let { data: candidates, error } = await q.order("created_at", { ascending: true });
if (error) throw error;
// Excluir explícitamente roto (contenedores roto no son válidos para cargar)
candidates = (candidates || []).filter((r) => (r.estado || "").toLowerCase() !== "roto");

// fallback: dacă special=hc și nu găsim nimic, relaxăm pe 40 generic
if ((!candidates || !candidates.length) && base === "40" && special === "hc") {
  const q2 = supabase
    .from("contenedores")
    .select("id,matricula_contenedor,naviera,tipo,posicion,estado,created_at")
    .eq("estado", "vacio")
    .ilike("tipo", "40%");
  const { data: c2, error: e2 } =
    await q2.ilike("naviera", `%${naviera || ""}%`).order("created_at", { ascending: true });
  if (e2) throw e2;
  candidates = (c2 || []).filter((r) => (r.estado || "").toLowerCase() !== "roto");
}

logUI("PickLoad/SQL_RESULT", { candidates: candidates?.length || 0, base, special, naviera });
if (!candidates?.length) return null;

  // 2) toate pozițiile (pentru a număra ce e deasupra)
  const { data: all, error: e2 } = await supabase
    .from("contenedores")
    .select("posicion,matricula_contenedor,estado");
  if (e2) throw e2;

  const normPos = (p) => String(p || "").trim().toUpperCase().replace(/\s+/g, "");
  const occupied = new Set((all || []).map((r) => normPos(r.posicion)));

  const parsePos = (p) => {
    const s = normPos(p);
    const m = s.match(/^([A-Z])(\d{1,2})([A-Z])$/);
    return m ? { row: m[1], col: m[2], level: m[3] } : null;
  };
  const abovePos = (p) => {
    const s = parsePos(p);
    if (!s) return null;
    const next = String.fromCharCode(s.level.charCodeAt(0) + 1);
    return `${s.row}${s.col}${next}`;
  };
  const countAbove = (p) => {
    let c = 0, cur = p;
    for (let i = 0; i < 8; i++) { // până la H
      const ap = abovePos(cur);
      if (!ap) break;
      if (occupied.has(ap)) c++; else break;
      cur = ap;
    }
    return c;
  };
  const levelRank = (p) => {
    const s = parsePos(p);
    return s ? s.level.charCodeAt(0) : 0;
  };

  // 3) întâi cele libere deasupra (poziție = rând E, col 5, înălțime C → E5C)
  const freeTop = candidates.filter((r) => countAbove(normPos(r.posicion)) === 0);
  if (freeTop.length) {
     const ranked = freeTop
       .map(r => ({ row: r, moves: 0, lvl: levelRank(r.posicion) }))
       .sort((a, b) => b.lvl - a.lvl || new Date(a.row.created_at) - new Date(b.row.created_at));
     return { row: ranked[0].row, ranked };
   }

  // 4) fallback: minim mutări, apoi cât mai sus
  const withScore = candidates.map((r) => ({
    row: r,
    above: countAbove(normPos(r.posicion)),
    lvl: levelRank(r.posicion),
  }));

  withScore.sort((a, b) =>
    a.above - b.above ||         // cât mai puține containere peste
    b.lvl - a.lvl   ||           // apoi cât mai sus în stivă
    new Date(a.row.created_at) - new Date(b.row.created_at)
  );

  const ranked = withScore.map(x => ({ row: x.row, moves: x.above, lvl: x.lvl }));
   return { row: ranked[0].row, ranked };
}
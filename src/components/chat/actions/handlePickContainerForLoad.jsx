import React from "react";
import { supabase } from "../../../supabaseClient";
import styles from "../Chatbot.module.css";
import { parseNavieraFromAnswer } from "./handleDepotList.jsx";

/* ---------- Debug helper (ErrorTray) ---------- */
function logUI(title, data, level = "info") {
  try { window.__raynaLog?.(title, data, level); } catch {}
}

/* ---------- Route Map3D (ajustează dacă ruta ta e alta) ---------- */
const MAP3D_ROUTE = "/map3d"; // ex: "/map3d" sau "/# /map3d"

/* ---------- Context local pentru fluxul "pick for load" ---------- */
const CTX_KEY = "pick_load_ctx";
const getCtx = () => JSON.parse(sessionStorage.getItem(CTX_KEY) || "{}");
const saveCtx = (p) => {
  const next = { ...(getCtx() || {}), ...(p || {}) };
  sessionStorage.setItem(CTX_KEY, JSON.stringify(next));
  return next;
};
const clearCtx = () => sessionStorage.removeItem(CTX_KEY);

/* ---------- Parsere pentru SIZE (mai bogat decât în listă) ---------- */
/** Returnează obiect:
 * { base: "20"|"40"|"45"|null, special: "hc"|"ot"|"bajo"|"alto"|null }
 */
function parseSizeRich(text = "") {
  const t = String(text).toLowerCase();
  // 45
  if (/\b45\b/.test(t)) return { base: "45", special: null };

  // open top
  if (/\b(open\s*top|ot)\b/.test(t)) {
    if (/\b20\b/.test(t)) return { base: "20", special: "ot" };
    if (/\b40\b/.test(t)) return { base: "40", special: "ot" };
    return { base: null, special: "ot" }; // OT dar fără bază ⇒ mai cerem baza
  }

  // 40 alto / 40hc
  if (/\b40\s*hc\b|\b40hc\b/.test(t)) return { base: "40", special: "hc" };
  if (/\b40\s*(alto|high\s*cube)\b/.test(t)) return { base: "40", special: "hc" });

  // 40 bajo
  if (/\b40\s*(bajo|normal|estandar|estándar)\b/.test(t)) return { base: "40", special: "bajo" };

  // numai 20 / 40
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
  saveCtx({ step: "filters", filters: { base: null, special: null, naviera: null } });

  setMessages((m) => [
    ...m,
    {
      from: "bot",
      reply_text:
        "¿Qué tamaño necesitas? (20 / 20 OT / 40 bajo / 40 alto=HC / 40 OT / 45)\nPuedes decir también la naviera (Maersk, MSC, Evergreen…).",
    },
  ]);
  setAwaiting("pick_load_filters");
  logUI("PickLoad/AWAITING", { awaiting: "pick_load_filters" });
}

/* ================================================================
 * 2) AWAITING — citim răspunsurile până avem size+naviera
 *    Acceptă două stări: "pick_load_filters" și "pick_load_naviera"
 * ================================================================ */
export async function handleAwaitingPickForLoad({
  awaiting,
  userText,
  setMessages,
  setAwaiting,
}) {
  if (awaiting !== "pick_load_filters" && awaiting !== "pick_load_naviera") return false;

  // citim context curent
  const ctx = getCtx();
  const prev = ctx.filters || { base: null, special: null, naviera: null };

  // parse curent
  const sizeObj = parseSizeRich(userText);
  const nav = parseNavieraFromAnswer(userText); // string | null | undefined

  const next = {
    base: sizeObj.base ?? prev.base,
    special: sizeObj.special ?? prev.special,
    // atenție: parseNavieraFromAnswer => null = „fără preferință”,
    // undefined = „nu am înțeles nimic despre naviera”
    naviera: nav === undefined ? prev.naviera : nav,
  };
  saveCtx({ ...ctx, filters: next });

  logUI("PickLoad/INPUT", { userText, size: next, nav: next.naviera });

  // obligatoriu: naviera trebuie furnizată
  if (!next.naviera) {
    setMessages((m) => [
      ...m,
      {
        from: "bot",
        reply_text:
          "¿De qué naviera lo necesitas? (Maersk, MSC, Evergreen, Hapag, ONE, COSCO, CMA, HMM, ZIM, Yang Ming, Messina…) ",
      },
    ]);
    setAwaiting("pick_load_naviera");
    saveCtx({ ...ctx, step: "ask_naviera" });
    logUI("PickLoad/ASK_NAVIERA", next);
    return true;
  }

  // dacă avem naviera dar nu știm baza (ex.: doar „open top”)
  if (!next.base && next.special) {
    setMessages((m) => [
      ...m,
      { from: "bot", reply_text: "¿De qué base lo quieres: 20 o 40? (para el Open Top)" },
    ]);
    setAwaiting("pick_load_filters");
    saveCtx({ ...ctx, step: "ask_base" });
    return true;
  }

  // avem minim: naviera + (20/40/45) (special poate lipsi)
  try {
    const suggestion = await pickBestContainer(next);
    setAwaiting(null);
    saveCtx({ ...ctx, step: "suggested", lastSuggestion: suggestion || null });

    if (!suggestion) {
      setMessages((m) => [
        ...m,
        {
          from: "bot",
          reply_text:
            "No he encontrado un contenedor libre arriba con esos filtros. ¿Probamos otra combinación (tamaño/naviera)?",
        },
      ]);
      return true;
    }

    const { row } = suggestion;
    const pos = row.posicion ?? "—";
    const tipo = row.tipo ?? "—";
    const navieraLabel = row.naviera ?? "—";
    const code = row.matricula_contenedor ?? "—";
    const posSlug = encodeURIComponent(pos);

    setMessages((m) => [
      ...m,
      {
        from: "bot",
        reply_text: "¡Claro! Aquí tengo tu contenedor perfecto 👇",
        render: () => (
          <div className={styles.card}>
            <div className={styles.cardTitle}>Contenedor sugerido</div>
            <div style={{ fontSize: 14, lineHeight: 1.5, marginTop: 6 }}>
              <div>
                <strong>Código:</strong> {code}
              </div>
              <div>
                <strong>Posición:</strong> {pos}
              </div>
              <div>
                <strong>Tipo:</strong> {tipo}
              </div>
              <div>
                <strong>Naviera:</strong> {navieraLabel}
              </div>
              <div>
                <strong>Estado:</strong> {row.estado || "—"}
              </div>
            </div>
            <div className={styles.cardActions} style={{ marginTop: 10 }}>
              <a
                className={styles.actionBtn}
                href={`${MAP3D_ROUTE}?focus=${posSlug}`}
                data-focus={pos}
                title="Ver en mapa 3D"
              >
                Ver mapa 3D
              </a>
            </div>
          </div>
        ),
      },
    ]);

    logUI("PickLoad/SUGGESTED", { pos, code, tipo, naviera: navieraLabel });
  } catch (e) {
    logUI("PickLoad/ERROR", { error: e }, "error");
    setMessages((m) => [
      ...m,
      {
        from: "bot",
        reply_text: "No he podido buscar ahora mismo. Intenta de nuevo.",
      },
    ]);
  }

  return true;
}

/* ================================================================
 * 3) Algoritm: container „liber deasupra”, filtru tip flexibil
 * ================================================================ */
async function pickBestContainer({ base, special, naviera }) {
  // 1) candidați (numai vacíos)
  let q = supabase
    .from("contenedores")
    .select("id,matricula_contenedor,naviera,tipo,posicion,estado,created_at")
    .eq("estado", "vacio");

  // tip/dimensiune
  // 20, 20 OT, 40 bajo, 40 alto(HC), 40 OT, 45
  if (base === "45") {
    q = q.ilike("tipo", "45%");
  } else if (base === "20") {
    if (special === "ot") q = q.ilike("tipo", "%20%OT%");
    else q = q.ilike("tipo", "20%");
  } else if (base === "40") {
    if (special === "hc" || special === "alto") q = q.ilike("tipo", "%40HC%");
    else if (special === "ot") q = q.ilike("tipo", "%40%OT%");
    else if (special === "bajo") q = q.ilike("tipo", "40%").not.ilike("tipo", "%40HC%").not.ilike("tipo", "%OT%");
    else q = q.ilike("tipo", "40%"); // generic 40
  } else {
    // dacă nu avem bază, nu aplicăm filtru de tip (dar în practică cerem baza înainte)
  }

  // naviera (obligatorie în fluxul nostru)
  if (naviera) q = q.ilike("naviera", `%${naviera}%`);

  const { data: candidates, error } = await q.order("created_at", { ascending: true });
  if (error) throw error;

  logUI("PickLoad/SQL_RESULT", { candidates: candidates?.length || 0, base, special, naviera });

  // 2) citim toate pozițiile ocupate (pentru a verifica „deasupra”)
  const { data: all, error: e2 } = await supabase
    .from("contenedores")
    .select("posicion,matricula_contenedor,estado");
  if (e2) throw e2;

  const occupied = new Set((all || []).map((r) => String(r.posicion || "").trim().toUpperCase()));

  const parsePos = (p) => {
    const m = String(p || "").trim().toUpperCase().match(/^([A-F])(\d{1,2})([A-Z])$/);
    return m ? { row: m[1], col: m[2], level: m[3] } : null;
  };
  const abovePos = (p) => {
    const s = parsePos(p);
    if (!s) return null;
    const next = String.fromCharCode(s.level.charCodeAt(0) + 1);
    return `${s.row}${s.col}${next}`;
  };

  // 3) candidați fără nimic deasupra
  const freeTop = (candidates || []).filter((r) => {
    const pos = String(r.posicion || "").toUpperCase();
    const ap = abovePos(pos);
    return !ap || !occupied.has(ap);
  });

  if (!freeTop.length) return null;

  // 4) sortare: preferăm cei de pe nivel mai mare (mai „sus”)
  const levelRank = (p) => {
    const s = parsePos(p);
    return s ? s.level.charCodeAt(0) : 0;
  };
  freeTop.sort((a, b) => levelRank(b.posicion) - levelRank(a.posicion));

  return { row: freeTop[0] };
}
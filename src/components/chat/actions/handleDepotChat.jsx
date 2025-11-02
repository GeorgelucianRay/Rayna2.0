import React from "react";
import styles from "../Chatbot.module.css";
import { supabase } from "../../../supabaseClient";

// —————————— UTILS ——————————
/** Extrage codul de container din fraze cu spații/punctuație (ex: "HLBU 2196392") */
function extractContainerCode(input = "") {
  const compact = String(input).replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const m = compact.match(/[A-Z]{4}\d{7}/);
  return m ? m[0] : null;
}

/** Caută în toate tabelele posibile; întoarce primul hit. */
async function lookupContainer(code) {
  const tables = [
    "contenedores",
    "contenedores_rotos",
    "contenedores_programados",
    "contenedores_salidos",
  ];

  for (const t of tables) {
    // match strict
    let q = await supabase.from(t).select("*").eq("num_contenedor", code).maybeSingle();
    if (!q.error && q.data) return { data: q.data, table: t };

    // fallback ilike (dacă e salvat cu varianta "HLBU-2196392" etc)
    q = await supabase.from(t).select("*").ilike("num_contenedor", `%${code}%`).maybeSingle();
    if (!q.error && q.data) return { data: q.data, table: t };

    // fallback pentru coloane alternative
    q = await supabase.from(t).select("*").eq("codigo", code).maybeSingle();
    if (!q.error && q.data) return { data: q.data, table: t };
  }
  return { data: null, table: null };
}

/** Verifică dacă userul are voie (ca la GPS). Ajustează după rolurile tale. */
function hasDepotAccess(role = "") {
  const r = String(role).toLowerCase();
  return !["sofer", "șofer", "şofer", "driver"].includes(r);
}

// —————————— CARD UI ——————————
function ContainerCard({ code, table, row }) {
  const pos = row?.posicion ?? "—";
  const tipo = row?.tipo ?? row?.type ?? "—";
  const entrada = (row?.fecha_entrada || row?.created_at || "—")?.toString()?.slice(0, 10);
  const estado =
    row?.estado ??
    row?.status ??
    (table === "contenedores_rotos" ? "Roto" :
     table === "contenedores_programados" ? "Programado" :
     table === "contenedores_salidos" ? "Salido" : "En depósito");

  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>Contenedor {code}</div>
      <div style={{ fontSize: 14, lineHeight: 1.5, marginTop: 6, whiteSpace: "pre-line" }}>
        <div><strong>Posición:</strong> {pos}</div>
        <div><strong>Tipo:</strong> {tipo}</div>
        <div><strong>Estado:</strong> {estado}</div>
        <div><strong>Origen tabla:</strong> {table}</div>
        <div><strong>Entrada:</strong> {entrada}</div>
      </div>
      <div className={styles.cardActions} style={{ marginTop: 10 }}>
        {/* Pune aici butoane reale când ai rutele/fluxurile (programar, mover, sacar, etc.) */}
        <button className={styles.actionBtn} onClick={() => alert("Pendiente: cambiar posición")}>
          Cambiar posición
        </button>
        <button className={styles.actionBtn} onClick={() => alert("Pendiente: marcar hecho")}>
          Marcar hecho
        </button>
      </div>
    </div>
  );
}

// —————————— HANDLER ——————————
export default async function handleDepotChat({ userText, profile, setMessages }) {
  const code = extractContainerCode(userText);

  if (!code) {
    setMessages((m) => [
      ...m,
      { from: "bot", reply_text: "Necesito el número del contenedor (ej.: HLBU1234567)." },
    ]);
    return;
  }

  if (!hasDepotAccess(profile?.role)) {
    setMessages((m) => [...m, { from: "bot", reply_text: "No tienes acceso al Depot." }]);
    return;
  }

  const { data, table } = await lookupContainer(code);

  if (!data) {
    setMessages((m) => [
      ...m,
      { from: "bot", reply_text: `No he encontrado el contenedor **${code}** en el depósito.` },
    ]);
    return;
  }

  setMessages((m) => [
    ...m,
    {
      from: "bot",
      reply_text: `Contenedor **${code}** encontrado.`,
      render: () => <ContainerCard code={code} table={table} row={data} />,
    },
  ]);
}
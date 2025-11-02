// src/components/chat/actions/handleDepotChat.jsx
import React from "react";
import styles from "../Chatbot.module.css";
import { supabase } from "../../../supabaseClient";

/** ——— Utils ——— */
export function extractContainerCode(input = "") {
  const compact = String(input).replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const m = compact.match(/[A-Z]{4}\d{7}/);
  return m ? m[0] : null;
}

function normalizeCode(code = "") {
  return String(code).replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

/** Caută în toate tabelele, pe coloana CORECTĂ: matricula_contenedor */
async function lookupContainer(codeRaw) {
  const code = normalizeCode(codeRaw);
  const tables = [
    "contenedores",
    "contenedores_rotos",
    "contenedores_programados",
    "contenedores_salidos",
  ];

  for (const t of tables) {
    // match exact
    let q = await supabase.from(t).select("*")
      .eq("matricula_contenedor", code)
      .maybeSingle();
    if (!q.error && q.data) return { data: q.data, table: t };

    // fallback ilike (dacă a fost salvat cu spații / cratime)
    q = await supabase.from(t).select("*")
      .ilike("matricula_contenedor", `%${code}%`)
      .maybeSingle();
    if (!q.error && q.data) return { data: q.data, table: t };
  }
  return { data: null, table: null };
}

/** Acces (ajustează dacă vrei și șoferii) */
function hasDepotAccess(role = "") {
  const r = String(role).toLowerCase();
  return !["sofer","șofer","şofer","driver"].includes(r);
}

/** ——— UI card ——— */
function ContainerCard({ code, table, row }) {
  const pos = row?.posicion ?? "—";
  const tipo = row?.tipo ?? "—";
  const entrada = (row?.created_at || row?.fecha_entrada || "—").toString().slice(0,10);
  const estado =
    row?.estado ??
    (table === "contenedores_rotos" ? "Roto" :
     table === "contenedores_programados" ? "Programado" :
     table === "contenedores_salidos" ? "Salido" : "En depósito");

  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>Contenedor {code}</div>
      <div style={{ fontSize: 14, lineHeight: 1.5, marginTop: 6 }}>
        <div><strong>Posición:</strong> {pos}</div>
        <div><strong>Tipo:</strong> {tipo}</div>
        <div><strong>Estado:</strong> {estado}</div>
        <div><strong>Origen tabla:</strong> {table}</div>
        <div><strong>Entrada:</strong> {entrada}</div>
      </div>
    </div>
  );
}

/** ——— Handler ——— */
export default async function handleDepotChat({ userText, profile, setMessages }) {
  const code = extractContainerCode(userText);

  if (!code) {
    setMessages(m => [...m, { from: "bot", reply_text: "Necesito el número del contenedor (ej.: HLBU1234567)." }]);
    return;
  }
  if (!hasDepotAccess(profile?.role)) {
    setMessages(m => [...m, { from: "bot", reply_text: "No tienes acceso al Depot." }]);
    return;
  }

  const { data, table } = await lookupContainer(code);

  if (!data) {
    setMessages(m => [
      ...m,
      { from: "bot", reply_text: `No he encontrado el contenedor **${code}** en el depósito.` },
    ]);
    return;
  }

  setMessages(m => [
    ...m,
    {
      from: "bot",
      reply_text: `Contenedor **${code}** encontrado.`,
      render: () => <ContainerCard code={code} table={table} row={data} />,
    },
  ]);
}
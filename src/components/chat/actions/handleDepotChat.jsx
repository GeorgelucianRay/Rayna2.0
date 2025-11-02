import React from "react";
import { supabase } from "../../../supabaseClient";
import styles from "../Chatbot.module.css";

/** Extrage cod BIC: 4 litere + 7 cifre; tolerează bold **, spațiu sau '-' */
function extractContainerCode(raw) {
  if (!raw) return null;
  const txt = String(raw)
    .replace(/\*\*/g, "")       // scoate **bold**
    .replace(/[()]/g, " ")      // paranteze → spațiu
    .toUpperCase();

  // permite HLBU-2196392 sau HLBU 2196392 sau HLBU2196392
  const m = txt.match(/\b([A-Z]{4})[ -]?(\d{7})\b/);
  if (!m) return null;
  return `${m[1]}${m[2]}`; // lipit fără separatori
}

async function findContainerAnyTable(code) {
  const tables = [
    "contenedores",
    "contenedores_rotos",
    "contenedores_programados",
    "contenedores_salidos",
  ];

  // încercăm coloane uzuale
  const columns = [
    "num_contenedor", "numero_contenedor",
    "matricula", "placa",
    "code", "codigo"
  ];

  for (const table of tables) {
    // 1) încercare exactă (eq) pe coloane cunoscute
    for (const col of columns) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq(col, code)
        .maybeSingle();

      if (error) {
        // dacă RLS blochează, raportăm clar
        return { error: `Permisos/RLS (${table}): ${error.message}` };
      }
      if (data) return { data, table };
    }

    // 2) fallback: ilike %CODE% pe coloane cunoscute
    const orExpr = columns.map((c) => `${c}.ilike.%${code}%`).join(",");
    const { data: list, error: err2 } = await supabase
      .from(table)
      .select("*")
      .or(orExpr)
      .limit(1);

    if (err2) {
      return { error: `Permisos/RLS (${table}): ${err2.message}` };
    }
    if (list && list.length) return { data: list[0], table };
  }

  return { data: null, table: null };
}

function pick(any, ...keys) {
  for (const k of keys) {
    const v = any?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return null;
}

export default async function handleDepotChat({ userText, profile, setMessages }) {
  const code = extractContainerCode(userText);

  if (!code) {
    setMessages((m) => [
      ...m,
      {
        from: "bot",
        reply_text:
          "Necesito el **número del contenedor** (ej.: HLBU1234567). Puedes escribirlo junto cu fraza: «Dónde está **HLBU1234567**».",
      },
    ]);
    return;
  }

  // filtrare rol minim (șoferii nu au acces)
  const role = (profile?.role || "").toLowerCase();
  if (role === "sofer" || role === "șofer" || role === "şofer" || role === "driver") {
    setMessages((m) => [
      ...m,
      { from: "bot", reply_text: "Lo siento, no tienes acceso al módulo Depot." },
    ]);
    return;
  }

  // căutare
  const { data, table, error } = await findContainerAnyTable(code);

  if (error) {
    setMessages((m) => [
      ...m,
      { from: "bot", reply_text: `No he podido consultar el depósito: ${error}` },
    ]);
    return;
  }

  if (!data) {
    setMessages((m) => [
      ...m,
      {
        from: "bot",
        reply_text: `No he encontrado el contenedor **${code}** en el depósito.`,
      },
    ]);
    return;
  }

  // câmpuri posibile
  const pos   = pick(data, "posicion", "posición", "position", "posicion_txt") || "—";
  const tipo  = pick(data, "tipo", "type") || "—";
  const fecha = pick(data, "fecha_entrada", "fecha", "created_at") || "—";
  const linea = pick(data, "naviera", "linea", "shipping_line") || "—";

  // card simplu
  setMessages((m) => [
    ...m,
    {
      from: "bot",
      reply_text: "",
      render: () => (
        <div className={styles.card} style={{ padding: 12 }}>
          <div className={styles.cardTitle}>Contenedor {code}</div>
          <div className={styles.cardBody}>
            <div>Tabla: <b>{table}</b></div>
            <div>Posición: <b>{pos}</b></div>
            <div>Tipo: <b>{tipo}</b></div>
            <div>Fecha entrada: <b>{String(fecha).slice(0,10)}</b></div>
            {linea ? <div>Naviera: <b>{linea}</b></div> : null}
          </div>
        </div>
      ),
    },
  ]);
}

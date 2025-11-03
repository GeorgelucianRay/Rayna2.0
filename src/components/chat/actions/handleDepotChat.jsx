// src/components/chat/actions/handleDepotChat.jsx
import React from "react";
import styles from "../Chatbot.module.css";
import { supabase } from "../../../supabaseClient";

/* ——— Mini helper pentru log vizibil în UI (ErrorTray) ——— */
function logUI(title, data, level = "info") {
  try {
    if (window.__raynaLog) window.__raynaLog(title, data, level);
  } catch {}
}

/** ——— Utils ——— */
export function extractContainerCode(input = "") {
  const compact = String(input).replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const m = compact.match(/[A-Z]{4}\d{7}/);
  return m ? m[0] : null;
}

function normalizeCode(code = "") {
  return String(code).replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

/** Acces (ajustează dacă vrei și șoferii) */
function hasDepotAccess(role = "") {
  const r = String(role).toLowerCase();
  return !["sofer", "șofer", "şofer", "driver"].includes(r);
}

/** ——— UI card ——— */
function ContainerCard({ code, table, row }) {
  const pos = row?.posicion ?? "—";
  const tipo = row?.tipo ?? "—";
  const entrada = (row?.created_at || row?.fecha_entrada || "—")
    .toString()
    .slice(0, 10);
  const estado =
    row?.estado ??
    (table === "contenedores_rotos"
      ? "Roto"
      : table === "contenedores_programados"
      ? "Programado"
      : table === "contenedores_salidos"
      ? "Salido"
      : "En depósito");

  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>Contenedor {code}</div>
      <div style={{ fontSize: 14, lineHeight: 1.5, marginTop: 6 }}>
        <div>
          <strong>Posición:</strong> {pos}
        </div>
        <div>
          <strong>Tipo:</strong> {tipo}
        </div>
        <div>
          <strong>Estado:</strong> {estado}
        </div>
        <div>
          <strong>Origen tabla:</strong> {table}
        </div>
        <div>
          <strong>Entrada:</strong> {entrada}
        </div>
      </div>
    </div>
  );
}

/** ——— Lookup în toate tabelele, pe coloana CORECTĂ ———
 *  Loghează fiecare pas (START/OK/ERROR/NOT_FOUND) în ErrorTray.
 */
async function lookupContainer(codeRaw) {
  const code = normalizeCode(codeRaw);
  const tables = [
    "contenedores",
    "contenedores_rotos",
    "contenedores_programados",
    "contenedores_salidos",
  ];

  logUI("DepotChat/lookup:START", { code, tables });

  for (const t of tables) {
    // 1) match exact
    try {
      logUI("DepotChat/query:EXACT", { table: t, col: "matricula_contenedor", eq: code });
      let res = await supabase
        .from(t)
        .select("*")
        .eq("matricula_contenedor", code)
        .maybeSingle();

      if (res.error) {
        logUI("DepotChat/query:ERROR", { table: t, mode: "exact", error: res.error }, "error");
      } else if (res.data) {
        logUI("DepotChat/query:FOUND", { table: t, mode: "exact", row: res.data });
        return { data: res.data, table: t };
      }

      // 2) fallback ilike (dacă a fost salvat cu spații/cratime)
      logUI("DepotChat/query:ILIKE", { table: t, pattern: `%${code}%` });
      res = await supabase
        .from(t)
        .select("*")
        .ilike("matricula_contenedor", `%${code}%`)
        .maybeSingle();

      if (res.error) {
        logUI("DepotChat/query:ERROR", { table: t, mode: "ilike", error: res.error }, "error");
      } else if (res.data) {
        logUI("DepotChat/query:FOUND", { table: t, mode: "ilike", row: res.data });
        return { data: res.data, table: t };
      }
    } catch (e) {
      logUI("DepotChat/query:EXCEPTION", { table: t, message: e?.message, stack: e?.stack }, "error");
      // continuăm cu următorul tabel, nu aruncăm
    }
  }

  logUI("DepotChat/lookup:NOT_FOUND", { code });
  return { data: null, table: null };
}

/** ——— Handler ——— */
export default async function handleDepotChat({ userText, profile, setMessages }) {
  logUI("DepotChat/handle:INPUT", { userText, role: profile?.role });

  const code = extractContainerCode(userText);
  logUI("DepotChat/extractCode", { userText, code });

  if (!code) {
    setMessages((m) => [
      ...m,
      { from: "bot", reply_text: "Necesito el número del contenedor (ej.: HLBU1234567)." },
    ]);
    logUI("DepotChat/deny", { reason: "no-code" }, "warn");
    return;
  }

  if (!hasDepotAccess(profile?.role)) {
    setMessages((m) => [...m, { from: "bot", reply_text: "No tienes acceso al Depot." }]);
    logUI("DepotChat/deny", { reason: "no-access", role: profile?.role }, "warn");
    return;
  }

  try {
    const { data, table } = await lookupContainer(code);

    if (!data) {
      setMessages((m) => [
        ...m,
        { from: "bot", reply_text: `No he encontrado el contenedor **${code}** en el depósito.` },
      ]);
      // deja s-a logat NOT_FOUND în lookup, dar mai punem un marker
      logUI("DepotChat/result", { code, found: false });
      return;
    }

    logUI("DepotChat/result", { code, found: true, table });
    setMessages((m) => [
      ...m,
      {
        from: "bot",
        reply_text: `Contenedor **${code}** encontrado.`,
        render: () => <ContainerCard code={code} table={table} row={data} />,
      },
    ]);
  } catch (e) {
    // Fail-safe: prinde orice excepție neprevăzută
    logUI("DepotChat/handle:ERROR", { message: e?.message, stack: e?.stack }, "error");
    setMessages((m) => [
      ...m,
      { from: "bot", reply_text: "Lo siento, ha ocurrido un error consultando el contenedor." },
    ]);
  }
}
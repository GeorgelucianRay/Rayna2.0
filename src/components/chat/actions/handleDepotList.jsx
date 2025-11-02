// src/components/chat/actions/handleDepotList.jsx
import React from "react";
import styles from "../Chatbot.module.css";
import { supabase } from "../../../supabaseClient";

/* =========================
   UTILITARE
   ========================= */

// normalizare simplă (fără diacritice, lower)
function norm(s = "") {
  return String(s)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

// extrage intenția de listă din textul liber
function parseRequest(userText = "") {
  const t = norm(userText);

  // categoria principală
  let kind = "todos";
  if (/\bprogramad/.test(t)) kind = "programados";
  else if (/\brot[oa]s?\b|\bdefect/.test(t)) kind = "rotos";
  else if (/\blleno[s]?\b/.test(t)) kind = "llenos";
  else if (/\bvacio[s]?\b/.test(t)) kind = "vacios";

  // tip (20/40)
  let tipo = null;
  if (/\b20\b/.test(t)) tipo = "20";
  if (/\b40\b/.test(t)) tipo = "40";

  // naviera (după „de …” sau din listă cunoscută)
  let naviera = null;
  const m = userText.match(/\bde\s+([A-Za-z][\w\s-]{2,})/i);
  if (m) naviera = m[1].trim();
  const known = ["MAERSK","MSC","HAPAG","HMM","ONE","COSCO","EVERGREEN","CMA","YANG MING","ZIM"];
  if (!naviera) {
    for (const k of known) {
      if (norm(userText).includes(norm(k))) { naviera = k; break; }
    }
  }

  return { kind, tipo, naviera };
}

// construiește expresie .or pentru supabase (ILIKE)
function orIlike(column, startsWith, contains) {
  const parts = [];
  if (startsWith) parts.push(`${column}.ilike.${startsWith}%`);
  if (contains)   parts.push(`${column}.ilike.%${contains}%`);
  return parts.join(",");
}

/* =========================
   INTEROGĂRI DB (robuste)
   ========================= */

async function qContenedores({ estado, tipo, naviera }) {
  let q = supabase.from("contenedores").select("*");

  if (estado) q = q.eq("estado", estado); // 'vacio' | 'lleno'
  if (tipo)   q = q.or(orIlike("tipo", tipo, tipo)); // '40%', '20%', etc.
  if (naviera) q = q.or(orIlike("naviera", naviera, naviera));

  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function qProgramados({ tipo, naviera }) {
  let q = supabase.from("contenedores_programados").select("*");
  if (tipo)    q = q.or(orIlike("tipo", tipo, tipo));
  if (naviera) q = q.or(orIlike("naviera", naviera, naviera));
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function qRotos({ tipo, naviera }) {
  let q = supabase.from("contenedores_rotos").select("*");
  if (tipo)    q = q.or(orIlike("tipo", tipo, tipo));
  if (naviera) q = q.or(orIlike("naviera", naviera, naviera));
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

/* =========================
   EXCEL (CSV download)
   ========================= */

function toCSV(rows) {
  const header = [
    "Contenedor",
    "Naviera",
    "Tipo",
    "Posición",
    "Estado/Empresa",
    "Fecha entrada",
  ];
  const lines = [header.join(",")];

  for (const r of rows) {
    const num = r.num_contenedor ?? r.codigo ?? "";
    const nav = r.naviera ?? "";
    const tip = r.tipo ?? "";
    const pos = r.posicion ?? "";
    const est = r.estado ?? r.empresa ?? "";
    const fecha = (r.fecha_entrada || r.created_at || "").toString().slice(0, 10);
    lines.push(
      [num, nav, tip, pos, est, fecha]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
  }
  return lines.join("\n");
}

function downloadCSVFile(rows, title = "lista_contenedores") {
  const csv = toCSV(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* =========================
   TABEL UI
   ========================= */

function TableList({ rows, subtitle }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>Lista contenedores</div>
      <div style={{ opacity: 0.7, marginTop: 2 }}>{subtitle}</div>

      <div style={{ overflowX: "auto", marginTop: 10 }}>
        <table className={styles.table} style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Contenedor</th>
              <th>Naviera</th>
              <th>Tipo</th>
              <th>Posición</th>
              <th>Estado/Empresa</th>
              <th>Entrada</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const num = r.num_contenedor ?? r.codigo ?? "";
              const nav = r.naviera ?? "";
              const tip = r.tipo ?? "";
              const pos = r.posicion ?? "";
              const est = r.estado ?? r.empresa ?? "";
              const fecha = (r.fecha_entrada || r.created_at || "").toString().slice(0, 10);
              return (
                <tr key={i}>
                  <td>{num}</td>
                  <td>{nav}</td>
                  <td>{tip}</td>
                  <td>{pos}</td>
                  <td>{est}</td>
                  <td>{fecha}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.cardActions} style={{ marginTop: 12 }}>
        <button
          className={styles.actionBtn}
          onClick={() => downloadCSVFile(rows, "lista_contenedores")}
        >
          Descargar Excel
        </button>
      </div>
    </div>
  );
}

/* =========================
   HANDLER PRINCIPAL
   ========================= */

export default async function handleDepotList({ userText, setMessages }) {
  // 1) parse cererea
  const { kind, tipo, naviera } = parseRequest(userText);

  // 2) rulează query corect
  let rows = [];
  try {
    if (kind === "programados") {
      rows = await qProgramados({ tipo, naviera });
    } else if (kind === "rotos") {
      rows = await qRotos({ tipo, naviera });
    } else if (kind === "llenos") {
      rows = await qContenedores({ estado: "lleno", tipo, naviera });
    } else if (kind === "vacios") {
      rows = await qContenedores({ estado: "vacio", tipo, naviera });
    } else {
      // „todos” – doar tabela principală (în depozit)
      rows = await qContenedores({ estado: null, tipo, naviera });
    }
  } catch (e) {
    console.error("[handleDepotList] DB error:", e);
    setMessages((m) => [...m, { from: "bot", reply_text: "No he podido leer la lista ahora." }]);
    return;
  }

  // 3) fără rezultate
  if (!rows.length) {
    const filtros = [
      kind !== "todos" ? kind : null,
      tipo ? `${tipo}` : null,
      naviera ? naviera : null,
    ]
      .filter(Boolean)
      .join(" · ");
    setMessages((m) => [
      ...m,
      { from: "bot", reply_text: `No hay resultados para: ${filtros || "todos"}.` },
    ]);
    return;
  }

  // 4) afișează tabelul + export
  const subtitle = [
    kind !== "todos" ? kind : "todos",
    new Date().toLocaleDateString(),
  ].join(" · ");

  setMessages((m) => [
    ...m,
    {
      from: "bot",
      reply_text: "Aquí tienes la lista.",
      render: () => <TableList rows={rows} subtitle={subtitle} />,
    },
  ]);
}
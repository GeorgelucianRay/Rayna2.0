// src/components/chat/actions/handleDepotList.jsx
import React from "react";
import styles from "../Chatbot.module.css";
import { supabase } from "../../../supabaseClient";
import { parseDepotFilters } from "./depot/parseDepotFilters";

// ————— Helpers pentru query —————
function likeTipo(q, size) {
  if (!size) return q;
  if (size === "40hc") return q.ilike("tipo", "%40HC%");
  if (size === "40")   return q.ilike("tipo", "40%");
  if (size === "20")   return q.ilike("tipo", "20%");
  return q;
}
function likeNaviera(q, naviera) {
  if (!naviera) return q;
  return q.ilike("naviera", `%${naviera}%`);
}

// ————— Interogări —————
async function qContenedores({ estado, size, naviera }) {
  let q = supabase.from("contenedores")
    .select("id, created_at, matricula_contenedor, naviera, tipo, posicion, estado");
  if (estado) q = q.eq("estado", estado);               // "vacio" | "lleno"
  q = likeTipo(q, size);
  q = likeNaviera(q, naviera);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
async function qProgramados({ size, naviera }) {
  let q = supabase.from("contenedores_programados")
    .select("id, created_at, matricula_contenedor, naviera, tipo, posicion, empresa_descarga, fecha, hora, matricula_camion, estado");
  q = likeTipo(q, size);
  q = likeNaviera(q, naviera);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
async function qRotos({ size, naviera }) {
  // în fișierul tău e select('*'); păstrăm coloanele importante dacă există
  let q = supabase.from("contenedores_rotos").select("*");
  q = likeTipo(q, size);
  q = likeNaviera(q, naviera);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// ————— Export CSV (Excel deschide ok) —————
function toCSV(rows) {
  const header = [
    "Contenedor","Naviera","Tipo","Posición","Estado/Empresa","Entrada/Fecha"
  ];
  const lines = [header.join(",")];

  for (const r of rows) {
    const num   = r.matricula_contenedor ?? r.codigo ?? "";
    const nav   = r.naviera ?? "";
    const tip   = r.tipo ?? "";
    const pos   = r.posicion ?? "";
    const est   = (r.estado ?? r.empresa_descarga ?? "").toString();
    const fecha = (r.fecha || r.created_at || "").toString().slice(0, 10);
    lines.push(
      [num, nav, tip, pos, est, fecha].map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")
    );
  }
  return lines.join("\n");
}
function downloadCSV(rows, title = "lista_contenedores") {
  const blob = new Blob([toCSV(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ————— UI —————
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
              <th>Entrada/Fecha</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const num   = r.matricula_contenedor ?? r.codigo ?? "";
              const nav   = r.naviera ?? "";
              const tip   = r.tipo ?? "";
              const pos   = r.posicion ?? "";
              const est   = r.estado ?? r.empresa_descarga ?? "";
              const fecha = (r.fecha || r.created_at || "").toString().slice(0, 10);
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
          onClick={() => downloadCSV(rows, "lista_contenedores")}
        >
          Descargar Excel
        </button>
      </div>
    </div>
  );
}

// ————— HANDLER —————
export default async function handleDepotList({ userText, setMessages }) {
  const { kind, estado, size, naviera, wantExcel } = parseDepotFilters(userText);

  // dacă e număr exact -> e query punctual, nu listă
  if (kind === "single") {
    setMessages(m => [...m, { from:"bot", reply_text: "Veo un número de contenedor. Para listas, dime: «lista de contenedores vacíos 40 Maersk», por ejemplo." }]);
    return;
  }

  // traducere estado -> tabel/filtru
  let rows = [];
  try {
    if (estado === "programado") {
      rows = await qProgramados({ size, naviera });
    } else if (estado === "roto") {
      rows = await qRotos({ size, naviera });
    } else if (estado === "vacio" || estado === "lleno") {
      rows = await qContenedores({ estado, size, naviera });
    } else {
      // fără estado -> doar „contenedores” (în depozit), cu size/naviera dacă au fost spuse
      rows = await qContenedores({ estado: null, size, naviera });
    }
  } catch (e) {
    console.error("[handleDepotList] DB error:", e);
    setMessages(m => [...m, { from:"bot", reply_text: "No he podido leer la lista ahora." }]);
    return;
  }

  const sub = [
    estado || "todos",
    size || "all-sizes",
    naviera || "todas navieras",
    new Date().toLocaleDateString(),
  ].join(" · ");

  if (!rows.length) {
    setMessages(m => [...m, { from:"bot", reply_text: `No hay resultados para: ${sub}.` }]);
    return;
  }

  // dacă a cerut Excel direct și avem rows
  if (wantExcel) {
    // randăm totuși și tabelul ca confirmare; butonul descarcă CSV
    setMessages(m => [
      ...m,
      { from:"bot", reply_text:"Generando Excel…"},
      { from:"bot", reply_text:"Aquí tienes la lista.", render: () => <TableList rows={rows} subtitle={sub} /> }
    ]);
    return;
  }

  // listă normală
  setMessages(m => [
    ...m,
    { from:"bot", reply_text:"Aquí tienes la lista.", render: () => <TableList rows={rows} subtitle={sub} /> }
  ]);
}
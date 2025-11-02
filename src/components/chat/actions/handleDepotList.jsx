// src/components/chat/actions/handleDepotList.jsx
import React from "react";
import styles from "../Chatbot.module.css";
import { supabase } from "../../../supabaseClient";
import { parseDepotFilters } from "./depot/parseDepotFilters";

// ——— Helpers pentru filtre DB ———
function applyTipo(q, size) {
  if (!size) return q;
  if (size === "40hc") {
    // 40HC / 40 HC / 40 Alto
    return q.or("tipo.ilike.%40HC%,tipo.ilike.%40 HC%,tipo.ilike.%40 Alto%");
  }
  if (size === "40") {
    // 40 / 40 Alto / 40 Bajo (nu HC – deja prins mai sus)
    return q.or("tipo.ilike.40%,tipo.ilike.% 40%,tipo.ilike.%40 Bajo%");
  }
  if (size === "20") {
    return q.or("tipo.ilike.20%,tipo.ilike.% 20%");
  }
  return q;
}
function applyNaviera(q, naviera) {
  return naviera ? q.ilike("naviera", `%${naviera}%`) : q;
}

// ——— Query-uri (coloane EXACT ca în schema ta) ———
async function qContenedores({ estado, size, naviera }) {
  let q = supabase
    .from("contenedores")
    .select("id, created_at, matricula_contenedor, naviera, tipo, posicion, estado, matricula_camion");
  if (estado) q = q.eq("estado", estado);    // 'vacio' | 'lleno'
  q = applyTipo(q, size);
  q = applyNaviera(q, naviera);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
async function qProgramados({ size, naviera }) {
  let q = supabase
    .from("contenedores_programados")
    .select("id, created_at, matricula_contenedor, naviera, tipo, posicion, empresa_descarga, fecha, hora, matricula_camion, estado");
  q = applyTipo(q, size);
  q = applyNaviera(q, naviera);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
async function qRotos({ size, naviera }) {
  let q = supabase
    .from("contenedores_rotos")
    .select("id, created_at, matricula_contenedor, naviera, tipo, posicion, matricula_camion, detalles");
  q = applyTipo(q, size);
  q = applyNaviera(q, naviera);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// ——— Export CSV (Excel îl deschide ok) ———
function toCSV(rows) {
  const header = ["Contenedor","Naviera","Tipo","Posición","Estado/Empresa","Fecha/Entrada"];
  const lines = [header.join(",")];
  for (const r of rows) {
    const num = r.matricula_contenedor ?? "";
    const nav = r.naviera ?? "";
    const tip = r.tipo ?? "";
    const pos = r.posicion ?? "";
    const est = r.estado ?? r.empresa_descarga ?? "";
    const fecha = (r.fecha || r.created_at || "").toString().slice(0, 10);
    lines.push([num, nav, tip, pos, est, fecha].map(v => `"${String(v).replace(/"/g,'""')}"`).join(","));
  }
  return lines.join("\n");
}
function downloadCSV(rows, title = "lista_contenedores") {
  const blob = new Blob([toCSV(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${title}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// ——— UI ———
function TableList({ rows, subtitle }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>Lista contenedores</div>
      <div style={{ opacity:.7, marginTop:2 }}>{subtitle}</div>
      <div style={{ overflowX:"auto", marginTop:10 }}>
        <table className={styles.table} style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr>
              <th>Contenedor</th><th>Naviera</th><th>Tipo</th>
              <th>Posición</th><th>Estado/Empresa</th><th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={i}>
                <td>{r.matricula_contenedor}</td>
                <td>{r.naviera}</td>
                <td>{r.tipo}</td>
                <td>{r.posicion}</td>
                <td>{r.estado ?? r.empresa_descarga ?? ""}</td>
                <td>{(r.fecha || r.created_at || "").toString().slice(0,10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.cardActions} style={{ marginTop:12 }}>
        <button className={styles.actionBtn} onClick={() => downloadCSV(rows)}>
          Descargar Excel
        </button>
      </div>
    </div>
  );
}

// ——— Handler ———
export default async function handleDepotList({ userText, setMessages }) {
  const { kind, estado, size, naviera, wantExcel } = parseDepotFilters(userText);

  if (kind === "single") {
    setMessages(m => [...m, { from:"bot", reply_text:
      "Eso parece un número de contenedor. Para listas, dime: «lista vacíos 40 Maersk», por ejemplo."
    }]);
    return;
  }

  try {
    let rows = [];
    if (estado === "programado") rows = await qProgramados({ size, naviera });
    else if (estado === "roto")  rows = await qRotos({ size, naviera });
    else if (estado === "vacio" || estado === "lleno")
      rows = await qContenedores({ estado, size, naviera });
    else
      rows = await qContenedores({ estado: null, size, naviera });

    const sub = [
      estado || "todos",
      size || "all-sizes",
      naviera || "todas navieras",
      new Date().toLocaleDateString()
    ].join(" · ");

    if (!rows.length) {
      setMessages(m => [...m, { from:"bot", reply_text:`No hay resultados para: ${sub}.` }]);
      return;
    }

    // show
    setMessages(m => [
      ...m,
      { from:"bot", reply_text:"Aquí tienes la lista.", render: () => <TableList rows={rows} subtitle={sub} /> }
    ]);

    if (wantExcel) {
      // descarcă după ce randează (UX mai clar)
      setTimeout(() => downloadCSV(rows), 100);
    }
  } catch (e) {
    console.error("[handleDepotList] DB error:", e);
    setMessages(m => [...m, { from:"bot", reply_text:`No he podido leer la lista ahora. (${e?.message || e})` }]);
  }
}
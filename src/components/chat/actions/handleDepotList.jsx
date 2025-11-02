// src/components/chat/actions/handleDepotList.jsx
import React from "react";
import styles from "../Chatbot.module.css";
import { supabase } from "../../../supabaseClient";
import { parseDepotFilters } from "./depot/parseDepotFilters";

// ——— helpers
function likeTipo(q, size) {
  if (!size) return q;
  if (size === "40hc") return q.ilike("tipo", "40HC%");   // dacă salvezi așa
  if (size === "40")   return q.ilike("tipo", "40%");     // "40 Alto", "40 Bajo", "40HC" etc.
  if (size === "20")   return q.ilike("tipo", "20%");
  return q;
}
function likeNaviera(q, naviera) {
  if (!naviera) return q;
  return q.ilike("naviera", `%${naviera}%`);
}

// ——— queries
async function qContenedores({ estado, size, naviera }) {
  let q = supabase.from("contenedores")
    .select("id, fecha_entrada, created_at, matricula_contenedor, naviera, tipo, posicion, estado");
  if (estado) q = q.eq("estado", estado); // 'vacio' | 'lleno'
  q = likeTipo(q, size);
  q = likeNaviera(q, naviera);
  const { data, error } = await q.order("fecha_entrada", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function qProgramados({ size, naviera }) {
  let q = supabase.from("contenedores_programados")
    .select("id, created_at, fecha, hora, matricula_contenedor, naviera, tipo, posicion, empresa_descarga, estado, matricula_camion");
  q = likeTipo(q, size);
  q = likeNaviera(q, naviera);
  const { data, error } = await q.order("fecha", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function qRotos({ size, naviera }) {
  let q = supabase.from("contenedores_rotos")
    .select("id, created_at, matricula_contenedor, naviera, tipo, posicion, estado, empresa"); // 'empresa' la rotos
  q = likeTipo(q, size);
  q = likeNaviera(q, naviera);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// ——— export CSV
function toCSV(rows) {
  const header = ["Contenedor","Naviera","Tipo","Posición","Estado/Empresa","Entrada/Fecha"];
  const lines = [header.join(",")];

  for (const r of rows) {
    const num   = r.matricula_contenedor ?? r.codigo ?? "";
    const nav   = r.naviera ?? "";
    const tip   = r.tipo ?? "";
    const pos   = r.posicion ?? "";
    const est   = r.estado ?? r.empresa_descarga ?? r.empresa ?? "";
    const fecha = (r.fecha_entrada || r.fecha || r.created_at || "").toString().slice(0,10);
    lines.push([num,nav,tip,pos,est,fecha].map(v => `"${String(v).replace(/"/g,'""')}"`).join(","));
  }
  return lines.join("\n");
}
function downloadCSV(rows, title="lista_contenedores"){
  const blob = new Blob([toCSV(rows)], { type:"text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${title}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// ——— UI
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
              <th>Posición</th><th>Estado/Empresa</th><th>Entrada/Fecha</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i) => {
              const num   = r.matricula_contenedor ?? r.codigo ?? "";
              const nav   = r.naviera ?? "";
              const tip   = r.tipo ?? "";
              const pos   = r.posicion ?? "";
              const est   = r.estado ?? r.empresa_descarga ?? r.empresa ?? "";
              const fecha = (r.fecha_entrada || r.fecha || r.created_at || "").toString().slice(0,10);
              return (
                <tr key={i}>
                  <td>{num}</td><td>{nav}</td><td>{tip}</td>
                  <td>{pos}</td><td>{est}</td><td>{fecha}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.cardActions} style={{ marginTop:12 }}>
        <button className={styles.actionBtn} onClick={() => downloadCSV(rows, "lista_contenedores")}>
          Descargar Excel
        </button>
      </div>
    </div>
  );
}

// ——— handler
export default async function handleDepotList({ userText, setMessages }) {
  const { kind, estado, size, naviera, wantExcel } = parseDepotFilters(userText);

  if (kind === "single") {
    setMessages(m => [...m, { from:"bot", reply_text:"Veo un número de contenedor. Para listas, dime: «lista de contenedores vacíos 40 Maersk»." }]);
    return;
  }

  let rows = [];
  try {
    if (estado === "programado")       rows = await qProgramados({ size, naviera });
    else if (estado === "roto")        rows = await qRotos({ size, naviera });
    else if (estado === "vacio" || estado === "lleno")
                                      rows = await qContenedores({ estado, size, naviera });
    else                               rows = await qContenedores({ estado:null, size, naviera });
  } catch (e) {
    console.error("[handleDepotList] DB error:", e);
    setMessages(m => [...m, { from:"bot", reply_text:"No he podido leer la lista ahora." }]);
    return;
  }

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

  setMessages(m => [
    ...m,
    { from:"bot", reply_text:"Aquí tienes la lista.", render: () => <TableList rows={rows} subtitle={sub} /> }
  ]);

  if (wantExcel) {
    // utilizatorul apasă oricum butonul; mesaj opțional:
    setMessages(m => [...m, { from:"bot", reply_text:"Pulsa «Descargar Excel» para obtener el archivo." }]);
  }
}
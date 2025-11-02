// src/components/chat/actions/handleDepotList.jsx
import React from "react";
import styles from "../Chatbot.module.css";
import { supabase } from "../../../supabaseClient";

// ———————————————————— parsing fără pretenții ————————————————————
const NAVIERAS = ["MAERSK","MSC","HAPAG","CMA","EVERGREEN","ONE","HAMBURG","COSCO","ZIM","YANG","ARKAS","SEAGO","HPL","HAPAG-LLOYD"];
const SIZES = ["20","40"];

function norm(s=""){ return s.normalize("NFD").replace(/\p{Diacritic}/gu,"").toLowerCase(); }

function parseFilters(txt="") {
  const t = norm(txt);
  const filters = { list:"contenedores", naviera:null, size:null };

  // tip listă
  if (/(roto|rotos|defect|defecte)/.test(t)) filters.list = "contenedores_rotos";
  else if (/(programad|planificad)/.test(t)) filters.list = "contenedores_programados";
  else filters.list = "contenedores"; // “vacío/lleno/naviera” trăiesc aici

  // categoria vacío (doar pt. contenedores)
  filters.onlyVacio = /(vacio|vac\u00EDo)/.test(t);

  // naviera
  const up = txt.toUpperCase();
  for (const n of NAVIERAS) if (up.includes(n)) { filters.naviera = n; break; }

  // size
  for (const s of SIZES) if (t.match(new RegExp(`\\b${s}\\b`))) { filters.size = s; break; }

  // “da igual”
  if (/(da igual|orice|indiferent)/.test(t)) filters.size = null;

  return filters;
}

// ———————————————————— helpers Excel (HTML table trick) ————————————————————
function excelDataUri({ title, subtitle, rows }) {
  const esc = (v)=>String(v??"").replace(/[<&>]/g, m=>({ "<":"&lt;","&": "&amp;", ">":"&gt;" }[m]));
  const head = ["Contenedor","Naviera","Tipo","Posición","Entrada","Tabla"];
  const body = rows.map(r => [
    r.matricula_contenedor || r.num_contenedor || r.codigo || "—",
    r.naviera || r.linea || r.marca || "—",
    r.tipo || "—",
    r.posicion || "—",
    (r.fecha_entrada || r.created_at || "").toString().slice(0,10),
    r._table || "—"
  ]);

  const html =
`<html><head><meta charset="utf-8"></head><body>
<h2 style="font-family:Inter,Arial">${esc(title)}</h2>
<div style="margin:4px 0 12px 0;font-family:Inter,Arial">${esc(subtitle)}</div>
<table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;font-family:Inter,Arial">
<thead><tr>${head.map(h=>`<th>${esc(h)}</th>`).join("")}</tr></thead>
<tbody>
${body.map(row=>`<tr>${row.map(c=>`<td>${esc(c)}</td>`).join("")}</tr>`).join("\n")}
</tbody></table></body></html>`;
  const b64 = typeof btoa === "function"
    ? btoa(unescape(encodeURIComponent(html)))
    : Buffer.from(html, "utf8").toString("base64");
  return `data:application/vnd.ms-excel;base64,${b64}`;
}

// ———————————————————— query + filtrare robustă ————————————————————
async function fetchRows(filters) {
  const table = filters.list;
  // luăm toate câmpurile frecvent folosite și filtrăm în JS—robust la schemă
  const { data, error } = await supabase.from(table).select("*").limit(2000);
  if (error) return [];

  let rows = data || [];

  if (filters.onlyVacio) {
    rows = rows.filter(r =>
      /vacio/i.test(r.categoria || r.estado || "") || /vac/i.test(r.tipo || "")
    );
  }
  if (filters.naviera) {
    const N = filters.naviera.toUpperCase();
    rows = rows.filter(r =>
      (r.naviera || r.linea || r.marca || "").toUpperCase().includes(N)
    );
  }
  if (filters.size) {
    rows = rows.filter(r =>
      (r.tipo || "").includes(filters.size) || (r.tamano || r.size || "").includes(filters.size)
    );
  }

  // atașăm numele tabelei pt. raport
  rows = rows.map(r => ({ ...r, _table: table }));
  return rows;
}

// ———————————————————— UI listă + export ————————————————————
function ListCard({ title, subtitle, rows }) {
  const uri = excelDataUri({ title, subtitle, rows });
  const fname = `${title.replace(/\s+/g,"_")}_${new Date().toISOString().slice(0,10)}.xls`;

  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>{title}</div>
      <div style={{ fontSize: 14, opacity: .8, marginTop: 4 }}>{subtitle}</div>

      <div style={{ marginTop: 10, maxHeight: 260, overflow: "auto", border: "1px solid #eee", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ position:"sticky", top:0, background:"#fafafa" }}>
              <th style={{ textAlign:"left", padding:"8px" }}>Contenedor</th>
              <th style={{ textAlign:"left", padding:"8px" }}>Naviera</th>
              <th style={{ textAlign:"left", padding:"8px" }}>Tipo</th>
              <th style={{ textAlign:"left", padding:"8px" }}>Posición</th>
              <th style={{ textAlign:"left", padding:"8px" }}>Entrada</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={i} style={{ borderTop:"1px solid #eee" }}>
                <td style={{ padding:"8px" }}>{r.matricula_contenedor || r.num_contenedor || r.codigo || "—"}</td>
                <td style={{ padding:"8px" }}>{r.naviera || r.linea || r.marca || "—"}</td>
                <td style={{ padding:"8px" }}>{r.tipo || "—"}</td>
                <td style={{ padding:"8px" }}>{r.posicion || "—"}</td>
                <td style={{ padding:"8px" }}>{(r.fecha_entrada || r.created_at || "").toString().slice(0,10)}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={5} style={{ padding:"12px", opacity:.7 }}>Lista vacía.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.cardActions} style={{ marginTop: 10 }}>
        <a className={styles.actionBtn} href={uri} download={fname}>Descargar Excel</a>
      </div>
    </div>
  );
}

// ———————————————————— handler principal ————————————————————
export default async function handleDepotList({ userText = "", setMessages, filters: forced={} }) {
  const base = parseFilters(userText);
  const filters = { ...base, ...forced };

  // dacă a cerut “vacío de Maersk” dar nu a spus mărimea → întreabă
  if (filters.list === "contenedores" && (filters.onlyVacio || filters.naviera) && !("size" in forced) && !filters.size) {
    setMessages(m => [
      ...m,
      {
        from: "bot",
        reply_text: "¿De qué tamaño te interesa? (20, 40 o da igual)",
        render: () => (
          <div className={styles.card}>
            <div className={styles.cardActions}>
              <button className={styles.actionBtn} onClick={() => handleDepotList({ userText, setMessages, filters:{ size:"20" } })}>20</button>
              <button className={styles.actionBtn} onClick={() => handleDepotList({ userText, setMessages, filters:{ size:"40" } })}>40</button>
              <button className={styles.actionBtn} onClick={() => handleDepotList({ userText, setMessages, filters:{ size:null } })}>Da igual</button>
            </div>
          </div>
        )
      }
    ]);
    return;
  }

  const rows = await fetchRows(filters);

  const niceDate = new Date().toLocaleDateString("es-ES");
  const title = "Lista contenedores";
  const pieces = [];
  if (filters.list === "contenedores_rotos") pieces.push("rotos");
  else if (filters.list === "contenedores_programados") pieces.push("programados");
  else if (filters.onlyVacio) pieces.push("vacío");
  if (filters.naviera) pieces.push(filters.naviera);
  if (filters.size) pieces.push(filters.size);
  const subtitle = `${pieces.join(", ") || "todos"} · ${niceDate}`;

  setMessages(m => [
    ...m,
    {
      from: "bot",
      reply_text: "Aquí tienes la lista.",
      render: () => <ListCard title={title} subtitle={subtitle} rows={rows} />
    }
  ]);
}
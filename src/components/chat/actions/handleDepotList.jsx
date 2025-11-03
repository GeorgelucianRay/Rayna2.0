// src/components/chat/actions/handleDepotList.jsx
import React from "react";
import styles from "../Chatbot.module.css";
import { supabase } from "../../../supabaseClient";
import { parseDepotFilters } from "./depot/parseDepotFilters";

/* ─────────────── Context (sessionStorage) ─────────────── */
const CTX_KEY = "depot_list_ctx";
const getCtx  = () => JSON.parse(sessionStorage.getItem(CTX_KEY) || "{}");
const saveCtx = (p) => {
  const next = { ...(getCtx() || {}), ...(p || {}) };
  sessionStorage.setItem(CTX_KEY, JSON.stringify(next));
  return next;
};
export function clearDepotCtx() { sessionStorage.removeItem(CTX_KEY); }

/* ─────────────── Helpers de filtrare ─────────────── */
function applySizeFilter(q, size) {
  if (!size) return q;
  if (size === "20")   return q.ilike("tipo", "%20%");
  if (size === "40hc") {
    q = q.ilike("tipo", "%40%");
    // 40 + (alto OR hc)
    return q.or("tipo.ilike.%alto%,tipo.ilike.%hc%");
  }
  if (size === "40")   return q.ilike("tipo", "%40%").not.ilike("tipo", "%alto%").not.ilike("tipo", "%hc%");
  return q;
}
function applyNavieraFilter(q, naviera) {
  return naviera ? q.ilike("naviera", `%${naviera}%`) : q;
}

/* ─────────────── Interogări DB (pe coloanele tale) ─────────────── */
async function qContenedores({ estado, size, naviera }) {
  let q = supabase.from("contenedores")
    .select("id,created_at,matricula_contenedor,naviera,tipo,posicion,estado");
  if (estado) q = q.eq("estado", estado); // vacio | lleno
  q = applySizeFilter(q, size);
  q = applyNavieraFilter(q, naviera);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
async function qProgramados({ size, naviera }) {
  let q = supabase.from("contenedores_programados")
    .select("id,created_at,matricula_contenedor,naviera,tipo,posicion,empresa_descarga,fecha,hora,matricula_camion,estado");
  // NU filtrăm pe vacio/lleno aici
  q = applySizeFilter(q, size);
  q = applyNavieraFilter(q, naviera);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
async function qRotos({ size, naviera }) {
  let q = supabase.from("contenedores_rotos")
    .select("id,created_at,matricula_contenedor,naviera,tipo,posicion,estado,notas");
  q = applySizeFilter(q, size);
  q = applyNavieraFilter(q, naviera);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

/* ─────────────── Export CSV (Excel îl deschide) ─────────────── */
function toCSV(rows, titleLine = "") {
  const head = ["Contenedor","Naviera","Tipo","Posición","Estado/Empresa","Entrada/Fecha"];
  const lines = [];
  if (titleLine) lines.push(`# ${titleLine}`);
  lines.push(head.join(","));
  for (const r of rows) {
    const num   = r.matricula_contenedor ?? r.codigo ?? "";
    const nav   = r.naviera ?? "";
    const tip   = r.tipo ?? "";
    const pos   = r.posicion ?? "";
    const est   = (r.estado ?? r.empresa_descarga ?? r.detalles ?? "").toString();
    const fecha = (r.fecha || r.created_at || "").toString().slice(0,10);
    lines.push([num, nav, tip, pos, est, fecha].map(v => `"${String(v).replace(/"/g,'""')}"`).join(","));
  }
  return lines.join("\n");
}
function downloadCSV(rows, filename, titleLine) {
  const blob = new Blob([toCSV(rows, titleLine)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${filename}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

/* ─────────────── UI tabel ─────────────── */
function TableList({ rows, subtitle, excelTitle }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>Lista contenedores</div>
      <div style={{ opacity:.7, marginTop:2 }}>{subtitle}</div>
      <div style={{ overflowX:"auto", marginTop:10 }}>
        <table className={styles.table} style={{ width:"100%" }}>
          <thead>
            <tr>
              <th>Contenedor</th><th>Naviera</th><th>Tipo</th>
              <th>Posición</th><th>Estado/Empresa</th><th>Entrada/Fecha</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 10).map((r,i)=>{
              const num = r.matricula_contenedor ?? r.codigo ?? "";
              const nav = r.naviera ?? "";
              const tip = r.tipo ?? "";
              const pos = r.posicion ?? "";
              const est = r.estado ?? r.empresa_descarga ?? r.detalles ?? "";
              const fecha = (r.fecha || r.created_at || "").toString().slice(0,10);
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
        <button
          className={styles.actionBtn}
          onClick={()=>{
            const ctx = getCtx();
            const rowsAll = ctx._lastRows || [];
            const title   = ctx._excelTitle || "Lista contenedores";
            downloadCSV(rowsAll, "lista_contenedores", title);
          }}
        >
          Descargar Excel ({(getCtx()._lastRows || []).length} filas)
        </button>
      </div>
    </div>
  );
}

/* ─────────────── Execuție query + render ─────────────── */
async function queryAndRender({ estado, size, naviera, setMessages, askExcel }) {
  let rows = [];
  if (estado === "programado") rows = await qProgramados({ size, naviera });
  else if (estado === "roto")  rows = await qRotos({ size, naviera });
  else if (estado === "vacio" || estado === "lleno")
    rows = await qContenedores({ estado, size, naviera });
  else
    rows = await qContenedores({ estado: null, size, naviera });

  const subtitle = [
    estado || "todos",
    size || "all-sizes",
    naviera || "todas navieras",
    new Date().toLocaleDateString()
  ].join(" · ");

  if (!rows.length) {
    setMessages(m => [...m, { from:"bot", reply_text:`No hay resultados para: ${subtitle}.` }]);
    return;
  }

  const excelTitle = `Lista contenedores – ${estado || "todos"} – ${size || "all"} – ${naviera || "todas"} – ${new Date().toLocaleDateString()}`;
  saveCtx({ _lastRows: rows, _excelTitle: excelTitle });

  setMessages(m => [
    ...m,
    { from:"bot", reply_text:"Vale, aquí tienes la lista.", render: () => <TableList rows={rows} subtitle={subtitle} excelTitle={excelTitle} /> }
  ]);

  if (askExcel) {
    setMessages(m => [...m, { from:"bot", reply_text:"¿Quieres que te lo dé en Excel? (sí/no)" }]);
    saveCtx({ awaiting:"depot_list_excel", lastQuery: { estado, size, naviera } });
  }
}

/* ─────────────── Handler principal ─────────────── */
export default async function handleDepotList({ userText, setMessages, setAwaiting }) {
  const { kind, estado, size, naviera, wantExcel } = parseDepotFilters(userText);

  if (kind === "single") {
    setMessages(m => [...m, { from:"bot", reply_text:"Eso parece un número de contenedor. Para listas: «lista vacíos 40 Maersk», por ejemplo." }]);
    return;
  }

  // Dacă lipsește size dar avem estado/naviera → întreabă
  if (size === null && (estado || naviera)) {
    setMessages(m => [...m, { from:"bot", reply_text:"Un momento para decirte correcto… ¿De cuál tipo te interesa? (20/40/da igual)" }]);
    setAwaiting?.("depot_list_size");
    saveCtx({ awaiting:"depot_list_size", lastQuery:{ estado, size:null, naviera } });
    return;
  }

  try {
    await queryAndRender({ estado, size, naviera, setMessages, askExcel: wantExcel });
  } catch (e) {
    console.error("[handleDepotList] error:", e);
    setMessages(m => [...m, { from:"bot", reply_text:"No he podido leer la lista ahora." }]);
  }
}

/* ─────────────── Funcții exportate pentru awaitingHandlers.jsx ─────────────── */
export function parseSizeFromAnswer(text = "") {
  const t = String(text).toLowerCase();
  if (/\b20\b/.test(t)) return "20";
  if (/\b40\s*hc\b|\b40hc\b|\bhigh\s*cube\b|\balto\b/.test(t)) return "40hc";
  if (/\b40\b/.test(t)) return "40";
  if (/da\s*igual|cualquiera|me da igual|igual/.test(t)) return null; // „da igual”
  return false; // input neînțeles
}
export async function runDepotListFromCtx({ setMessages }) {
  const { lastQuery } = getCtx();
  if (!lastQuery) return;
  await queryAndRender({ ...lastQuery, setMessages, askExcel: false });
}
// src/components/chat/actions/handleDepotList.jsx
import React from "react";
import styles from "../Chatbot.module.css";
import { supabase } from "../../../supabaseClient";
import { parseDepotFilters } from "./depot/parseDepotFilters";

// ─────────────────────────────────────────────
// Context în sessionStorage (pas cu pas)
// ─────────────────────────────────────────────
export const CTX_KEY = "depot_list_ctx";
export const getCtx = () => JSON.parse(sessionStorage.getItem(CTX_KEY) || "{}");
export const saveCtx = (p) => {
  const next = { ...(getCtx() || {}), ...(p || {}) };
  sessionStorage.setItem(CTX_KEY, JSON.stringify(next));
  return next;
};
export function clearDepotCtx() {
  sessionStorage.removeItem(CTX_KEY);
}

// ─────────────────────────────────────────────
// Helpers SQL (exportăm pt. re-folosire în awaiting)
// ─────────────────────────────────────────────
export function likeTipo(q, size){
  if(!size) return q;
  if(size==="40hc") return q.ilike("tipo","%40HC%");
  if(size==="40")   return q.ilike("tipo","40%").not.ilike("tipo","%40HC%");
  if(size==="20")   return q.ilike("tipo","20%");
  return q;
}
export function likeNaviera(q, naviera){
  return naviera ? q.ilike("naviera", `%${naviera}%`) : q;
}

// interogările reale (le folosim din awaiting, la final)
export async function qContenedores({ estado, size, naviera }) {
  let q = supabase.from("contenedores")
    .select("id,created_at,matricula_contenedor,naviera,tipo,posicion,estado");
  if (estado) q = q.eq("estado", estado);  // doar 'vacio' / 'lleno'
  q = likeTipo(q, size);
  q = likeNaviera(q, naviera);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
export async function qProgramados({ size, naviera }) {
  let q = supabase.from("contenedores_programados")
    .select("id,created_at,matricula_contenedor,naviera,tipo,posicion,empresa_descarga,fecha,hora,matricula_camion,estado");
  q = likeTipo(q, size);
  q = likeNaviera(q, naviera);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
export async function qRotos({ size, naviera }) {
  let q = supabase.from("contenedores_rotos")
    .select("id,created_at,matricula_contenedor,naviera,tipo,posicion,estado,notas");
  q = likeTipo(q, size);
  q = likeNaviera(q, naviera);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// tabel UI + export CSV (folosite de awaiting când afișează lista)
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
    lines.push([num,nav,tip,pos,est,fecha].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(","));
  }
  return lines.join("\n");
}
function downloadCSV(rows, filename, titleLine){
  const blob = new Blob([toCSV(rows, titleLine)], { type:"text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${filename}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
export function TableList({ rows, subtitle, excelTitle }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>Lista contenedores</div>
      <div style={{opacity:.7,marginTop:2}}>{subtitle}</div>
      <div style={{overflowX:"auto",marginTop:10}}>
        <table className={styles.table} style={{width:"100%"}}>
          <thead>
            <tr>
              <th>Contenedor</th><th>Naviera</th><th>Tipo</th>
              <th>Posición</th><th>Estado/Empresa</th><th>Entrada/Fecha</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0,10).map((r,i)=>(
              <tr key={i}>
                <td>{r.matricula_contenedor ?? r.codigo ?? ""}</td>
                <td>{r.naviera ?? ""}</td>
                <td>{r.tipo ?? ""}</td>
                <td>{r.posicion ?? ""}</td>
                <td>{r.estado ?? r.empresa_descarga ?? r.detalles ?? ""}</td>
                <td>{(r.fecha || r.created_at || "").toString().slice(0,10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.cardActions} style={{marginTop:12}}>
        <button
          className={styles.actionBtn}
          onClick={()=>{
            const ctx = getCtx();
            const rows = ctx._lastRows || [];
            const title = ctx._excelTitle || "Lista contenedores";
            downloadCSV(rows,"lista_contenedores",title);
          }}
        >Descargar Excel ({(getCtx()._lastRows||[]).length} filas)</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Parsări simple pentru răspunsurile din chat
// (folosite de awaitingHandlers)
// ─────────────────────────────────────────────
export function parseSizeFromAnswer(text=""){
  const t = text.toLowerCase();
  if (/\b20\b/.test(t)) return "20";
  if (/\b40\s*hc\b|\b40hc\b|\bhigh\s*cube\b|\balto\b/.test(t)) return "40hc";
  if (/\b40\b/.test(t)) return "40";
  if (/da\s*igual|sin\s*preferencia|cualquiera|me da igual|igual/i.test(t)) return null;
  return undefined; // nu am înțeles
}
export function parseNavieraFromAnswer(text=""){
  const s = text.trim().toUpperCase();
  if (/todas|cualquiera|sin\s*preferencia|me da igual/i.test(s)) return null;
  // extragem „de X” sau ultimul cuvânt semnificativ
  const m = text.match(/\bde\s+([A-Za-z0-9][\w\s-]{2,})/i);
  return (m ? m[1] : s).trim().toUpperCase();
}

// ─────────────────────────────────────────────
// PORNEȘTE conversația (NU listează încă!)
// ─────────────────────────────────────────────
export default async function handleDepotList({ userText, setMessages, setAwaiting }) {
  // extragem ce se poate, dar nu listăm — doar pornim dialogul ghidat
  const { estado, size, naviera } = parseDepotFilters(userText);
  saveCtx({ lastQuery: { estado: estado ?? null, size: size ?? null, naviera: naviera ?? null } });

  // dacă nu a menționat tipul de stare, întrebăm întâi asta
  if (!estado) {
    setMessages(m=>[...m,{from:"bot",
      reply_text:"¿Qué necesitas exactamente: vacíos, llenos, rotos o programados?"
    }]);
    saveCtx({ awaiting:"depot_ask_estado" });
    setAwaiting("depot_ask_estado");
    return;
  }

  // avem 'estado', întrebăm preferințe: tamaño/naviera
  setMessages(m=>[...m,{from:"bot",
    reply_text:"¿Alguna preferencia de tamaño (20/40/40HC) o naviera? Puedes decir «sin preferencia»."
  }]);
  saveCtx({ awaiting:"depot_ask_filtros" });
  setAwaiting("depot_ask_filtros");
}

export {
  getCtx,
  saveCtx,
  clearDepotCtx,
  qContenedores,
  qProgramados,
  qRotos,
  TableList,
  parseSizeFromAnswer,
  parseNavieraFromAnswer,
  runDepotListFromCtx,
};
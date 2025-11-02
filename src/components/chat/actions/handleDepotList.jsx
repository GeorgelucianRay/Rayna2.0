// src/components/chat/actions/handleDepotList.jsx (FINAL - CORECTAT ȘI EXPORTAT)

import React from "react";
// Importă stilurile și clientul Supabase (presupuse din contextul tău)
import styles from "../Chatbot.module.css"; 
import { supabase } from "../../../supabaseClient"; 
// Importă funcția de parsare (presupusă din contextul tău)
import { parseDepotFilters } from "./depot/parseDepotFilters"; 

/* ── Context simplu în sessionStorage (pentru pasul 2/Excel) ── */
const CTX_KEY = "depot_list_ctx";
// 🚨 CORECȚIE: Adăugăm export la funcțiile de context pentru a fi accesibile în awaitingHandlers.jsx
export const getCtx  = () => JSON.parse(sessionStorage.getItem(CTX_KEY) || "{}");
export const saveCtx = (p) => {
  const next = { ...(getCtx() || {}), ...(p || {}) };
  sessionStorage.setItem(CTX_KEY, JSON.stringify(next));
  return next;
};

/* ── helpers filtre (CORECTAT PENTRU '40' vs '40HC') ── */
function likeTipo(q, size) {
  if (!size) return q;

  // 1. 40 High Cube
  if (size === "40hc") return q.ilike("tipo", "%40HC%");

  // 2. 40 (Exclude High Cube pentru a fi specific)
  if (size === "40") {
    // Caută '40%' DAR EXCLUDE '%40HC%'
    return q.ilike("tipo", "40%").not.ilike("tipo", "%40HC%");
  }
  
  // 3. 20
  if (size === "20") return q.ilike("tipo", "20%");
  
  return q;
}
function likeNaviera(q, naviera) {
  return naviera ? q.ilike("naviera", `%${naviera}%`) : q;
}

/* ── interogări corecte pe tabelele tale ── */
async function qContenedores({ estado, size, naviera }) {
  let q = supabase.from("contenedores")
    .select("id,created_at,matricula_contenedor,naviera,tipo,posicion,estado");
  if (estado) q = q.eq("estado", estado); // 'vacio' | 'lleno'
  q = likeTipo(q, size);
  q = likeNaviera(q, naviera);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(r => ({...r, __table: 'contenedores'}));
}
async function qProgramados({ size, naviera }) {
  let q = supabase.from("contenedores_programados")
    .select("id,created_at,matricula_contenedor,naviera,tipo,posicion,empresa_descarga,fecha,hora,matricula_camion,estado");
  q = likeTipo(q, size);
  q = likeNaviera(q, naviera);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(r => ({...r, __table: 'programados'}));
}
async function qRotos({ size, naviera }) {
  let q = supabase.from("contenedores_rotos")
    .select("id,created_at,matricula_contenedor,naviera,tipo,posicion,estado,notas");
  q = likeTipo(q, size);
  q = likeNaviera(q, naviera);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(r => ({...r, __table: 'rotos'}));
}

/* ── CSV (Excel îl deschide) ── */
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
    const fecha = (r.fecha || r.created_at || "").toString().slice(0, 10);
    lines.push([num,nav,tip,pos,est,fecha].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(","));
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

/* ── UI tabel (Simplificat pentru exemplu) ── */
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
            {rows.slice(0, 10).map((r,i)=>{ // Arată primele 10 rânduri
              const num   = r.matricula_contenedor ?? r.codigo ?? "";
              const nav   = r.naviera ?? "";
              const tip   = r.tipo ?? "";
              const pos   = r.posicion ?? "";
              const est   = r.estado ?? r.empresa_descarga ?? r.detalles ?? "";
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
            const rows = ctx._lastRows || [];
            const title = ctx._excelTitle || "Lista contenedores";
            downloadCSV(rows, "lista_contenedores", title);
          }}
        >
          Descargar Excel ({rows.length} filas)
        </button>
      </div>
    </div>
  );
}


/* ── interoghează + randare ── */
async function queryAndRender({ estado, size, naviera, setMessages, askExcel }) {
  let rows = [];

  // 1. Alege funcția de interogare în funcție de 'estado'
  if (estado === "programado") rows = await qProgramados({ size, naviera });
  else if (estado === "roto")  rows = await qRotos({ size, naviera });
  else if (estado === "vacio" || estado === "lleno")
    rows = await qContenedores({ estado, size, naviera });
  else
    rows = await qContenedores({ estado:null, size, naviera }); // Toate (din tabla contenedores)

  // 2. Pregătește titlurile și mesajele
  const subtitle = [
    estado || "todos",
    size || "all-sizes",
    naviera || "todas navieras",
    new Date().toLocaleDateString()
  ].join(" · ");

  if (!rows.length) {
    setMessages(m=>[...m,{from:"bot",reply_text:`No hay resultados para: ${subtitle}.`}]);
    return;
  }

  const excelTitle =
    `Lista contenedores – ${estado || "todos"} – ${size || "all"} – ${naviera || "todas"} – ${new Date().toLocaleDateString()}`;

  // Salvează contextul pentru butonul Excel
  saveCtx({ _lastRows: rows, _excelTitle: excelTitle }); 

  // 3. Afișează lista
  setMessages(m=>[
    ...m,
    { from:"bot", reply_text:"Vale, aquí tienes la lista.",
      render:()=> <TableList rows={rows} subtitle={subtitle} excelTitle={excelTitle} /> }
  ]);

  // 4. Întreabă de Excel (Dacă este primul pas)
  if (askExcel) {
    setMessages(m=>[...m, { from:"bot", reply_text:"¿Quieres que te lo dé en Excel? (sí/no)" }]);
    saveCtx({ awaiting:"depot_list_excel", lastQuery:{ estado, size, naviera } });
  }
}

/* ── handler principal ── */
export default async function handleDepotList({ userText, setMessages, setAwaiting }) {
  const { kind, estado, size, naviera } = parseDepotFilters(userText);

  // dacă a scris un cod container, NU tratăm ca listă
  if (kind === "single") {
    setMessages(m=>[...m,{from:"bot",reply_text:"Eso parece un número de contenedor. Para listas: «lista vacíos 40 Maersk», por ejemplo."}]);
    return;
  }

  // 🚨 JOCUL INTERACTIV (PASUL 1): Dacă lipsește tipul, întreabă.
  // Condiția este: lipsește 'size' ȘI există cel puțin 'estado' SAU 'naviera'
  if (!size && (estado || naviera)) {
    setMessages(m=>[
      ...m,
      { from:"bot", reply_text:"Un momento para decirte correcto… ¿De cuál tipo te interesa? (20/40/da igual)" }
    ]);
    setAwaiting?.("depot_list_size");
    saveCtx({ awaiting:"depot_list_size", lastQuery:{ estado, size:null, naviera } });
    return;
  }
  
  // 🚨 PASUL 2: Execută interogarea și întreabă de Excel (se execută dacă size este prezent SAU dacă nu au fost detectate filtre)
  try {
    await queryAndRender({ estado, size, naviera, setMessages, askExcel:true });
  } catch (e) {
    console.error("[handleDepotList] error:", e);
    setMessages(m=>[...m,{from:"bot",reply_text:"No he podido leer la lista ahora."}]);
  }
}

/* ── util pt. awaiting (pasul 2/3) ── */
export function parseSizeFromAnswer(text="") {
  const t = text.toLowerCase();
  if (/\b20\b/.test(t)) return "20";
  // Atentie: 40hc trebuie prins inaintea lui 40
  if (/\b40\s*hc\b|\b40hc\b|\bhigh\s*cube\b|\balto\b/.test(t)) return "40hc"; 
  if (/\b40\b/.test(t)) return "40";
  if (/da\s*igual|cualquiera|me da igual|igual/.test(t)) return null;
  return false; // Returnează false dacă nu înțelege nimic (pentru a cere repetarea)
}

// Folosit de awaitingHandlers.js pentru a re-rula interogarea (fără a cere din nou Excel)
export async function runDepotListFromCtx({ setMessages }) {
  const ctx = getCtx();
  const q = ctx.lastQuery || {};
  await queryAndRender({ ...q, setMessages, askExcel:false }); // askExcel:false este crucial
}

export function clearDepotCtx() {
  sessionStorage.removeItem(CTX_KEY);
}

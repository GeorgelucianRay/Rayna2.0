import React from "react";
import styles from "../Chatbot.module.css";
import { supabase } from "../../../supabaseClient";

/* ===================== PARSARE CERERE ===================== */
function norm(s=""){return s.normalize("NFD").replace(/\p{Diacritic}/gu,"").toLowerCase();}

function parseRequest(userText="") {
  const t = norm(userText);

  // ce listă vrea
  let kind = "todos";
  if (/\bprogramad/.test(t)) kind = "programados";
  else if (/\brot[oa]s?\b|\bdefect/.test(t)) kind = "rotos";
  else if (/\blleno[s]?\b/.test(t)) kind = "llenos";
  else if (/\bvacio[s]?\b/.test(t)) kind = "vacios";
  else if (/\blista\b|\bcontenedores?\b/.test(t)) kind = "todos";

  // tipul (20/40)
  let tipo = null;
  if (/\b20\b/.test(t)) tipo = "20";
  if (/\b40\b/.test(t)) tipo = "40";

  // naviera (heuristic simplu: caută mărci comune; sau cuvânt după "de ")
  let naviera = null;
  const known = ["MAERSK","MSC","HAPAG","HMM","ONE","COSCO","EVERGREEN","CMA","YANG MING","ZIM"];
  for (const k of known) if (t.includes(norm(k))) { naviera = k; break; }
  if (!naviera) {
    const m = userText.match(/\bde\s+([A-Za-z][\w\s-]{2,})$/i);
    if (m) naviera = m[1].trim().toUpperCase();
  }

  return { kind, tipo, naviera };
}

/* ===================== QUERIES ===================== */
// Notă: numele coloanelor sunt cele reale din DB:
// contenedores:            matricula_contenedor, naviera, tipo, posicion, estado ('vacio'|'lleno'), created_at
// contenedores_programados:matricula_contenedor, naviera, tipo, posicion, empresa_descarga, fecha, hora, estado ('programado'|'pendiente')
// contenedores_rotos:      matricula_contenedor, naviera, tipo, posicion, detalles, created_at

async function qContenedores({ estado, tipo, naviera }) {
  let q = supabase.from("contenedores").select("*");
  if (estado)  q = q.eq("estado", estado);           // 'vacio' | 'lleno'
  if (tipo)    q = q.eq("tipo", tipo);               // '20' | '40' (sau '40 Alto' – vezi mai jos)
  if (naviera) q = q.eq("naviera", naviera);
  return (await q.order("created_at", { ascending:false })).data || [];
}

async function qProgramados({ tipo, naviera }) {
  let q = supabase.from("contenedores_programados").select("*");
  if (tipo)    q = q.eq("tipo", tipo);
  if (naviera) q = q.eq("naviera", naviera);
  return (await q.order("created_at", { ascending:false })).data || [];
}

async function qRotos({ tipo, naviera }) {
  let q = supabase.from("contenedores_rotos").select("*");
  if (tipo)    q = q.eq("tipo", tipo);
  if (naviera) q = q.eq("naviera", naviera);
  return (await q.order("created_at", { ascending:false })).data || [];
}

/* ===================== UI: TABEL + EXPORT ===================== */
function toCSV(rows, headers) {
  const esc = (v)=>`"${String(v??"").replace(/"/g,'""')}"`;
  const head = headers.map(h=>esc(h.label)).join(",");
  const body = rows.map(r => headers.map(h=>esc(h.get(r))).join(",")).join("\n");
  return head+"\n"+body;
}

function downloadCSV(filename, csv) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  a.remove(); URL.revokeObjectURL(url);
}

function ListCard({ title, subtitle, rows, columns, fileName }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>{title}</div>
      <div style={{opacity:.8, fontSize:14, marginTop:4}}>{subtitle}</div>

      <div style={{overflowX:"auto", marginTop:10}}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map(c => (
                <th key={c.label} style={{whiteSpace:"nowrap"}}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={i}>
                {columns.map(c => <td key={c.label}>{c.get(r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.cardActions} style={{marginTop:10}}>
        <button
          className={styles.actionBtn}
          onClick={()=>{
            const csv = toCSV(rows, columns);
            downloadCSV(`${fileName}.csv`, csv);
          }}
        >
          Descargar Excel
        </button>
      </div>
    </div>
  );
}

/* ===================== HANDLER PRINCIPAL ===================== */
export default async function handleDepotList({ userText, setMessages }) {
  const { kind, tipo, naviera } = parseRequest(userText);

  // fetch în tabela corectă
  let rows = [];
  let label = "todos";
  try {
    if (kind === "vacios") {
      rows = await qContenedores({ estado:"vacio", tipo, naviera });
      label = `vacíos${tipo?` ${tipo}`:""}${naviera?` · ${naviera}`:""}`;
    } else if (kind === "llenos") {
      rows = await qContenedores({ estado:"lleno", tipo, naviera });
      label = `llenos${tipo?` ${tipo}`:""}${naviera?` · ${naviera}`:""}`;
    } else if (kind === "rotos") {
      rows = await qRotos({ tipo, naviera });
      label = `rotos${tipo?` ${tipo}`:""}${naviera?` · ${naviera}`:""}`;
    } else if (kind === "programados") {
      rows = await qProgramados({ tipo, naviera });
      label = `programados${tipo?` ${tipo}`:""}${naviera?` · ${naviera}`:""}`;
    } else {
      rows = await qContenedores({ tipo, naviera });
      label = `en depósito${tipo?` ${tipo}`:""}${naviera?` · ${naviera}`:""}`;
    }
  } catch (e) {
    console.error("[handleDepotList] supabase error:", e);
  }

  // dacă nu există rezultate → mesaj dedicat (nu mai cade pe altă listă)
  if (!rows?.length) {
    setMessages(m=>[...m,{from:"bot",reply_text:`No he podido leer ${label} ahora o no hay resultados.`}]);
    return;
  }

  // adaptare coloană „extra” per sursă
  const isProg = rows[0] && Object.prototype.hasOwnProperty.call(rows[0],"empresa_descarga");
  const isRoto = rows[0] && Object.prototype.hasOwnProperty.call(rows[0],"detalles");

  const columns = [
    { label:"Contenedor", get:r=>r.matricula_contenedor || "—" },
    { label:"Naviera",    get:r=>r.naviera || "—" },
    { label:"Tipo",       get:r=>r.tipo || "—" },
    { label:"Posición",   get:r=>r.posicion || "—" },
    isProg
      ? { label:"Empresa", get:r=>r.empresa_descarga || "—" }
      : isRoto
        ? { label:"Detalle", get:r=>r.detalles || "—" }
        : { label:"Estado",  get:r=>r.estado || "—" },
    isProg
      ? { label:"Fecha", get:r=>r.fecha || "—" }
      : { label:"Fecha", get:r=>(r.created_at||"").toString().slice(0,10) || "—" },
    isProg
      ? { label:"Hora", get:r=>r.hora || "—" }
      : { label:"Hora", get:()=> "—" },
  ].filter(Boolean);

  const title = "Lista contenedores";
  const subtitle = `${label} · ${new Date().toLocaleDateString()}`;
  const fileName = `lista_${kind}${tipo?`_${tipo}`:""}${naviera?`_${naviera}`:""}_${new Date().toISOString().slice(0,10)}`;

  setMessages(m=>[
    ...m,
    {
      from:"bot",
      reply_text:"Aquí tienes la lista.",
      render: () => (
        <ListCard
          title={title}
          subtitle={subtitle}
          rows={rows}
          columns={columns}
          fileName={fileName}
        />
      )
    }
  ]);
}
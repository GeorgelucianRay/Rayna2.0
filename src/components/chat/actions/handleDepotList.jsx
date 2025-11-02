import React from "react";
import styles from "../Chatbot.module.css";
import { supabase } from "../../../supabaseClient";
import { parseDepotFilters } from "./depot/parseDepotFilters";

/* ─────────────────────────────
   Stocăm contextul pas-cu-pas
   ───────────────────────────── */
const CTX_KEY = "depot_list_ctx";
function saveCtx(partial) {
  const prev = JSON.parse(sessionStorage.getItem(CTX_KEY) || "{}");
  const next = { ...prev, ...partial };
  sessionStorage.setItem(CTX_KEY, JSON.stringify(next));
  return next;
}
function getCtx() {
  return JSON.parse(sessionStorage.getItem(CTX_KEY) || "{}");
}
export function clearDepotCtx() {
  sessionStorage.removeItem(CTX_KEY);
}

/* ─────────────────────────────
   Helpers pentru query
   ───────────────────────────── */
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

/* ─────────────────────────────
   Interogări DB
   ───────────────────────────── */
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
  let q = supabase.from("contenedores_rotos")
    .select("id, created_at, matricula_contenedor, naviera, tipo, posicion, estado, notas");
  q = likeTipo(q, size);
  q = likeNaviera(q, naviera);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

/* ─────────────────────────────
   Export CSV (Excel deschide ok)
   ───────────────────────────── */
function toCSV(rows, titleLine = "") {
  const header = [
    "Contenedor","Naviera","Tipo","Posición","Estado/Empresa","Entrada/Fecha"
  ];
  const lines = [];
  if (titleLine) lines.push(`# ${titleLine}`);
  lines.push(header.join(","));

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
function downloadCSV(rows, title = "lista_contenedores", titleLine = "") {
  const blob = new Blob([toCSV(rows, titleLine)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ─────────────────────────────
   UI Tabel
   ───────────────────────────── */
function TableList({ rows, subtitle, excelTitle }) {
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
          onClick={() => downloadCSV(rows, "lista_contenedores", excelTitle)}
        >
          Descargar Excel
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────
   Query + Render (pas 2 final)
   ───────────────────────────── */
async function queryAndRender({ estado, size, naviera, setMessages, askExcel = true }) {
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

  const excelTitle = `Lista contenedores – ${estado || "todos"} – ${size || "all"} – ${naviera || "todas"} – ${new Date().toLocaleDateString()}`;

  if (!rows.length) {
    setMessages(m => [...m, { from:"bot", reply_text:`No hay resultados para: ${subtitle}.` }]);
    return;
  }

  setMessages(m => [
    ...m,
    {
      from:"bot",
      reply_text: "Vale, aquí tienes la lista.",
      render: () => <TableList rows={rows} subtitle={subtitle} excelTitle={excelTitle} />
    }
  ]);

  if (askExcel) {
    setMessages(m => [
      ...m,
      { from:"bot", reply_text: "¿Quieres que te lo dé en Excel? (sí/no)" }
    ]);
    saveCtx({ lastQuery: { estado, size, naviera } });
    // semnalizăm că așteptăm răspuns pentru Excel
    saveCtx({ awaiting: "depot_list_excel" });
  }
}

/* ─────────────────────────────
   HANDLER PRINCIPAL (pas 1)
   ───────────────────────────── */
export default async function handleDepotList({ userText, setMessages, setAwaiting }) {
  // 1) parse cererea inițială
  const { kind, estado, size, naviera } = parseDepotFilters(userText);
  saveCtx({ estado, size, naviera }); // stocăm ce știm

  // 2) dacă lipsește tipul (20/40/da-igual) și are sens să întrebăm → întreabă
  if (!size && (estado || naviera)) {
    setMessages(m => [
      ...m,
      { from:"bot", reply_text:"Un momento para decirte correcto… ¿De cuál tipo te interesa? (20/40/da igual)" }
    ]);
    saveCtx({ awaiting: "depot_list_size" });
    if (setAwaiting) setAwaiting("depot_list_size");
    return;
  }

  // 3) dacă avem suficiente filtre → interoghează + arată + întreabă Excel
  try {
    await queryAndRender({ estado, size, naviera, setMessages, askExcel: true });
  } catch (e) {
    console.error("[handleDepotList] DB error:", e);
    setMessages(m => [...m, { from:"bot", reply_text:"No he podido leer la lista ahora." }]);
  }
}

/* ─────────────────────────────
   Util: parse răspuns tip (20/40/igual)
   ───────────────────────────── */
export function parseSizeFromAnswer(text = "") {
  const t = String(text).toLowerCase();
  if (/\b20\b/.test(t)) return "20";
  if (/\b40\s*hc\b|\b40hc\b|\bhigh\s*cube\b|\balto\b/.test(t)) return "40hc";
  if (/\b40\b/.test(t)) return "40";
  if (/da\s*igual|cualquiera|me da igual|igual/i.test(text)) return null;
  return null;
}

/* ─────────────────────────────
   Expunem executorul pentru awaiting
   ───────────────────────────── */
export async function runDepotListFromCtx({ setMessages }) {
  const ctx = getCtx();
  const { estado, size, naviera } = ctx.lastQuery || ctx;
  await queryAndRender({ estado, size, naviera, setMessages, askExcel: false });
}
// src/components/chat/actions/handleDepotList.jsx
import React from "react";
import styles from "../Chatbot.module.css";
import { supabase } from "../../../supabaseClient";

// ——————————————————————————————
// Helpers: normalizare & parsare cerere
// ——————————————————————————————
function normalize(s = "") {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extragem sloturi din text liber:
 *  - categoria: vacio | lleno | rotos | programados | salidos
 *  - naviera: maersk, msc, hapag, etc (pattern simplu)
 *  - tamanio: 20 | 40 | 45 (dacă apare)
 */
function parseQuerySlots(text) {
  const t = normalize(text);

  let categoria = null;
  if (/\broto(s)?\b|defect[oa]s?/i.test(t)) categoria = "rotos";
  else if (/programad[oa]s?|\bpendiente(s)?\b/i.test(t)) categoria = "programados";
  else if (/\bvaci(?:o|os|os)?\b|\bbuit(s)?\b/i.test(t)) categoria = "vacio";
  else if (/\bllen(?:o|os|a|as)\b|\bplin(e)?\b|\bple(ns)?\b/i.test(t)) categoria = "lleno";
  else if (/\bsalid[oa]s?\b|\bfuera\b/i.test(t)) categoria = "salidos";

  const mNav = t.match(
    /\b(maersk|msc|cma|cosco|evergreen|hapag|one|yml|yang\s?ming|zim|hmm)\b/i
  );
  const naviera = mNav ? mNav[1] : null;

  const mSize = t.match(/\b(20|40|45)\b/);
  const tamanio = mSize ? mSize[1] : null;

  return { categoria, naviera, tamanio };
}

// ——————————————————————————————
// Query builder: alege tabelul + filtrele
// ——————————————————————————————
function tableForCategory(categoria) {
  switch (categoria) {
    case "rotos":
      return "contenedores_rotos";
    case "programados":
      return "contenedores_programados";
    case "salidos":
      return "contenedores_salidos";
    default:
      // "vacio", "lleno" sau nimic -> en depósito
      return "contenedores";
  }
}

/**
 * Aplică filtre tolerante (ilike) pe coloanele standard:
 *   - num_contenedor (string)
 *   - naviera (string)
 *   - tipo (ex: "40 Alto", "20 Bajo" etc.)
 *   - posicion (ex: "B2A")
 *   - estado (ex: "vacio" / "lleno")
 *   - fecha_entrada (date) – pentru afisare
 *   - empresa (opțional)
 *
 *  NOTE: Dacă ai denumiri diferite, ajustează maparea în `rowToDisplay()`.
 */
function buildQuery({ categoria, naviera, tamanio }) {
  const table = tableForCategory(categoria);
  let q = supabase.from(table).select("*").order("fecha_entrada", { ascending: false });

  // filtre de stare (doar când suntem în "contenedores")
  if (table === "contenedores") {
    if (categoria === "vacio") q = q.ilike("estado", "vaci%");  // vacío/vacios/VACIO...
    if (categoria === "lleno") q = q.ilike("estado", "llen%");  // lleno/llenos/LLENO...
  }

  if (naviera) q = q.ilike("naviera", `%${naviera}%`);
  if (tamanio) q = q.ilike("tipo", `${tamanio}%`); // ex.: "40 Alto" -> începe cu 40

  return { table, q };
}

// ——————————————————————————————
// Transformare rând pentru UI/CSV (defensiv)
// ——————————————————————————————
function safe(v, def = "—") {
  if (v === null || v === undefined) return def;
  const s = String(v).trim();
  return s || def;
}

function rowToDisplay(row) {
  return {
    contenedor: safe(row.num_contenedor),
    naviera: safe(row.naviera),
    tipo: safe(row.tipo || row.tamano || row.size),
    posicion: safe(row.posicion || row.pos || row.ubicacion),
    estado: safe(row.estado || row.status),
    empresa: safe(row.empresa || row.company),
    fecha: safe((row.fecha_entrada || row.created_at || "").toString().slice(0, 10)),
  };
}

// ——————————————————————————————
// Export CSV (rapid, compatibil Excel)
// ——————————————————————————————
function toCSV(rows) {
  const headers = ["Contenedor", "Naviera", "Tipo", "Posición", "Estado", "Empresa", "Fecha"];
  const lines = [headers.join(",")];
  for (const r of rows) {
    const vals = [
      r.contenedor,
      r.naviera,
      r.tipo,
      r.posicion,
      r.estado,
      r.empresa,
      r.fecha,
    ].map((x) => `"${String(x).replace(/"/g, '""')}"`);
    lines.push(vals.join(","));
  }
  return lines.join("\r\n");
}

function downloadCSVFile(filename, csvText) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ——————————————————————————————
// UI: card listă + buton export
// ——————————————————————————————
function ListCard({ title, subtitle, rows }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>{title}</div>
      <div style={{ opacity: 0.8, fontSize: 12, marginBottom: 8 }}>{subtitle}</div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Contenedor</th>
              <th>Naviera</th>
              <th>Tipo</th>
              <th>Posición</th>
              <th>Estado</th>
              <th>Empresa</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.contenedor}-${i}`}>
                <td>{r.contenedor}</td>
                <td>{r.naviera}</td>
                <td>{r.tipo}</td>
                <td>{r.posicion}</td>
                <td>{r.estado}</td>
                <td>{r.empresa}</td>
                <td>{r.fecha}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.cardActions} style={{ marginTop: 10 }}>
        <button
          className={styles.actionBtn}
          onClick={() => {
            const csv = toCSV(rows);
            // Exemplu: Lista contenedores (vacio • maersk • 40) - 2025-02-11.csv
            const today = new Date().toISOString().slice(0, 10);
            const name = `${title} - ${today}.csv`.replace(/\s+/g, " ");
            downloadCSVFile(name, csv);
          }}
        >
          Descargar Excel
        </button>
      </div>
    </div>
  );
}

// ——————————————————————————————
// HANDLER principal
// ——————————————————————————————
export default async function handleDepotList({ userText = "", setMessages }) {
  // 1) parsăm cererea
  const { categoria, naviera, tamanio } = parseQuerySlots(userText);

  // 2) interogăm tabelul potrivit
  const { table, q } = buildQuery({ categoria, naviera, tamanio });
  const { data, error } = await q;

  if (error) {
    console.error("[DepotList] supabase error:", error);
    setMessages((m) => [
      ...m,
      { from: "bot", reply_text: "No he podido leer la lista ahora." },
    ]);
    return;
  }

  const rows = (data || []).map(rowToDisplay);

  // 3) mesaje speciale când nu ai rezultate
  if (!rows.length) {
    let why = "No hay contenedores para ese filtro.";
    if (table === "contenedores_programados") why = "No hay contenedores programados.";
    if (table === "contenedores_rotos") why = "No hay contenedores con defectos.";
    if (table === "contenedores_salidos") why = "No hay contenedores marcados como salida.";
    setMessages((m) => [...m, { from: "bot", reply_text: why }]);
    return;
  }

  // 4) titlu + subtitlu informativ
  const title = "Lista contenedores";
  const subtitleParts = [];
  if (categoria) subtitleParts.push(categoria);
  else subtitleParts.push("todos");
  if (naviera) subtitleParts.push(naviera);
  if (tamanio) subtitleParts.push(tamanio);

  const today = new Date();
  const subtitle = `${subtitleParts.join(" · ")} · ${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  // 5) afișăm
  setMessages((m) => [
    ...m,
    { from: "bot", reply_text: "Aquí tienes la lista." },
    {
      from: "bot",
      reply_text: "",
      render: () => <ListCard title={title} subtitle={subtitle} rows={rows} />,
    },
  ]);
}
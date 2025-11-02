// src/components/chat/actions/handleDepotList.jsx
import React from "react";
import styles from "../Chatbot.module.css";
import { supabase } from "../../../supabaseClient";

// ——— helpers: parsare text → filtre
function parseFilters(userText = "") {
  const t = userText.toLowerCase();

  // categorie → alege tabela
  let category = null;
  let table = "contenedores";
  if (/(programad[oa]s?|programación|programacion)/.test(t)) {
    category = "programados"; table = "contenedores_programados";
  } else if (/(rot[oa]s?|defect[oa]s?|averiad[oa]s?)/.test(t)) {
    category = "rotos"; table = "contenedores_rotos";
  } else if (/(salid[ao]s?)/.test(t)) {
    category = "salidos"; table = "contenedores_salidos";
  } else if (/(vac[ií]o?s?)/.test(t)) {
    category = "vacios"; table = "contenedores"; // se filtrează ulterior în rows
  }

  // naviera (simplu)
  const NAVS = ["maersk","msc","hapag","cma","evergreen","cosco","one","yang ming","zim","hmm"];
  const naviera = NAVS.find(n => t.includes(n)) || null;

  // tip 20/40
  let size = null;
  if (/\b20\b/.test(t)) size = "20";
  if (/\b40\b/.test(t)) size = "40";

  return { table, category, naviera, size };
}

// ——— Excel export simplu (CSV)
function downloadCSV(filename, rows) {
  if (!rows?.length) return;
  const headers = ["Contenedor","Naviera","Tipo","Posición","Entrada"];
  const csv = [
    headers.join(","),
    ...rows.map(r => [
      r.num_contenedor || r.codigo || "",
      r.naviera || "",
      r.tipo || r.type || "",
      r.posicion || "",
      (r.fecha_entrada || r.created_at || "").toString().slice(0,10)
    ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(","))
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ——— UI card listă
function ListCard({ title, sub, rows }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>{title}</div>
      <div style={{ opacity:.8, fontSize:13, margin:"4px 0 10px" }}>{sub}</div>

      <div style={{
        borderRadius:12, overflow:"hidden", border:"1px solid rgba(255,255,255,.12)"
      }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead style={{ background:"rgba(255,255,255,.08)" }}>
            <tr>
              <th style={th}>Contenedor</th>
              <th style={th}>Naviera</th>
              <th style={th}>Tipo</th>
              <th style={th}>Posición</th>
              <th style={th}>Entrada</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={i} style={{ borderTop:"1px solid rgba(255,255,255,.08)" }}>
                <td style={td}>{r.num_contenedor || r.codigo || "—"}</td>
                <td style={td}>{r.naviera || "—"}</td>
                <td style={td}>{r.tipo || r.type || "—"}</td>
                <td style={td}>{r.posicion || "—"}</td>
                <td style={td}>{(r.fecha_entrada || r.created_at || "—").toString().slice(0,10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.cardActions} style={{ marginTop:12 }}>
        <button
          className={styles.actionBtn}
          onClick={() => downloadCSV(
            `${title.replace(/\s+/g,"_")}.csv`,
            rows
          )}
        >
          Descargar Excel
        </button>
      </div>
    </div>
  );
}

const th = { textAlign:"left", padding:"10px 12px", fontWeight:600, fontSize:13 };
const td = { padding:"10px 12px", fontSize:14 };

// ——— handler principal
export default async function handleDepotList({ userText, profile, setMessages }) {
  // permisiune (aceleași reguli ca la depot chat, ajustează dacă vrei)
  const role = (profile?.role || "").toLowerCase();
  if (["sofer","șofer","şofer","driver"].includes(role)) {
    setMessages(m => [...m, { from:"bot", reply_text:"No tienes acceso al Depot." }]);
    return;
  }

  const { table, category, naviera, size } = parseFilters(userText);

  // query bază
  let q = supabase.from(table).select("*").order("fecha_entrada", { ascending:false }).limit(500);
  if (naviera) q = q.ilike("naviera", `%${naviera}%`);
  if (size)    q = q.ilike("tipo", `%${size}%`);

  const { data, error } = await q;
  if (error) {
    console.error("[DepotList] supabase error:", error);
    setMessages(m => [...m, { from:"bot", reply_text:"No he podido leer la lista ahora." }]);
    return;
  }
  let rows = data || [];

  // filtru „vacío” (poate fi stocat în diferite câmpuri)
  if (category === "vacios") {
    rows = rows.filter(r => {
      const hay = `${r.categoria||""} ${r.estado||""} ${r.tipo||""}`.toLowerCase();
      return /vac[ií]o/.test(hay);
    });
  }

  // dacă nu există rezultate → mesaj dedicat
  if (!rows.length) {
    const label = category === "programados" ? "programados"
                 : category === "rotos" ? "rotos/defectuosos"
                 : category === "salidos" ? "salidos"
                 : category === "vacios" ? "vacíos"
                 : "en depósito";
    setMessages(m => [
      ...m,
      { from:"bot", reply_text:`No hay contenedores ${label}${naviera ? ` de ${naviera.toUpperCase()}` : ""}.` }
    ]);
    return;
  }

  // titlu + subtitlu
  const today = new Date().toLocaleDateString();
  const filtroTxt = [
    category ? category : "todos",
    naviera ? naviera.toUpperCase() : null,
    size ? size : null
  ].filter(Boolean).join(" · ");

  setMessages(m => [
    ...m,
    {
      from: "bot",
      reply_text: "Aquí tienes la lista.",
      render: () => (
        <ListCard
          title="Lista contenedores"
          sub={`${filtroTxt || "todos"} · ${today}`}
          rows={rows}
        />
      ),
    },
  ]);
}
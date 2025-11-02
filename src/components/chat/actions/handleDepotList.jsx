import React from "react";
import * as XLSX from "xlsx";
import styles from "../Chatbot.module.css";
import { supabase } from "../../../supabaseClient";

/* ───────── helpers ───────── */
function parseQuerySlots(txt) {
  const t = (txt || "").toLowerCase();
  const slots = {
    categoria: null,   // 'vacio' | 'lleno' | 'rotos' | 'programados' | null (toate)
    naviera: null,     // ex: 'maersk'
    tamanio: null,     // '20' | '40' | '45' | null
  };

  if (/\broto[s]?\b|defect/i.test(t)) slots.categoria = "rotos";
  else if (/programad/i.test(t) || /\bpendiente[s]?\b/.test(t)) slots.categoria = "programados";
  else if (/\bvaci[óo]/.test(t)) slots.categoria = "vacio";
  else if (/\blleno[s]?\b/.test(t)) slots.categoria = "lleno";

  const mNav = t.match(/\b(maersk|msc|cma|cosco|evergreen|hapag|one|yml|yang\s?ming)\b/i);
  if (mNav) slots.naviera = mNav[1].toUpperCase();

  const mSize = t.match(/\b(20|40|45)\b/);
  if (mSize) slots.tamanio = mSize[1];

  return slots;
}

function rowsToExcel(rows, title = "Lista", filename = "lista.xlsx") {
  if (!rows?.length) return;
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = Object.keys(rows[0]).map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, ws, title);
  XLSX.writeFile(wb, filename);
}

/* ───────── UI ───────── */
function ListCard({ title, subtitle, rows, onExcel }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>{title}</div>
      <div style={{opacity:.85, marginBottom:8}}>{subtitle}</div>
      {(!rows || rows.length === 0) ? (
        <div style={{opacity:.8}}>No hay datos.</div>
      ) : (
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%", borderCollapse:"collapse"}}>
            <thead>
              <tr>
                <th align="left">Contenedor</th>
                <th align="left">Naviera</th>
                <th align="left">Tipo</th>
                <th align="left">Posición</th>
                <th align="left">Estado/Empresa</th>
                <th align="left">Fecha</th>
                <th align="left">Hora</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{borderTop:"1px solid rgba(255,255,255,.15)"}}>
                  <td>{r.matricula_contenedor || ""}</td>
                  <td>{r.naviera || ""}</td>
                  <td>{r.tipo || ""}</td>
                  <td>{r.posicion || ""}</td>
                  <td>{r.empresa_descarga || r.estado || r.detalles || ""}</td>
                  <td>{r.fecha || (r.created_at ? String(r.created_at).slice(0,10) : "")}</td>
                  <td>{r.hora || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows?.length > 0 && (
        <div className={styles.cardActions} style={{marginTop:12}}>
          <button className={styles.actionBtn} onClick={onExcel}>Descargar Excel</button>
        </div>
      )}
    </div>
  );
}

/* ───────── main handler ─────────
   Tabele & coloane corecte:
   - contenedores: matricula_contenedor, naviera, tipo, posicion, estado, created_at
   - contenedores_programados: matricula_contenedor, naviera, tipo, posicion, empresa_descarga, fecha, hora, matricula_camion, estado
   - contenedores_rotos: matricula_contenedor, naviera, tipo, posicion, detalles, created_at
*/
export default async function handleDepotList({ userText, setMessages }) {
  const { categoria, naviera, tamanio } = parseQuerySlots(userText);

  try {
    let title = "Lista contenedores";
    let subtitle = [];

    if (categoria) title += ` · ${categoria}`;
    if (naviera)   subtitle.push(naviera);
    if (tamanio)   subtitle.push(tamanio);

    // 1) programados
    if (categoria === "programados") {
      let q = supabase
        .from("contenedores_programados")
        .select("matricula_contenedor, naviera, tipo, posicion, empresa_descarga, fecha, hora, estado, created_at")
        .order("created_at", { ascending: false });

      if (naviera) q = q.ilike("naviera", `%${naviera}%`);
      if (tamanio) q = q.ilike("tipo", `%${tamanio}%`);

      const { data, error } = await q;
      if (error) throw error;

      const rows = (data || []).map(r => ({
        ...r,
        // safe formatting
        tipo: r.tipo || "",
        fecha: r.fecha || "",
        hora: r.hora || "",
      }));

      const file = `Programados_${new Date().toISOString().slice(0,10)}.xlsx`;
      const onExcel = () => rowsToExcel(rows.map(r => ({
        "Contenedor": r.matricula_contenedor,
        "Naviera": r.naviera,
        "Tipo": r.tipo,
        "Posición": r.posicion,
        "Empresa": r.empresa_descarga,
        "Fecha": r.fecha,
        "Hora": r.hora,
        "Estado": r.estado || "programado",
      })), "Programados", file);

      setMessages(m => [...m,
        { from:"bot", reply_text:"Aquí tienes la lista." },
        { from:"bot", render: () => (
            <ListCard
              title={title}
              subtitle={(subtitle.join(" · ") || "todos") + " · " + new Date().toLocaleDateString("es-ES")}
              rows={rows}
              onExcel={onExcel}
            />
        )},
      ]);
      return;
    }

    // 2) rotos (din contenedores_rotos)
    if (categoria === "rotos") {
      let q = supabase
        .from("contenedores_rotos")
        .select("matricula_contenedor, naviera, tipo, posicion, detalles, created_at")
        .order("created_at", { ascending: false });

      if (naviera) q = q.ilike("naviera", `%${naviera}%`);
      if (tamanio) q = q.ilike("tipo", `%${tamanio}%`);

      const { data, error } = await q;
      if (error) throw error;

      const rows = (data || []).map(r => ({
        ...r,
        estado: "roto",
        empresa_descarga: r.detalles || "",
      }));

      const file = `Rotos_${new Date().toISOString().slice(0,10)}.xlsx`;
      const onExcel = () => rowsToExcel(rows.map(r => ({
        "Contenedor": r.matricula_contenedor,
        "Naviera": r.naviera,
        "Tipo": r.tipo,
        "Posición": r.posicion,
        "Detalles": r.detalles || "",
        "Fecha entrada": r.created_at ? String(r.created_at).slice(0,10) : "",
      })), "Rotos", file);

      setMessages(m => [...m,
        { from:"bot", reply_text:"Aquí tienes la lista." },
        { from:"bot", render: () => (
            <ListCard
              title={title}
              subtitle={(subtitle.join(" · ") || "todos") + " · " + new Date().toLocaleDateString("es-ES")}
              rows={rows}
              onExcel={onExcel}
            />
        )},
      ]);
      return;
    }

    // 3) en depósito (din contenedores) cu opționale: vacio/lleno, naviera, 20/40
    {
      let q = supabase
        .from("contenedores")
        .select("matricula_contenedor, naviera, tipo, posicion, estado, created_at")
        .order("created_at", { ascending: false });

      if (categoria === "vacio") q = q.eq("estado", "vacio");
      if (categoria === "lleno") q = q.eq("estado", "lleno");
      if (naviera) q = q.ilike("naviera", `%${naviera}%`);
      if (tamanio) q = q.ilike("tipo", `%${tamanio}%`);

      const { data, error } = await q;
      if (error) throw error;

      const rows = data || [];

      const file = `EnDeposito_${new Date().toISOString().slice(0,10)}.xlsx`;
      const onExcel = () => rowsToExcel(rows.map(r => ({
        "Contenedor": r.matricula_contenedor,
        "Naviera": r.naviera,
        "Tipo": r.tipo,
        "Posición": r.posicion,
        "Estado": r.estado,
        "Fecha entrada": r.created_at ? String(r.created_at).slice(0,10) : "",
      })), "En Deposito", file);

      setMessages(m => [...m,
        { from:"bot", reply_text:"Aquí tienes la lista." },
        { from:"bot", render: () => (
            <ListCard
              title={title}
              subtitle={(subtitle.join(" · ") || "todos") + " · " + new Date().toLocaleDateString("es-ES")}
              rows={rows}
              onExcel={onExcel}
            />
        )},
      ]);
    }
  } catch (err) {
    console.error("[handleDepotList] error:", err);
    setMessages(m => [...m, { from:"bot", reply_text:"No he podido leer la lista ahora." }]);
  }
}
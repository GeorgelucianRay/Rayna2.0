// src/components/chat/actions/handleProfileStuff.jsx
import React from "react";
import styles from "../Chatbot.module.css";

/* ——— util mic: mapare rol RO/EN → ES pentru afișare */
function roleToEs(raw) {
  const r = String(raw || "").toLowerCase();
  if (["driver", "sofer", "șofer", "soferi", "chauffeur", "conductor"].includes(r)) return "chofer";
  if (["dispecer", "dispatcher", "jefe", "trafic", "traffic", "jefe de trafico", "jefe de tráfico"].includes(r)) return "jefe de tráfico";
  if (["mecanic", "mecánico", "mechanic"].includes(r)) return "mecánico";
  return r || "chofer";
}

/* ——— helpers de citire profil (tolerant la câmpuri) */
const getTruck = (p) => p?.camioane || p?.truck || null;
const getTrailer = (p) => p?.remorci || p?.trailer || null;

const pick = (obj, ...keys) => keys.find((k) => obj?.[k] != null) && obj[keys.find((k) => obj?.[k] != null)];
const txt = (v, def = "—") => (v == null || v === "" ? def : String(v));

/* ——— WHO AM I */
export async function handleWhoAmI({ profile, setMessages }) {
  const nombre = profile?.nombre_completo || profile?.username || "usuario";
  const roleEs = roleToEs(profile?.role || "driver");

  const truck = getTruck(profile);
  const tMarca = truck?.marca || truck?.brand;
  const tPlate = truck?.matricula || truck?.plate;

  const line =
    `Hola, tú eres **${nombre}** (${roleEs}).` +
    (tMarca || tPlate ? ` Conduces un camión ${txt(tMarca, "")}${tMarca && tPlate ? " · " : ""}${txt(tPlate, "")}.` : "");

  setMessages((m) => [
    ...m,
    { from: "bot", reply_text: line.trim() },
    {
      from: "bot",
      reply_text: "¿Quieres ver tu perfil?",
      render: () => (
        <div className={styles.card}>
          <div className={styles.cardTitle}>Perfil</div>
          <div className={styles.cardActions}>
            <a className={styles.actionBtn} data-variant="primary" href="/mi-perfil">Ver perfil</a>
          </div>
        </div>
      ),
    },
  ]);
}

/* ——— OPEN MY TRUCK */
export async function handleOpenMyTruck({ profile, setMessages }) {
  const truckId = profile?.camion_id || getTruck(profile)?.id;
  const truck = getTruck(profile);
  const marca = truck?.marca || truck?.brand || "Camión";
  const plate = truck?.matricula || truck?.plate || "";

  if (!truckId) {
    setMessages((m) => [
      ...m,
      { from: "bot", reply_text: "No tienes un camión asignado por ahora." },
      {
        from: "bot",
        reply_text: "Puedes revisar o completar tus datos desde tu perfil.",
        render: () => (
          <div className={styles.card}>
            <div className={styles.cardTitle}>Perfil</div>
            <div className={styles.cardActions}>
              <a className={styles.actionBtn} data-variant="primary" href="/mi-perfil">Ver perfil</a>
            </div>
          </div>
        ),
      },
    ]);
    return;
  }

  setMessages((m) => [
    ...m,
    {
      from: "bot",
      reply_text: `Claro, aquí tienes la ficha del camión ${marca}${plate ? " · " + plate : ""}.`,
      render: () => (
        <div className={styles.card}>
          <div className={styles.cardTitle}>Mi camión</div>
          <div className={styles.cardActions}>
            <a className={styles.actionBtn} data-variant="primary" href={`/camion/${truckId}`}>Ver camión</a>
          </div>
        </div>
      ),
    },
  ]);
}

/* ——— DRIVER SELF INFO (intenții cu action: "driver_self_info") */
export async function handleDriverSelfInfo({ profile, intent, setMessages }) {
  const topic = intent?.meta?.topic;

  const truck = getTruck(profile);
  const trailer = getTrailer(profile);
  const driver = profile?.driver || profile || {};

  const out = [];
  switch (topic) {
    case "truck_itv":
      out.push(`La ITV de tu camión es **${txt(truck?.itv)}**.`);
      break;
    case "trailer_itv":
      out.push(`La ITV de tu remolque es **${txt(trailer?.itv)}**.`);
      break;
    case "driver_credentials":
      out.push(`CAP: **${txt(driver?.cap)}** · Carnet: **${txt(driver?.lic || driver?.permiso)}** · ADR: **${txt(driver?.adr)}**`);
      break;
    case "plates":
      out.push(`Camión: **${txt(truck?.plate || truck?.matricula)}** · Remolque: **${txt(trailer?.plate || trailer?.matricula)}**`);
      break;
    case "payroll_summary":
      const pr = profile?.payroll || {};
      out.push(`Este mes: **${txt(pr.dias)}** días · **${txt(pr.km)}** km · **${txt(pr.conts)}** conts · D${txt(pr.desayunos, 0)}/C${txt(pr.cenas, 0)}/P${txt(pr.procenas, 0)}`);
      break;
    case "vacation_balance":
      const vac = profile?.vac || {};
      out.push(`Vacaciones: **${txt(vac.total)}** total · usadas **${txt(vac.usadas)}** · pendientes **${txt(vac.pendientes)}** · disponibles **${txt(vac.disponibles)}**`);
      break;
    default:
      out.push("No tengo claro qué dato necesitas de tu perfil.");
  }

  setMessages((m) => [...m, { from: "bot", reply_text: out.join("\n") }]);
}

/* ——— Vehicul: intenții cu id/action veh_* */
export async function handleVehItvTruck({ profile, setMessages }) {
  const truck = getTruck(profile);
  setMessages((m) => [
    ...m,
    { from: "bot", reply_text: `Consultado ✅ ITV camión: **${txt(truck?.itv)}**.` },
  ]);
}
export async function handleVehItvTrailer({ profile, setMessages }) {
  const trailer = getTrailer(profile);
  setMessages((m) => [
    ...m,
    { from: "bot", reply_text: `Consultado ✅ ITV remolque: **${txt(trailer?.itv)}**.` },
  ]);
}
export async function handleVehOilStatus({ profile, setMessages }) {
  const oil = profile?.vehicle?.oil || {};
  const last = oil.last || profile?.oil_last;
  const next = oil.next || profile?.oil_next;
  setMessages((m) => [
    ...m,
    { from: "bot", reply_text: `Aceite: último **${txt(last)}** · próximo **${txt(next)}**.` },
  ]);
}
export async function handleVehAdblueFilterStatus({ profile, setMessages }) {
  const ad = profile?.vehicle?.adblue || {};
  setMessages((m) => [
    ...m,
    { from: "bot", reply_text: `Filtro AdBlue: último **${txt(ad.last || profile?.adblue_last)}** · próximo **${txt(ad.next || profile?.adblue_next)}**.` },
  ]);
}

/* ——— Flow: “completar mi perfil” */
export async function handleProfileCompletionStart({ setMessages }) {
  setMessages((m) => [
    ...m,
    {
      from: "bot",
      reply_text:
        "¡Perfecto! Completar tu perfil te da ventajas (accesos rápidos, recordatorios de ITV/CAP/ADR, rutas personalizadas). Te dejo un vídeo corto con el porqué y cómo hacerlo. Si no te apañas, dime **“quiero completar mi perfil”** y lo hacemos juntos.",
      render: () => (
        <div className={styles.card}>
          <div className={styles.cardTitle}>Completar mi perfil</div>
          <div className={styles.cardActions}>
            {/* Placeholder video – adaugi URL când îl ai */}
            <a className={styles.actionBtn} href="#" onClick={(e)=>e.preventDefault()}>Ver vídeo (pronto)</a>
            <a className={styles.actionBtn} data-variant="primary" href="/mi-perfil?edit=1">Ir a editar</a>
          </div>
        </div>
      ),
    },
  ]);
}
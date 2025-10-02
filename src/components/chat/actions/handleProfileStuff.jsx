// src/components/chat/actions/handleProfileStuff.jsx
import React from "react";
import styles from "../Chatbot.module.css";

/* ——— util: traduce rolul intern la ES ——— */
function roleToEs(role = "") {
  const r = String(role).toLowerCase().trim();
  if (r === "sofer" || r === "şofer" || r === "șofer" || r === "driver") return "chofer";
  if (r === "dispecer" || r === "dispatcher") return "Jefe de Tráfico";
  if (r === "mecanic" || r === "mechanic") return "mecánico";
  return r || "chofer";
}

/* ——— QUIÉN SOY ——— */
export async function handleWhoAmI({ profile, setMessages }) {
  const nombre = profile?.nombre_completo || profile?.username || "usuario";
  const rolEs  = roleToEs(profile?.role);

  const truck  = profile?.camioane || profile?.truck || null;
  const marca  = truck?.marca || truck?.brand || "";
  const plate  = truck?.matricula || truck?.plate || "";
  const line1  = `Hola, tú eres **${nombre}** (${rolEs}).`;
  const line2  = "¿Quieres ver tu perfil?";

  const extra =
    marca || plate ? ` Llevas un camión ${[marca, plate].filter(Boolean).join(" · ")}.` : "";

  setMessages(m => [
    ...m,
    { from: "bot", reply_text: line1 + extra },
    {
      from: "bot",
      reply_text: line2,
      render: () => (
        <div className={styles.card}>
          <div className={styles.cardTitle}>Perfil</div>
          <div className={styles.cardActions}>
            <a className={styles.actionBtn} data-variant="primary" href="/mi-perfil">
              Ver perfil
            </a>
          </div>
        </div>
      )
    }
  ]);
}

/* ——— ABRIR MI CAMIÓN ——— */
export async function handleOpenMyTruck({ profile, setMessages }) {
  const truckId   = profile?.camion_id || profile?.camioane?.id || profile?.truck?.id;
  const truck     = profile?.camioane || profile?.truck || {};
  const marca     = truck?.marca || truck?.brand || "Camión";
  const matricula = truck?.matricula || truck?.plate || "";

  if (!truckId) {
    setMessages(m => [
      ...m,
      { from: "bot", reply_text: "No tienes un camión asignado por ahora." },
      {
        from: "bot",
        reply_text: "Puedes revisar o actualizar tus datos desde tu perfil.",
        render: () => (
          <div className={styles.card}>
            <div className={styles.cardTitle}>Perfil</div>
            <div className={styles.cardActions}>
              <a className={styles.actionBtn} data-variant="primary" href="/mi-perfil">Ver perfil</a>
            </div>
          </div>
        )
      }
    ]);
    return;
  }

  setMessages(m => [
    ...m,
    {
      from: "bot",
      reply_text: `Claro, aquí tienes la ficha del camión ${marca}${matricula ? " · " + matricula : ""}.`,
      render: () => (
        <div className={styles.card}>
          <div className={styles.cardTitle}>Mi camión</div>
          <div className={styles.cardActions}>
            <a className={styles.actionBtn} data-variant="primary" href={`/camion/${truckId}`}>
              Ver camión
            </a>
          </div>
        </div>
      )
    }
  ]);
}

/* ——— SELF INFO (CAP/ADR/licencia/ITV rápidas cu meta.topic) ——— */
export async function handleDriverSelfInfo({ profile, intent, setMessages }) {
  const topic = intent?.meta?.topic;

  if (topic === "truck_itv") {
    const itv = profile?.camioane?.itv || profile?.truck?.itv || "—";
    setMessages(m => [...m, { from: "bot", reply_text: `La ITV de tu camión es **${itv}**.` }]);
    return;
  }
  if (topic === "trailer_itv") {
    const itv = profile?.remolque?.itv || profile?.trailer?.itv || "—";
    setMessages(m => [...m, { from: "bot", reply_text: `La ITV de tu remolque es **${itv}**.` }]);
    return;
  }
  if (topic === "driver_credentials") {
    const cap = profile?.driver?.cap || "—";
    const lic = profile?.driver?.lic || "—";
    const adr = profile?.driver?.adr || "—";
    setMessages(m => [...m, { from: "bot", reply_text: `CAP: **${cap}** · Carnet: **${lic}** · ADR: **${adr}**` }]);
    return;
  }

  setMessages(m => [...m, { from: "bot", reply_text: "No tengo aún ese dato en tu perfil." }]);
}

/* ——— VEHÍCULO: ITV / ACEITE / ADBLUE ——— */
export async function handleVehItvTruck({ profile, setMessages }) {
  const itv = profile?.camioane?.itv || profile?.truck?.itv || "—";
  setMessages(m => [...m, { from: "bot", reply_text: `ITV camión: **${itv}**.` }]);
}

export async function handleVehItvTrailer({ profile, setMessages }) {
  const itv = profile?.remolque?.itv || profile?.trailer?.itv || "—";
  setMessages(m => [...m, { from: "bot", reply_text: `ITV remolque: **${itv}**.` }]);
}

export async function handleVehOilStatus({ profile, setMessages }) {
  const last = profile?.mantenimientos?.aceite?.ultimo || "—";
  const next = profile?.mantenimientos?.aceite?.proximo || "—";
  setMessages(m => [...m, { from: "bot", reply_text: `Aceite — último: **${last}** · próximo: **${next}**.` }]);
}

export async function handleVehAdblueFilterStatus({ profile, setMessages }) {
  const last = profile?.mantenimientos?.adblue?.ultimo || "—";
  const next = profile?.mantenimientos?.adblue?.proximo || "—";
  setMessages(m => [...m, { from: "bot", reply_text: `Filtro AdBlue — último: **${last}** · próximo: **${next}**.` }]);
}

/* ——— INIȚIERE COMPLETARE PROFIL ——— */
export async function handleProfileCompletionStart({ setMessages }) {
  setMessages(m => [
    ...m,
    { from: "bot", reply_text: "Perfecto. Te llevo al formulario para completar tu perfil." },
    {
      from: "bot",
      reply_text: "Pulsa el botón para abrir tu perfil.",
      render: () => (
        <div className={styles.card}>
          <div className={styles.cardTitle}>Perfil</div>
          <div className={styles.cardActions}>
            <a className={styles.actionBtn} data-variant="primary" href="/mi-perfil">Editar perfil</a>
          </div>
        </div>
      )
    }
  ]);
}
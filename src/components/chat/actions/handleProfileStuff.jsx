// src/components/chat/actions/handleProfileStuff.jsx
import React from "react";
import styles from "../Chatbot.module.css";

// funcție helper pentru traducerea rolului la spaniolă
function mapRole(role) {
  switch (role) {
    case "sofer": return "chofer";
    case "dispecer": return "Jefe de Tráfico";
    case "mecanic": return "mecánico";
    default: return role || "usuario";
  }
}

/**
 * Cine sunt eu? ("¿De dónde sabes quién soy?")
 */
export async function handleWhoAmI({ profile, setMessages }) {
  const nombre = profile?.nombre_completo || profile?.username || "usuario";
  const role   = mapRole(profile?.role);

  let line = `Hola, tú eres **${nombre}** (${role}).`;

  setMessages((m) => [
    ...m,
    { from: "bot", reply_text: line },
    {
      from: "bot",
      reply_text: "¿Quieres ver tu perfil?",
      render: () => (
        <div className={styles.card}>
          <div className={styles.cardTitle}>Perfil</div>
          <div className={styles.cardActions}>
            <a className={styles.actionBtn} data-variant="primary" href="/mi-perfil">
              Ver perfil
            </a>
          </div>
        </div>
      ),
    },
  ]);
}

/**
 * Abrir camión asignado
 */
export async function handleOpenMyTruck({ profile, setMessages }) {
  const truckId   = profile?.camion_id || profile?.camioane?.id;
  const truck     = profile?.camioane || null;
  const marca     = truck?.marca || truck?.brand || "Camión";
  const matricula = truck?.matricula || truck?.plate || "";

  if (!truckId) {
    setMessages((m) => [
      ...m,
      { from: "bot", reply_text: "No tienes un camión asignado por ahora." },
      {
        from: "bot",
        reply_text: "Puedes revisar o actualizar tus datos desde tu perfil.",
        render: () => (
          <div className={styles.card}>
            <div className={styles.cardTitle}>Perfil</div>
            <div className={styles.cardActions}>
              <a className={styles.actionBtn} data-variant="primary" href="/mi-perfil">
                Ver perfil
              </a>
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
      ),
    },
  ]);
}

/**
 * Qué sabe Rayna de mí
 */
export async function handleProfileWhatYouKnow({ profile, setMessages }) {
  const adr     = profile?.adr ? "tienes ADR" : "no tienes ADR";
  const camion  = profile?.camioane?.marca || null;
  const remolque = profile?.remolque?.marca || null;

  if (camion && remolque) {
    setMessages((m) => [
      ...m,
      { from: "bot", reply_text: `Mira, sé que ${adr}. Conduces un conjunto formado por camión **${camion}** y remolque **${remolque}**.` },
    ]);
  } else {
    setMessages((m) => [
      ...m,
      { from: "bot", reply_text: `Mira, sé que ${adr}. Ahh! No tienes el conjunto completado. ¿Quieres hacerlo ahora conmigo?` },
    ]);
  }
}

/**
 * Inicia completarea profilului
 */
export async function handleProfileComplete({ setMessages }) {
  setMessages((m) => [
    ...m,
    { from: "bot", reply_text: "Perfecto. Vamos a completar tu perfil paso a paso." },
    {
      from: "bot",
      reply_text: "Abre el editor de perfil:",
      render: () => (
        <div className={styles.card}>
          <div className={styles.cardTitle}>Perfil</div>
          <div className={styles.cardActions}>
            <a className={styles.actionBtn} data-variant="primary" href="/mi-perfil/edit">
              Completar perfil
            </a>
          </div>
        </div>
      ),
    },
  ]);
}

/**
 * Răspuns negativ („No quiero completarlo”)
 */
export async function handleProfileCompleteNo({ setMessages }) {
  setMessages((m) => [
    ...m,
    {
      from: "bot",
      reply_text:
        "Ahh! Ok, pero tengo que decirte que es muy importante que lo tengas completado, te va a dar muchas ventajas. Tú mismo.",
    },
  ]);
}

/**
 * Avantajes del perfil completado
 */
export async function handleProfileAdvantages({ setMessages }) {
  setMessages((m) => [
    ...m,
    { from: "bot", reply_text: "Mira aquí te he preparado un vídeo sobre por qué está bien tenerlo completado y cómo rellenarlo." },
    {
      from: "bot",
      reply_text: "Cuando esté listo el vídeo aparecerá aquí:",
      render: () => (
        <div className={styles.card}>
          <div className={styles.cardTitle}>Ventajas de completar tu perfil</div>
          <div className={styles.cardActions}>
            <button className={styles.actionBtn} disabled>
              🎬 Próximamente
            </button>
          </div>
        </div>
      ),
    },
    { from: "bot", reply_text: "Si no lo consigues solo dime: *quiero completar mi perfil* y yo te ayudo." },
  ]);
}
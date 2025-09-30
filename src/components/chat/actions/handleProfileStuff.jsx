// src/components/chat/actions/handleProfileStuff.jsx
import React from "react";
import styles from "../Chatbot.module.css";

/**
 * Răspunde cu un mic rezumat "cine sunt eu".
 * profile provine din AuthContext (RaynaHub i-l va pasa).
 */
export async function handleWhoAmI({ profile, setMessages }) {
  const nombre = profile?.nombre_completo || profile?.username || "usuario";
  const role   = profile?.role || "driver";

  const truck  = profile?.camioane || null;     // vezi MiPerfilPage: profile.camioane
  const marca  = truck?.marca || truck?.brand || "";
  const plate  = truck?.matricula || truck?.plate || "";

  let line = `Hola, tú eres **${nombre}** (${role}).`;
  if (marca || plate) line += ` Llevas un camión ${marca ? marca : ""}${marca && plate ? " · " : ""}${plate ? plate : ""}.`;

  setMessages(m => [...m, {
    from: "bot",
    reply_text: line
  }, {
    from: "bot",
    reply_text: "¿Quieres ver tu perfil?",
    render: () => (
      <div className={styles.card}>
        <div className={styles.cardTitle}>Perfil</div>
        <div className={styles.cardActions}>
          <a className={`${styles.actionBtn} ${styles.primary}`} href="/mi-perfil">
            Ver perfil
          </a>
        </div>
      </div>
    )
  }]);
}

/**
 * Deschide "fișa camionului meu".
 * Dacă lipsește camionul, spune asta cu grație și oferă buton spre profil.
 */
export async function handleOpenMyTruck({ profile, setMessages }) {
  const truckId   = profile?.camion_id || profile?.camioane?.id;
  const truck     = profile?.camioane || null;
  const marca     = truck?.marca || truck?.brand || "Camión";
  const matricula = truck?.matricula || truck?.plate || "";

  if (!truckId) {
    setMessages(m => [...m, {
      from: "bot",
      reply_text: "No tienes un camión asignado por ahora."
    }, {
      from: "bot",
      reply_text: "Puedes revisar o actualizar tus datos desde tu perfil.",
      render: () => (
        <div className={styles.card}>
          <div className={styles.cardTitle}>Perfil</div>
          <div className={styles.cardActions}>
            <a className={`${styles.actionBtn} ${styles.primary}`} href="/mi-perfil">Ver perfil</a>
          </div>
        </div>
      )
    }]);
    return;
  }

  setMessages(m => [...m, {
    from: "bot",
    reply_text: `Claro, aquí tienes la ficha del camión ${marca}${matricula ? " · " + matricula : ""}.`,
    render: () => (
      <div className={styles.card}>
        <div className={styles.cardTitle}>Mi camión</div>
        <div className={styles.cardActions}>
          <a className={`${styles.actionBtn} ${styles.primary}`} href={`/camion/${truckId}`}>
            Ver camión
          </a>
        </div>
      </div>
    )
  }]);
}
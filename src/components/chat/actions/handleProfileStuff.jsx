// src/components/chat/actions/handleProfileStuff.jsx
import React from "react";
import styles from "../Chatbot.module.css";

/* ---------- mici ajutoare ---------- */

function roleEs(roleRaw) {
  const v = String(roleRaw || "").toLowerCase().trim();
  if (["sofer", "șofer", "soferi", "driver"].includes(v)) return "chofer";
  if (["dispecer", "dispatcher", "dispeceri"].includes(v)) return "Jefe de Tráfico";
  if (["mecanic", "mechanic", "mecanici"].includes(v)) return "mecánico";
  return v || "usuario";
}

function cardLink({ title, href, label = "Abrir", primary = true }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>{title}</div>
      <div className={styles.cardActions}>
        <a
          className={styles.actionBtn}
          href={href}
          data-variant={primary ? "primary" : undefined}
        >
          {label}
        </a>
      </div>
    </div>
  );
}

function yesNoButtons({ onYesHref = "/mi-perfil?edit=1", onNoText }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardActions}>
        <a className={styles.actionBtn} data-variant="primary" href={onYesHref}>
          Sí
        </a>
        <button
          className={styles.actionBtn}
          onClick={() => alert(onNoText || "Entendido.")}
          type="button"
        >
          No
        </button>
      </div>
    </div>
  );
}

/* ---------- WHO AM I / PERFIL ---------- */

export async function handleWhoAmI({ profile, setMessages }) {
  const nombre = profile?.nombre_completo || profile?.username || "usuario";
  const role   = roleEs(profile?.role);

  // Marca/placa — încearcă structurile posibile
  const truck  = profile?.camioane || profile?.truck || null;
  const marca  = truck?.marca || truck?.brand || "";
  const plate  = truck?.matricula || truck?.plate || "";

  let line = `Hola, tú eres **${nombre}** (${role}).`;
  if (marca || plate) {
    line += ` Conduces un camión ${[marca, plate].filter(Boolean).join(" · ")}.`;
  }

  setMessages((m) => [
    ...m,
    { from: "bot", reply_text: line },
    { from: "bot", reply_text: "¿Quieres ver tu perfil?", render: () =>
        cardLink({ title: "Perfil", href: "/mi-perfil", label: "Ver perfil", primary: true })
      },
  ]);
}

export async function handleOpenMyTruck({ profile, setMessages }) {
  const truck     = profile?.camioane || profile?.truck || null;
  const truckId   = profile?.camion_id || truck?.id;
  const marca     = truck?.marca || truck?.brand || "Camión";
  const matricula = truck?.matricula || truck?.plate || "";

  if (!truckId) {
    setMessages((m) => [
      ...m,
      { from: "bot", reply_text: "No tienes un camión asignado por ahora." },
      { from: "bot", reply_text: "Puedes revisar o actualizar tus datos desde tu perfil.",
        render: () => cardLink({ title: "Perfil", href: "/mi-perfil", label: "Ver perfil" }) },
    ]);
    return;
  }

  setMessages((m) => [
    ...m,
    {
      from: "bot",
      reply_text: `Claro, aquí tienes la ficha del camión ${marca}${matricula ? " · " + matricula : ""}.`,
      render: () => cardLink({ title: "Mi camión", href: `/camion/${truckId}`, label: "Ver camión" }),
    },
  ]);
}

/* ---------- SELF INFO generic (me_*) via meta.topic ---------- */

export async function handleDriverSelfInfo({ profile, intent, setMessages }) {
  const t = intent?.meta?.topic;

  // date exemplu; adaptează la structura reală din backend-ul tău
  const driver = profile || {};
  const truck  = driver.camioane || {};
  const trailer = driver.remolque || driver.trailer || {};

  if (t === "truck_itv") {
    const v = truck.itv || truck.itp || driver.truck_itv;
    setMessages((m) => [...m, { from: "bot", reply_text: `La ITV de tu camión es **${v || "desconocida"}**.` }]);
    return;
  }
  if (t === "trailer_itv") {
    const v = trailer.itv || trailer.itp || driver.trailer_itv;
    setMessages((m) => [...m, { from: "bot", reply_text: `La ITV de tu remolque es **${v || "desconocida"}**.` }]);
    return;
  }
  if (t === "driver_credentials") {
    const cap = driver.cap || "—";
    const lic = driver.lic || driver.licencia || "—";
    const adr = driver.adr || "—";
    setMessages((m) => [...m, { from: "bot", reply_text: `CAP: **${cap}** · Carnet: **${lic}** · ADR: **${adr}**` }]);
    return;
  }
  if (t === "plates") {
    const p1 = truck.plate || truck.matricula || "—";
    const p2 = trailer.plate || trailer.matricula || "—";
    setMessages((m) => [...m, { from: "bot", reply_text: `Camión: **${p1}** · Remolque: **${p2}**` }]);
    return;
  }
  if (t === "payroll_summary") {
    const pr = driver.payroll || {};
    const txt = `Este mes: **${pr.dias ?? "—"}** días · **${pr.km ?? "—"}** km · **${pr.conts ?? "—"}** conts · D${pr.desayunos ?? "0"}/C${pr.cenas ?? "0"}/P${pr.procenas ?? "0"}`;
    setMessages((m) => [...m, { from: "bot", reply_text: txt }]);
    return;
  }
  if (t === "vacation_balance") {
    const vac = driver.vac || {};
    const txt = `Vacaciones: **${vac.total ?? "—"}** total · usadas **${vac.usadas ?? "—"}** · pendientes **${vac.pendientes ?? "—"}** · disponibles **${vac.disponibles ?? "—"}**`;
    setMessages((m) => [...m, { from: "bot", reply_text: txt }]);
    return;
  }

  // fallback
  setMessages((m) => [...m, { from: "bot", reply_text: "No tengo claro qué dato de tu perfil me pides." }]);
}

/* ---------- Vehículo: estados rápidos (placeholders seguros) ---------- */

export async function handleVehItvTruck({ profile, setMessages }) {
  const v = profile?.camioane?.itv || profile?.truck_itv || "desconocida";
  setMessages((m) => [...m, { from: "bot", reply_text: `Consulto la ITV de tu camión… Resultado: **${v}**.` }]);
}

export async function handleVehItvTrailer({ profile, setMessages }) {
  const v = profile?.remolque?.itv || profile?.trailer?.itv || "desconocida";
  setMessages((m) => [...m, { from: "bot", reply_text: `Consulto la ITV de tu remolque… Resultado: **${v}**.` }]);
}

export async function handleVehOilStatus({ setMessages }) {
  setMessages((m) => [...m, { from: "bot", reply_text: "Un segundo, miro tu historial de aceite…" }]);
}

export async function handleVehAdblueFilterStatus({ setMessages }) {
  setMessages((m) => [...m, { from: "bot", reply_text: "Reviso tu filtro AdBlue…" }]);
}

/* ---------- Asistent completare profil ---------- */

export async function handleProfileCompletionStart({ setMessages }) {
  setMessages((m) => [
    ...m,
    { from: "bot", reply_text: "Ahh! No tienes el conjunto completado. ¿Quieres hacerlo ahora conmigo?" },
    { from: "bot", reply_text: "Es muy importante tenerlo completado: te facilita rutas, avisos de ITV/ADR, etc." },
    {
      from: "bot",
      reply_text: "Te dejo acceso directo para completarlo.",
      render: () => cardLink({ title: "Completar mi perfil", href: "/mi-perfil?edit=1", label: "Ir a editar", primary: true }),
    },
    {
      from: "bot",
      reply_text: "¿Qué ventajas? Te he preparado un vídeo con el porqué y cómo rellenarlo (pronto).",
      render: () => (
        <div className={styles.card}>
          <div className={styles.cardTitle}>Tutorial (pronto)</div>
          <div className={styles.cardActions}>
            <button className={styles.actionBtn} type="button" disabled>
              Ver vídeo
            </button>
          </div>
        </div>
      ),
    },
  ]);
}
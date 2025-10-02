// src/components/chat/actions/handleProfileStuff.jsx
import React from "react";
import styles from "../Chatbot.module.css";
// ⬆️ la începutul fișierului, lângă celelalte importuri:
import { supabase } from "../../../supabaseClient";

export async function handleProfileAdvantagesVideo({ setMessages }) {
  const NEEDLES = [
    // ES
    "perfil completado", "perfil completo", "ventajas perfil",
    "por qué completar el perfil", "completar perfil",
    // RO / CA – ca în lista ta din screenshot
    "profil completat", "perfil completat"
  ];

  const orFilter = NEEDLES.map(t => `title.ilike.%${t}%`).join(",");

  let url = null;
  try {
    const { data, error } = await supabase
      .from("aprender_links")
      .select("id,title,url")
      .or(orFilter)
      .order("title", { ascending: true })
      .limit(1);

    if (!error && data?.length) url = data[0].url;
  } catch { /* ignorăm; avem fallback */ }

  if (!url) {
    // fallback: oferă card către /aprender (nu dă 404 dacă ruta există / user logat)
    setMessages(m => [
      ...m,
      {
        from: "bot",
        reply_text:
          "Aún no tengo guardado el vídeo con ese título. Te llevo a «Aprender» por si te sirve."
      },
      {
        from: "bot",
        reply_text: "Abre la sección de aprendizaje:",
        render: () => (
          <div className={styles.card}>
            <div className={styles.cardTitle}>Aprender</div>
            <div className={styles.cardActions}>
              <a className={styles.actionBtn} data-variant="primary" href="/aprender">
                Abrir Aprender
              </a>
            </div>
          </div>
        )
      }
    ]);
    return;
  }

  // URL găsit în Supabase → buton extern direct la video
  setMessages(m => [
    ...m,
    {
      from: "bot",
      reply_text:
        "Mira, te he preparado un vídeo sobre la importancia de completar el perfil y cómo hacerlo.",
      render: () => (
        <div className={styles.card}>
          <div className={styles.cardTitle}>Ventajas de completar el perfil</div>
          <div className={styles.cardActions}>
            <a
              className={styles.actionBtn}
              data-variant="primary"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ver vídeo
            </a>
          </div>
        </div>
      )
    }
  ]);
}

/* ——— util: traduce rolul intern la ES ——— */
function roleToEs(role = "") {
  const r = String(role).toLowerCase().trim();
  if (r === "sofer" || r === "şofer" || r === "șofer" || r === "driver") return "chofer";
  if (r === "dispecer" || r === "dispatcher") return "Jefe de Tráfico";
  if (r === "mecanic" || r === "mechanic") return "mecánico";
  return r || "chofer";
}

/* ——— QUIÉN SOY ——— */
export async function handleWhoAmI({ profile, setMessages, setAwaiting }) {
  // folosim utilul tău existent:
  const nombre = profile?.nombre_completo || profile?.username || "usuario";
  const rolEs  = roleToEs(profile?.role);

  const truck  = profile?.camioane || profile?.truck || null;
  const marca  = truck?.marca || truck?.brand || "";
  const plate  = truck?.matricula || truck?.plate || "";
  const extra  = (marca || plate)
    ? ` Llevas un camión ${[marca, plate].filter(Boolean).join(" · ")}.`
    : "";

  setMessages((m) => [
  ...m,
  {
    from: "bot",
    reply_text: `Tú eres ${nombre} (${rolEs}).${extra} ¿Quieres ver tu perfil?`
  }
]);

  // 🔸 aşteptăm confirmarea userului
  setAwaiting("confirm_view_profile");
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
export async function handleWhatDoYouKnowAboutMe({ profile, setMessages, setAwaiting }) {
  const nombre = profile?.nombre_completo || profile?.username || "usuario";
  const rolEs  = (function roleToEs(role = "") {
    const r = String(role).toLowerCase().trim();
    if (["sofer","şofer","șofer","driver"].includes(r)) return "chofer";
    if (["dispecer","dispatcher"].includes(r)) return "Jefe de Tráfico";
    if (["mecanic","mechanic"].includes(r)) return "mecánico";
    return r || "chofer";
  })(profile?.role);

  // date profil
  const drv = profile?.driver || {};
  const truck = profile?.camioane || profile?.truck || {};
  const trailer = profile?.remolque || profile?.trailer || {};

  // bullets dinamice
  const bullets = [];

  bullets.push(`• Te llamas **${nombre}** (${rolEs}).`);

  if (drv?.adr != null) {
    bullets.push(`• ADR: **${drv.adr ? "sí" : "no"}**.`);
  }
  if (drv?.lic) {
    bullets.push(`• Carnet: **${drv.lic}**.`);
  }
  if (drv?.cap) {
    bullets.push(`• CAP: **${drv.cap}**.`);
  }

  if (truck?.marca || truck?.brand || truck?.matricula || truck?.plate) {
    const tMarca = truck?.marca || truck?.brand || "Camión";
    const tPlaca = truck?.matricula || truck?.plate || "";
    bullets.push(`• Camión: **${tMarca}${tPlaca ? " · " + tPlaca : ""}**.`);
  }
  if (trailer?.marca || trailer?.brand || trailer?.matricula || trailer?.plate) {
    const rMarca = trailer?.marca || trailer?.brand || "Remolque";
    const rPlaca = trailer?.matricula || trailer?.plate || "";
    bullets.push(`• Remolque: **${rMarca}${rPlaca ? " · " + rPlaca : ""}**.`);
  }

  const hasCore =
    (drv?.adr != null) || drv?.lic || drv?.cap ||
    truck?.marca || truck?.brand || truck?.matricula || truck?.plate ||
    trailer?.marca || trailer?.brand || trailer?.matricula || trailer?.plate;

  if (hasCore) {
    // ✅ Avem informații — le arătăm
    setMessages(m => [
      ...m,
      { from: "bot", reply_text: "Esto es lo que sé de ti:" },
      { from: "bot", reply_text: bullets.join("\n") },
    ]);
    return;
  }

  // ❌ Nu avem (aproape) nimic în profil
  setMessages(m => [
    ...m,
    { from: "bot", reply_text: "De momento solo sé cómo te llamas, pero puedes contarme más completando tu perfil. ¿Quieres que te ayude?" }
  ]);

  // intrăm în așteptare pt. confirmare (sí/no)
  setAwaiting && setAwaiting("confirm_complete_profile");
}

/* opțional: handler pentru buton/video „Aprender: Perfil completado” */
export async function handleShowAprenderPerfil({ setMessages }) {
  setMessages(m => [
    ...m,
    { from: "bot", reply_text: "Mira, te he preparado un vídeo sobre la importancia de completar el perfil y cómo hacerlo." },
    {
      from: "bot",
      reply_text: "Pulsa el botón para verlo.",
      render: () => (
        <div className={styles.card}>
          <div className={styles.cardTitle}>Aprender</div>
          <div className={styles.cardActions}>
            {/* dacă ai un slug/filtru, schimbă la /aprender?slug=perfil-completado */}
            <a className={styles.actionBtn} data-variant="primary" href="/aprender" target="_blank" rel="noopener noreferrer">
              Aprender: Perfil completado
            </a>
          </div>
        </div>
      ),
    },
  ]);
}
// src/components/chat/actions/handleProfileStuff.jsx
import React from "react";
import styles from "../Chatbot.module.css";
import { supabase } from "../../../supabaseClient";

/* ——— VIDEO: ventajas de completar el perfil (căutare în aprender_links) ——— */
export async function handleProfileAdvantagesVideo({ setMessages }) {
  const NEEDLES = [
    "perfil completado","perfil completo","ventajas perfil",
    "por qué completar el perfil","completar perfil",
    "profil completat","perfil completat"
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
  } catch {}

  if (!url) {
    setMessages(m => [
      ...m,
      { from: "bot", reply_text: "Aún no tengo guardado el vídeo con ese título. Te llevo a «Aprender» por si te sirve." },
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

  setMessages(m => [
    ...m,
    {
      from: "bot",
      reply_text: "Mira, te he preparado un vídeo sobre la importancia de completar el perfil y cómo hacerlo.",
      render: () => (
        <div className={styles.card}>
          <div className={styles.cardTitle}>Ventajas de completar el perfil</div>
          <div className={styles.cardActions}>
            <a className={styles.actionBtn} data-variant="primary" href={url} target="_blank" rel="noopener noreferrer">
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
  const nombre = profile?.nombre_completo || profile?.username || "usuario";
  const rolEs  = roleToEs(profile?.role);

  const truck  = profile?.camioane || profile?.truck || null;
  const marca  = truck?.marca || truck?.brand || "";
  const plate  = truck?.matricula || truck?.plate || "";
  const extra  = (marca || plate)
    ? ` Llevas un camión ${[marca, plate].filter(Boolean).join(" · ")}.`
    : "";

  setMessages(m => [
    ...m,
    { from: "bot", reply_text: `Tú eres **${nombre}** (${rolEs}).${extra} ¿Quieres ver tu perfil?` }
  ]);
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

/* ——— SELF INFO (CAP/ADR/lic/ITV rapide) ——— */
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

/* ——— ¿Qué sabes de mí? ——— */
export async function handleWhatDoYouKnowAboutMe({ profile, setMessages, setAwaiting }) {
  const nombre = profile?.nombre_completo || profile?.username || "usuario";
  const rolEs  = roleToEs(profile?.role);

  // ————— normalizări info driver
  const adr = (profile?.driver?.adr ?? profile?.tiene_adr ?? null);
  const cap = profile?.driver?.cap || profile?.cap_expirare || "";
  const lic = profile?.driver?.lic || profile?.carnet_caducidad || "";

  // ————— normalizări inițiale camion/remorcă din profile
  const truckObj    = profile?.camioane || profile?.truck || {};
  const trailerObj  = profile?.remolque || profile?.trailer || profile?.remorci || {};

  let tMarca = truckObj?.marca || truckObj?.brand || profile?.camion_marca || "";
  let tPlaca = truckObj?.matricula || truckObj?.plate || profile?.camion_matricula || "";
  let rMarca = trailerObj?.marca || trailerObj?.brand || profile?.remorca_marca || "";
  let rPlaca = trailerObj?.matricula || trailerObj?.plate || profile?.remorca_matricula || "";

  // ————— dacă avem ID dar lipsesc detalii → le luăm din DB
  try {
    // camion
    const truckId = profile?.camion_id || truckObj?.id;
    if (truckId && !tMarca && !tPlaca) {
      const { data: t, error: terr } = await supabase
        .from("camioane")
        .select("marca,matricula,brand,plate")
        .eq("id", truckId)
        .maybeSingle();
      if (!terr && t) {
        tMarca = t.marca || t.brand || "";
        tPlaca = t.matricula || t.plate || "";
      }
    }
    // remorcă (tabela ta pare a fi „remorci”; schimbă la „remolques” dacă așa se numește)
    const trailerId = profile?.remorca_id || trailerObj?.id;
    if (trailerId && !rMarca && !rPlaca) {
      const { data: r, error: rerr } = await supabase
        .from("remorci")
        .select("marca,matricula,brand,plate")
        .eq("id", trailerId)
        .maybeSingle();
      if (!rerr && r) {
        rMarca = r.marca || r.brand || "";
        rPlaca = r.matricula || r.plate || "";
      }
    }
  } catch (_) {
    // best-effort: ignorăm erorile aici ca să nu stricăm răspunsul
  }

  // ————— compunem răspunsul
  const bullets = [];
  bullets.push(`• Te llamas **${nombre}** (${rolEs}).`);
  if (adr !== null) bullets.push(`• ADR: **${adr ? "sí" : "no"}**.`);
  if (lic)          bullets.push(`• Carnet: **${lic}**.`);
  if (cap)          bullets.push(`• CAP: **${cap}**.`);

  const hadTruckId   = !!(profile?.camion_id || truckObj?.id);
  const hadTrailerId = !!(profile?.remorca_id || trailerObj?.id);

  if (tMarca || tPlaca) {
    bullets.push(`• Camión: **${tMarca || "—"}${tPlaca ? " · " + tPlaca : ""}**.`);
  } else if (hadTruckId) {
    bullets.push("• Tienes un camión asignado.");
  }

  if (rMarca || rPlaca) {
    bullets.push(`• Remolque: **${rMarca || "—"}${rPlaca ? " · " + rPlaca : ""}**.`);
  } else if (hadTrailerId) {
    bullets.push("• Tienes un remolque asignado.");
  }

  const hasCore =
    adr !== null || !!lic || !!cap || (tMarca || tPlaca || hadTruckId) || (rMarca || rPlaca || hadTrailerId);

  if (hasCore) {
    setMessages(m => [
      ...m,
      { from: "bot", reply_text: "Esto es lo que sé de ti:" },
      { from: "bot", reply_text: bullets.join("\n") },
    ]);
    return;
  }

  setMessages(m => [
    ...m,
    { from: "bot", reply_text: "De momento solo sé cómo te llamas, pero puedes contarme más completando tu perfil. ¿Quieres que te ayude?" }
  ]);
  setAwaiting && setAwaiting("confirm_complete_profile");
}

/* ——— Card «Aprender: Perfil completado» (fallback manual) ——— */
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
            <a className={styles.actionBtn} data-variant="primary" href="/aprender" target="_blank" rel="noopener noreferrer">
              Aprender: Perfil completado
            </a>
          </div>
        </div>
      )
    }
  ]);
}
// ─────────────────────────────────────────────────────────────────────────────
// WIZARD: completar perfil en chat (CAP, carnet, ADR, camión, remolque)
// ─────────────────────────────────────────────────────────────────────────────

/** Parsează “orice” dată într-un YYYY-MM-DD (acceptă 12/5/26, 12-05-2026, 2026-05-12 etc.) */
function parseDateLoose(input) {
  if (!input) return null;
  const txt = String(input).trim()
    .toLowerCase()
    .replace(/\s+de\s+/g, "/")      // 12 de marzo de 2026 -> 12/marzo/2026
    .replace(/[.\-]/g, "/");        // 12-05-2026 -> 12/05/2026

  // 1) ISO direct
  if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(txt) || /^\d{4}-\d{1,2}-\d{1,2}$/.test(input)) {
    const [y, m, d] = txt.split(/[\/\-]/).map(Number);
    if (y >= 1900 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    }
  }

  // 2) Zi/lună/an cu / (12/5/26) sau cu nume de lună (12/mayo/2026)
  const MONTHS = {
    "ene":"01","enero":"01","jan":"01","january":"01",
    "feb":"02","febrero":"02","february":"02",
    "mar":"03","marzo":"03","march":"03",
    "abr":"04","abril":"04","april":"04",
    "mai":"05","mayo":"05","may":"05",
    "iun":"06","junio":"06","june":"06",
    "iul":"07","julio":"07","july":"07",
    "ago":"08","agosto":"08","aug":"08","august":"08",
    "sep":"09","sept":"09","septiembre":"09","september":"09",
    "oct":"10","octubre":"10","october":"10",
    "nov":"11","noviembre":"11","november":"11",
    "dec":"12","dic":"12","diciembre":"12","december":"12",
  };

  const parts = txt.split("/");
  if (parts.length === 3) {
    let [d, m, y] = parts;

    // lună ca text?
    if (isNaN(Number(m)) && MONTHS[m]) m = MONTHS[m];

    d = Number(d);
    m = Number(m);

    // an cu 2 cifre -> 20xx
    y = String(y);
    if (y.length === 2) y = (Number(y) <= 69 ? "20" : "19") + y;
    y = Number(y);

    if (y >= 1900 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    }
  }

  return null;
}

/** update parțial în tabela profiles */
async function updateProfileFields(userId, fields) {
  if (!userId) return { error: "No user id" };
  const { error } = await supabase
    .from("profiles")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", userId);
  return { error };
}

/** Start wizard */
export async function handleProfileWizardStart({ setMessages, setAwaiting }) {
  setMessages(m => [
    ...m,
    { from: "bot", reply_text: "Empezamos a completar tu perfil. Primero, ¿cuándo te caduca el CAP?" }
  ]);
  setAwaiting("pf_cap_date");
}

/** Un singur handler pentru toți pașii wizard-ului */
export async function handleProfileWizardStep({ awaiting, userText, profile, setMessages, setAwaiting }) {
  const userId = profile?.id || profile?.user_id;

  // helper “reciclabil” pentru întrebare invalidă la dată
  const askRetry = (msg) => {
    setMessages(m => [...m, { from: "bot", reply_text: msg }]);
  };

  // ── CAP caducidad ─────────────────────────────────────────────
  if (awaiting === "pf_cap_date") {
    const iso = parseDateLoose(userText);
    if (!iso) return askRetry("No he entendido la fecha del CAP. Dímela en formato libre (ej.: 15/05/2026).");

    const { error } = await updateProfileFields(userId, { cap_expirare: iso });
    if (error) return askRetry("No he podido guardar el CAP. Intenta otra vez.");

    setMessages(m => [
      ...m,
      { from: "bot", reply_text: `Perfecto, CAP: **${iso}**.` },
      { from: "bot", reply_text: "Ahora dime, ¿cuándo te caduca el carnet de conducir?" }
    ]);
    setAwaiting("pf_lic_date");
    return;
  }

  // ── Carnet caducidad ─────────────────────────────────────────
  if (awaiting === "pf_lic_date") {
    const iso = parseDateLoose(userText);
    if (!iso) return askRetry("No he entendido la fecha del carnet. Dímela en formato libre (ej.: 12-12-2025).");

    const { error } = await updateProfileFields(userId, { carnet_caducidad: iso });
    if (error) return askRetry("No he podido guardar el carnet. Intenta otra vez.");

    setMessages(m => [
      ...m,
      { from: "bot", reply_text: `Genial, carnet: **${iso}**.` },
      { from: "bot", reply_text: "¿Tienes ADR? (sí / no)" }
    ]);
    setAwaiting("pf_adr_yesno");
    return;
  }

  // ── ADR (sí/no) ──────────────────────────────────────────────
  if (awaiting === "pf_adr_yesno") {
    const n = String(userText).trim().toLowerCase();
    const YES = ["si","sí","da","yes","ok","vale","hai","sure","claro","correcto"];
    const NO  = ["no","nop","nu","nope"];

    if (YES.includes(n)) {
      const { error } = await updateProfileFields(userId, { tiene_adr: true });
      if (error) return askRetry("No he podido guardar el ADR. Intenta otra vez.");
      setMessages(m => [
        ...m,
        { from: "bot", reply_text: "Perfecto. ¿Cuál es la fecha de caducidad del ADR?" }
      ]);
      setAwaiting("pf_adr_date");
      return;
    }

    if (NO.includes(n)) {
      const { error } = await updateProfileFields(userId, { tiene_adr: false, adr_caducidad: null });
      if (error) return askRetry("No he podido guardar el ADR. Intenta otra vez.");
      // trecem la camión
      setMessages(m => [
        ...m,
        { from: "bot", reply_text: "Entendido (ADR: no)." },
        { from: "bot", reply_text: "Dime la matrícula de tu **camión** (ej.: 1710KKY). Si no tienes, escribe «no»." }
      ]);
      setAwaiting("pf_truck_plate");
      return;
    }

    askRetry("Te entiendo con «sí» o «no». ¿Tienes ADR?");
    return;
  }

  // ── ADR caducidad ────────────────────────────────────────────
  if (awaiting === "pf_adr_date") {
    const iso = parseDateLoose(userText);
    if (!iso) return askRetry("No he entendido la fecha del ADR. Dímela en formato libre (ej.: 12/07/2027).");

    const { error } = await updateProfileFields(userId, { adr_caducidad: iso, tiene_adr: true });
    if (error) return askRetry("No he podido guardar el ADR. Intenta otra vez.");

    setMessages(m => [
      ...m,
      { from: "bot", reply_text: `Anotado, ADR: **${iso}**.` },
      { from: "bot", reply_text: "Dime la matrícula de tu **camión** (ej.: 1710KKY). Si no tienes, escribe «no»." }
    ]);
    setAwaiting("pf_truck_plate");
    return;
  }

  // ── Camión: matrícula ────────────────────────────────────────
  if (awaiting === "pf_truck_plate") {
    const txt = String(userText).trim().toUpperCase();
    if (txt === "NO") {
      setMessages(m => [
        ...m,
        { from: "bot", reply_text: "Ok, sin camión asignado." },
        { from: "bot", reply_text: "¿Y tu **remolque**? Dime la matrícula o «no» si no tienes." }
      ]);
      setAwaiting("pf_trailer_plate");
      return;
    }

    // salvăm în profiles câmpul temporar folosit deja de modalul tău
    const { error } = await updateProfileFields(userId, { new_camion_matricula: txt });
    if (error) return askRetry("No he podido guardar la matrícula del camión. Intenta otra vez.");

    setMessages(m => [
      ...m,
      { from: "bot", reply_text: `Camión anotado: **${txt}**.` },
      { from: "bot", reply_text: "Ahora, matrícula del **remolque** o «no» si no tienes." }
    ]);
    setAwaiting("pf_trailer_plate");
    return;
  }

  // ── Remolque: matrícula ──────────────────────────────────────
  if (awaiting === "pf_trailer_plate") {
    const txt = String(userText).trim().toUpperCase();
    if (txt !== "NO") {
      const { error } = await updateProfileFields(userId, { new_remorca_matricula: txt });
      if (error) return askRetry("No he podido guardar la matrícula del remolque. Intenta otra vez.");
      setMessages(m => [...m, { from: "bot", reply_text: `Remolque anotado: **${txt}**.` }]);
    } else {
      setMessages(m => [...m, { from: "bot", reply_text: "Ok, sin remolque asignado." }]);
    }

    // Final
    setMessages(m => [
      ...m,
      { from: "bot", reply_text: "¡Listo! He guardado los cambios. Puedes revisar o completar más detalles desde tu perfil." },
      {
        from: "bot",
        reply_text: "Abrir mi perfil:",
        render: () => (
          <div className={styles.card}>
            <div className={styles.cardTitle}>Perfil</div>
            <div className={styles.cardActions}>
              <a className={styles.actionBtn} data-variant="primary" href="/mi-perfil">Ver / Editar perfil</a>
            </div>
          </div>
        )
      }
    ]);
    setAwaiting(null);
    return;
  }
}
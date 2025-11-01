// src/components/chat/actions/handleProfileStuff.jsx
import React from "react";
import styles from "../Chatbot.module.css";
import { supabase } from "../../../supabaseClient";

/* ──────────────────────────────────────────────────────────────
   UTIL: mini i18n (alege textul în funcție de lang)
   Dacă nu primești lang în props, presupunem "es".
   Folosește: T(lang, {es:"...", ro:"...", ca:"..."})
────────────────────────────────────────────────────────────── */
function T(lang = "es", bag = {}) {
  return bag[lang] || bag.es || bag.ro || bag.ca || "";
}

/* ——— util: traduce rolul intern la ES (afișaj) ——— */
function roleToEs(role = "") {
  const r = String(role).toLowerCase().trim();
  if (r === "sofer" || r === "şofer" || r === "șofer" || r === "driver") return "chofer";
  if (r === "dispecer" || r === "dispatcher") return "Jefe de Tráfico";
  if (r === "mecanic" || r === "mechanic") return "mecánico";
  return r || "chofer";
}

/* ——— helper: dd/mm/yyyy ——— */
function fmtDateDDMMYYYY(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(+d)) return null;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

/* ——— DB fetch ITV (camión/remolque) ——— */
async function getTruckItvByProfile(profile) {
  const truckId = profile?.camion_id;
  if (!truckId) return null;
  const { data, error } = await supabase
    .from("camioane")
    .select("fecha_itv")
    .eq("id", truckId)
    .maybeSingle();
  if (error || !data) return null;
  return fmtDateDDMMYYYY(data.fecha_itv) || data.fecha_itv || null;
}

async function getTrailerItvByProfile(profile) {
  const trailerId = profile?.remorca_id;
  if (!trailerId) return null;
  const { data, error } = await supabase
    .from("remorci")
    .select("fecha_itv")
    .eq("id", trailerId)
    .maybeSingle();
  if (error || !data) return null;
  return fmtDateDDMMYYYY(data.fecha_itv) || data.fecha_itv || null;
}

/* ——— VIDEO: ventajas de completar el perfil (căutare în aprender_links) ——— */
export async function handleProfileAdvantagesVideo({ setMessages, lang = "es" }) {
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
      { from: "bot", reply_text: T(lang, {
          es: "Aún no tengo guardado el vídeo con ese título. Te llevo a «Aprender» por si te sirve.",
          ro: "Încă nu am salvat videoclipul cu acel titlu. Te duc la «Învață» poate te ajută.",
          ca: "Encara no tinc guardat el vídeo amb aquest títol. Et porto a «Aprendre» per si et serveix."
      }) },
      {
        from: "bot",
        reply_text: T(lang, {
          es: "Abre la sección de aprendizaje:",
          ro: "Deschide secțiunea de învățare:",
          ca: "Obre la secció d'aprenentatge:"
        }),
        render: () => (
          <div className={styles.card}>
            <div className={styles.cardTitle}>{T(lang,{es:"Aprender",ro:"Învață",ca:"Aprendre"})}</div>
            <div className={styles.cardActions}>
              <a className={styles.actionBtn} data-variant="primary" href="/aprender">
                {T(lang,{es:"Abrir Aprender",ro:"Deschide Învață",ca:"Obrir Aprendre"})}
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
      reply_text: T(lang, {
        es: "Mira, te he preparado un vídeo sobre la importancia de completar el perfil y cómo hacerlo.",
        ro: "Uite, ți-am pregătit un video despre importanța completării profilului și cum se face.",
        ca: "Mira, t'he preparat un vídeo sobre la importància de completar el perfil i com fer-ho."
      }),
      render: () => (
        <div className={styles.card}>
          <div className={styles.cardTitle}>{T(lang,{
            es:"Ventajas de completar el perfil",
            ro:"Avantajele completării profilului",
            ca:"Avantatges de completar el perfil"
          })}</div>
          <div className={styles.cardActions}>
            <a className={styles.actionBtn} data-variant="primary" href={url} target="_blank" rel="noopener noreferrer">
              {T(lang,{es:"Ver vídeo",ro:"Vezi video",ca:"Veure vídeo"})}
            </a>
          </div>
        </div>
      )
    }
  ]);
}

/* ——— QUIÉN SOY ——— */
export async function handleWhoAmI({ profile, setMessages, setAwaiting, lang = "es" }) {
  const nombre = profile?.nombre_completo || profile?.username || T(lang,{es:"usuario",ro:"utilizator",ca:"usuari"});
  const rolEs  = roleToEs(profile?.role);

  const truck  = profile?.camioane || profile?.truck || null;
  const marca  = truck?.marca || truck?.brand || "";
  const plate  = truck?.matricula || truck?.plate || "";
  const extra  = (marca || plate)
    ? T(lang,{
        es:` Llevas un camión ${[marca, plate].filter(Boolean).join(" · ")}.`,
        ro:` Conduci un camion ${[marca, plate].filter(Boolean).join(" · ")}.`,
        ca:` Portes un camió ${[marca, plate].filter(Boolean).join(" · ")}.`
      })
    : "";

  setMessages(m => [
    ...m,
    { from: "bot",
      reply_text: `${T(lang,{es:"Tú eres",ro:"Tu ești",ca:"Tu ets"})} **${nombre}** (${rolEs}).${extra} ${T(lang,{
        es:"¿Quieres ver tu perfil?",
        ro:"Vrei să-ți vezi profilul?",
        ca:"Vols veure el teu perfil?"
      })}`
    }
  ]);
  setAwaiting("confirm_view_profile");
}

/* ——— SELF INFO (CAP/ADR/lic/ITV rapide, cu fallback DB) ——— */
export async function handleDriverSelfInfo({ profile, intent, setMessages, lang = "es" }) {
  const topic = intent?.meta?.topic;

  // etichete ITV/ITP per limbă
  const L_Camion = T(lang,{es:"ITV camión", ro:"ITP camion", ca:"ITV camió"});
  const L_Remolq = T(lang,{es:"ITV remolque", ro:"ITP remorcă", ca:"ITV remolc"});

  if (topic === "truck_itv") {
    let itv =
      profile?.camioane?.itv ||
      profile?.truck?.itv ||
      profile?.camion_fecha_itv ||
      profile?.fecha_itv ||
      null;

    if (!itv) { try { itv = await getTruckItvByProfile(profile); } catch {} }

    setMessages(m => [...m, {
      from: "bot",
      reply_text: `${L_Camion}: **${itv || "—"}**.`
    }]);
    return;
  }

  if (topic === "trailer_itv") {
    let itv =
      profile?.remolque?.itv ||
      profile?.trailer?.itv ||
      profile?.remorca_fecha_itv ||
      null;

    if (!itv) { try { itv = await getTrailerItvByProfile(profile); } catch {} }

    setMessages(m => [...m, {
      from: "bot",
      reply_text: `${L_Remolq}: **${itv || "—"}**.`
    }]);
    return;
  }

  if (topic === "driver_credentials") {
    const capRaw = profile?.cap_expirare ?? null;
    const licRaw = profile?.carnet_caducidad ?? null;
    const hasAdr = profile?.tiene_adr ?? null;
    const adrRaw = profile?.adr_caducidad ?? null;

    const cap = fmtDateDDMMYYYY(capRaw) || capRaw || "—";
    const lic = fmtDateDDMMYYYY(licRaw) || licRaw || "—";

    let adrOut = "—";
    if (hasAdr === true) {
      adrOut = fmtDateDDMMYYYY(adrRaw) || adrRaw || T(lang,{es:"Sí",ro:"Da",ca:"Sí"});
    } else if (hasAdr === false) {
      adrOut = T(lang,{es:"No",ro:"Nu",ca:"No"});
    }

    setMessages(m => [
      ...m,
      { from: "bot",
        reply_text: `${T(lang,{es:"CAP",ro:"CAP",ca:"CAP"})}: **${cap}** · ${T(lang,{es:"Carnet",ro:"Permis",ca:"Carnet"})}: **${lic}** · ADR: **${adrOut}**`
      }
    ]);
    return;
  }

  setMessages(m => [
    ...m,
    { from: "bot", reply_text: T(lang,{
      es:"No tengo aun ese dato en tu perfil.",
      ro:"Încă nu am acel detaliu în profilul tău.",
      ca:"Encara no tinc aquesta dada al teu perfil."
    }) }
  ]);
}

/* ——— ABRIR MI CAMIÓN ——— */
export async function handleOpenMyTruck({ profile, setMessages, lang = "es" }) {
  const truckId   = profile?.camion_id || profile?.camioane?.id || profile?.truck?.id;
  const truck     = profile?.camioane || profile?.truck || {};
  const marca     = truck?.marca || truck?.brand || T(lang,{es:"Camión",ro:"Camion",ca:"Camió"});
  const matricula = truck?.matricula || truck?.plate || "";

  if (!truckId) {
    setMessages(m => [
      ...m,
      { from: "bot", reply_text: T(lang,{
        es:"No tienes un camión asignado por ahora.",
        ro:"Nu ai un camion asignat deocamdată.",
        ca:"No tens un camió assignat ara mateix."
      }) },
      {
        from: "bot",
        reply_text: T(lang,{
          es:"Puedes revisar o actualizar tus datos desde tu perfil.",
          ro:"Poți verifica sau actualiza datele din profil.",
          ca:"Pots revisar o actualitzar les teves dades des del perfil."
        }),
        render: () => (
          <div className={styles.card}>
            <div className={styles.cardTitle}>{T(lang,{es:"Perfil",ro:"Profil",ca:"Perfil"})}</div>
            <div className={styles.cardActions}>
              <a className={styles.actionBtn} data-variant="primary" href="/mi-perfil">
                {T(lang,{es:"Ver perfil",ro:"Vezi profil",ca:"Veure perfil"})}
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
      reply_text: T(lang,{
        es:`Claro, aquí tienes la ficha del camión ${marca}${matricula ? " · " + matricula : ""}.`,
        ro:`Sigur, aici ai fișa camionului ${marca}${matricula ? " · " + matricula : ""}.`,
        ca:`És clar, aquí tens la fitxa del camió ${marca}${matricula ? " · " + matricula : ""}.`
      }),
      render: () => (
        <div className={styles.card}>
          <div className={styles.cardTitle}>{T(lang,{es:"Mi camión",ro:"Camionul meu",ca:"El meu camió"})}</div>
          <div className={styles.cardActions}>
            <a className={styles.actionBtn} data-variant="primary" href={`/camion/${truckId}`}>
              {T(lang,{es:"Ver camión",ro:"Vezi camion",ca:"Veure camió"})}
            </a>
          </div>
        </div>
      )
    }
  ]);
}

/* ——— VEHÍCULO: ITV / ACEITE / ADBLUE ——— */
export async function handleVehItvTruck({ profile, setMessages, lang = "es" }) {
  const itv = await getTruckItvByProfile(profile);
  const label = T(lang,{es:"ITV camión", ro:"ITP camion", ca:"ITV camió"});
  setMessages(m => [
    ...m,
    { from: "bot", reply_text: itv
      ? `${label}: **${itv}**.`
      : T(lang,{
          es:"No encuentro la ITV del camión asociado a tu perfil.",
          ro:"Nu găsesc ITP-ul camionului asociat profilului tău.",
          ca:"No trobo la ITV del camió associat al teu perfil."
        })
    }
  ]);
}

export async function handleVehItvTrailer({ profile, setMessages, lang = "es" }) {
  const itv = await getTrailerItvByProfile(profile);
  const label = T(lang,{es:"ITV remolque", ro:"ITP remorcă", ca:"ITV remolc"});
  setMessages(m => [
    ...m,
    { from: "bot", reply_text: itv
      ? `${label}: **${itv}**.`
      : T(lang,{
          es:"No encuentro la ITV del remolque asociado a tu perfil.",
          ro:"Nu găsesc ITP-ul remorcii asociate profilului tău.",
          ca:"No trobo la ITV del remolc associat al teu perfil."
        })
    }
  ]);
}

export async function handleVehOilStatus({ profile, setMessages, lang = "es" }) {
  const last = profile?.mantenimientos?.aceite?.ultimo || "—";
  const next = profile?.mantenimientos?.aceite?.proximo || "—";
  setMessages(m => [...m, {
    from: "bot",
    reply_text: T(lang,{
      es:`Aceite — último: **${last}** · próximo: **${next}**.`,
      ro:`Ulei — ultimul: **${last}** · următorul: **${next}**.`,
      ca:`Oli — últim: **${last}** · proper: **${next}**.`
    })
  }]);
}

export async function handleVehAdblueFilterStatus({ profile, setMessages, lang = "es" }) {
  const last = profile?.mantenimientos?.adblue?.ultimo || "—";
  const next = profile?.mantenimientos?.adblue?.proximo || "—";
  setMessages(m => [...m, {
    from: "bot",
    reply_text: T(lang,{
      es:`Filtro AdBlue — último: **${last}** · próximo: **${next}**.`,
      ro:`Filtru AdBlue — ultimul: **${last}** · următorul: **${next}**.`,
      ca:`Filtre AdBlue — últim: **${last}** · proper: **${next}**.`
    })
  }]);
}

/* ——— INIȚIERE COMPLETARE PROFIL ——— */
export async function handleProfileCompletionStart({ setMessages, lang = "es" }) {
  setMessages(m => [
    ...m,
    { from: "bot", reply_text: T(lang,{
      es:"Perfecto. Te llevo al formulario para completar tu perfil.",
      ro:"Perfect. Te duc la formularul pentru completarea profilului.",
      ca:"Perfecte. Et porto al formulari per completar el teu perfil."
    }) },
    {
      from: "bot",
      reply_text: T(lang,{
        es:"Pulsa el botón para abrir tu perfil.",
        ro:"Apasă butonul pentru a-ți deschide profilul.",
        ca:"Prem el botó per obrir el teu perfil."
      }),
      render: () => (
        <div className={styles.card}>
          <div className={styles.cardTitle}>{T(lang,{es:"Perfil",ro:"Profil",ca:"Perfil"})}</div>
          <div className={styles.cardActions}>
            <a className={styles.actionBtn} data-variant="primary" href="/mi-perfil">
              {T(lang,{es:"Editar perfil",ro:"Editează profil",ca:"Editar perfil"})}
            </a>
          </div>
        </div>
      )
    }
  ]);
}

/* ——— ¿Qué sabes de mí? ——— */
export async function handleWhatDoYouKnowAboutMe({ profile, setMessages, setAwaiting, lang = "es" }) {
  const nombre = profile?.nombre_completo || profile?.username || T(lang,{es:"usuario",ro:"utilizator",ca:"usuari"});
  const rolEs  = roleToEs(profile?.role);

  // — normalizări info driver
  const adr = (profile?.driver?.adr ?? profile?.tiene_adr ?? null);
  const cap = profile?.driver?.cap || profile?.cap_expirare || "";
  const lic = profile?.driver?.lic || profile?.carnet_caducidad || "";

  // — normalizări inițiale camion/remorcă din profile
  const truckObj    = profile?.camioane || profile?.truck || {};
  const trailerObj  = profile?.remolque || profile?.trailer || profile?.remorci || {};

  let tMarca = truckObj?.marca || truckObj?.brand || profile?.camion_marca || "";
  let tPlaca = truckObj?.matricula || truckObj?.plate || profile?.camion_matricula || "";
  let rMarca = trailerObj?.marca || trailerObj?.brand || profile?.remorca_marca || "";
  let rPlaca = trailerObj?.matricula || trailerObj?.plate || profile?.remorca_matricula || "";

  // — dacă avem ID dar lipsesc detalii -> DB
  try {
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
  } catch {}

  // — compunem răspunsul (localizat)
  const bullets = [];
  bullets.push(T(lang,{
    es:`• Te llamas **${nombre}** (${rolEs}).`,
    ro:`• Te numești **${nombre}** (${rolEs}).`,
    ca:`• Et dius **${nombre}** (${rolEs}).`
  }));
  if (adr !== null) bullets.push(`• ADR: **${adr ? T(lang,{es:"sí",ro:"da",ca:"sí"}) : T(lang,{es:"no",ro:"nu",ca:"no"})}**.`);
  if (lic) bullets.push(`• ${T(lang,{es:"Carnet",ro:"Permis",ca:"Carnet"})}: **${lic}**.`);
  if (cap) bullets.push(`• CAP: **${cap}**.`);

  const hadTruckId   = !!(profile?.camion_id || truckObj?.id);
  const hadTrailerId = !!(profile?.remorca_id || trailerObj?.id);

  if (tMarca || tPlaca) {
    bullets.push(`• ${T(lang,{es:"Camión",ro:"Camion",ca:"Camió"})}: **${tMarca || "—"}${tPlaca ? " · " + tPlaca : ""}**.`);
  } else if (hadTruckId) {
    bullets.push(`• ${T(lang,{es:"Tienes un camión asignado.",ro:"Ai un camion asignat.",ca:"Tens un camió assignat."})}`);
  }

  if (rMarca || rPlaca) {
    bullets.push(`• ${T(lang,{es:"Remolque",ro:"Remorcă",ca:"Remolc"})}: **${rMarca || "—"}${rPlaca ? " · " + rPlaca : ""}**.`);
  } else if (hadTrailerId) {
    bullets.push(`• ${T(lang,{es:"Tienes un remolque asignado.",ro:"Ai o remorcă asignată.",ca:"Tens un remolc assignat."})}`);
  }

  const hasCore =
    adr !== null || !!lic || !!cap || (tMarca || tPlaca || hadTruckId) || (rMarca || rPlaca || hadTrailerId);

  if (hasCore) {
    setMessages(m => [
      ...m,
      { from: "bot", reply_text: T(lang,{
        es:"Esto es lo que sé de ti:",
        ro:"Iată ce știu despre tine:",
        ca:"Això és el que sé de tu:"
      }) },
      { from: "bot", reply_text: bullets.join("\n") },
    ]);
    return;
  }

  setMessages(m => [
    ...m,
    { from: "bot", reply_text: T(lang,{
      es:"De momento solo sé cómo te llamas, pero puedes contarme más completando tu perfil. ¿Quieres que te ayude?",
      ro:"Deocamdată știu doar cum te numești, dar poți adăuga mai multe completând profilul. Vrei să te ajut?",
      ca:"De moment només sé com et dius, però pots afegir més completant el perfil. Vols que t'ajudi?"
    }) }
  ]);
  setAwaiting && setAwaiting("confirm_complete_profile");
}

/* ——— Card «Aprender: Perfil completado» (fallback manual) ——— */
export async function handleShowAprenderPerfil({ setMessages, lang = "es" }) {
  setMessages(m => [
    ...m,
    { from: "bot", reply_text: T(lang,{
      es:"Mira, te he preparado un vídeo sobre la importancia de completar el perfil y cómo hacerlo.",
      ro:"Uite, ți-am pregătit un video despre importanța completării profilului și cum se face.",
      ca:"Mira, t'he preparat un vídeo sobre la importància de completar el perfil i com fer-ho."
    }) },
    {
      from: "bot",
      reply_text: T(lang,{
        es:"Pulsa el botón para verlo.",
        ro:"Apasă butonul ca să-l vezi.",
        ca:"Prem el botó per veure'l."
      }),
      render: () => (
        <div className={styles.card}>
          <div className={styles.cardTitle}>{T(lang,{es:"Aprender",ro:"Învață",ca:"Aprendre"})}</div>
          <div className={styles.cardActions}>
            <a className={styles.actionBtn} data-variant="primary" href="/aprender" target="_blank" rel="noopener noreferrer">
              {T(lang,{es:"Aprender: Perfil completado",ro:"Învață: Profil completat",ca:"Aprendre: Perfil completat"})}
            </a>
          </div>
        </div>
      )
    }
  ]);
}

/* ──────────────────────────────────────────────────────────────
   WIZARD: completar perfil (CAP, carnet, ADR, camión, remolque)
────────────────────────────────────────────────────────────── */

/** Parsează “orice” dată într-un YYYY-MM-DD */
function parseDateLoose(input) {
  if (!input) return null;
  const txt = String(input).trim()
    .toLowerCase()
    .replace(/\s+de\s+/g, "/")
    .replace(/[.\-]/g, "/");

  if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(txt) || /^\d{4}-\d{1,2}-\d{1,2}$/.test(input)) {
    const [y, m, d] = txt.split(/[\/\-]/).map(Number);
    if (y >= 1900 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    }
  }

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
    if (isNaN(Number(m)) && MONTHS[m]) m = MONTHS[m];
    d = Number(d); m = Number(m);
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
export async function handleProfileWizardStart({ setMessages, setAwaiting, lang = "es" }) {
  setMessages(m => [
    ...m,
    { from: "bot", reply_text: T(lang,{
      es:"Empezamos a completar tu perfil. Primero, ¿cuándo te caduca el CAP?",
      ro:"Începem să-ți completăm profilul. Mai întâi, când îți expiră CAP?",
      ca:"Comencem a completar el teu perfil. Primer, quan et caduca el CAP?"
    }) }
  ]);
  setAwaiting("pf_cap_date");
}

/** Un singur handler pentru toți pașii wizard-ului */
export async function handleProfileWizardStep({ awaiting, userText, profile, setMessages, setAwaiting, lang = "es" }) {
  const userId = profile?.id || profile?.user_id;

  const askRetry = (msg) => setMessages(m => [...m, { from: "bot", reply_text: msg }]);

  // CAP
  if (awaiting === "pf_cap_date") {
    const iso = parseDateLoose(userText);
    if (!iso) return askRetry(T(lang,{
      es:"No he entendido la fecha del CAP. Dímela en formato libre (ej.: 15/05/2026).",
      ro:"Nu am înțeles data CAP. Spune-o liber (ex.: 15/05/2026).",
      ca:"No he entès la data del CAP. Digues-la en format lliure (ex.: 15/05/2026)."
    }));
    const { error } = await updateProfileFields(userId, { cap_expirare: iso });
    if (error) return askRetry(T(lang,{es:"No he podido guardar el CAP. Intenta otra vez.",ro:"Nu am putut salva CAP-ul. Încearcă din nou.",ca:"No he pogut desar el CAP. Torna-ho a provar."}));
    setMessages(m => [
      ...m,
      { from: "bot", reply_text: T(lang,{es:`Perfecto, CAP: **${iso}**.`,ro:`Perfect, CAP: **${iso}**.`,ca:`Perfecte, CAP: **${iso}**.`}) },
      { from: "bot", reply_text: T(lang,{es:"Ahora dime, ¿cuándo te caduca el carnet de conducir?",ro:"Acum spune-mi când îți expiră permisul.",ca:"Ara digue'm quan et caduca el carnet de conduir."}) }
    ]);
    setAwaiting("pf_lic_date");
    return;
  }

  // Carnet
  if (awaiting === "pf_lic_date") {
    const iso = parseDateLoose(userText);
    if (!iso) return askRetry(T(lang,{es:"No he entendido la fecha del carnet. Dímela en formato libre (ej.: 12-12-2025).",ro:"Nu am înțeles data permisului. Spune-o liber (ex.: 12-12-2025).",ca:"No he entès la data del carnet. Digues-la en format lliure (ex.: 12-12-2025)."}));
    const { error } = await updateProfileFields(userId, { carnet_caducidad: iso });
    if (error) return askRetry(T(lang,{es:"No he podido guardar el carnet. Intenta otra vez.",ro:"Nu am putut salva permisul. Încearcă din nou.",ca:"No he pogut desar el carnet. Torna-ho a provar."}));
    setMessages(m => [
      ...m,
      { from: "bot", reply_text: T(lang,{es:`Genial, carnet: **${iso}**.`,ro:`Grozav, permis: **${iso}**.`,ca:`Genial, carnet: **${iso}**.`}) },
      { from: "bot", reply_text: T(lang,{es:"¿Tienes ADR? (sí / no)",ro:"Ai ADR? (da / nu)",ca:"Tens ADR? (sí / no)"}) }
    ]);
    setAwaiting("pf_adr_yesno");
    return;
  }

  // ADR yes/no
  if (awaiting === "pf_adr_yesno") {
    const n = String(userText).trim().toLowerCase();
    const YES = ["si","sí","da","yes","ok","vale","hai","sure","claro","correcto"];
    const NO  = ["no","nop","nu","nope"];

    if (YES.includes(n)) {
      const { error } = await updateProfileFields(userId, { tiene_adr: true });
      if (error) return askRetry(T(lang,{es:"No he podido guardar el ADR. Intenta otra vez.",ro:"Nu am putut salva ADR-ul. Încearcă din nou.",ca:"No he pogut desar l'ADR. Torna-ho a provar."}));
      setMessages(m => [...m, { from: "bot", reply_text: T(lang,{es:"Perfecto. ¿Cuál es la fecha de caducidad del ADR?",ro:"Perfect. Care e data de expirare a ADR?",ca:"Perfecte. Quina és la data de caducitat de l'ADR?"}) }]);
      setAwaiting("pf_adr_date");
      return;
    }

    if (NO.includes(n)) {
      const { error } = await updateProfileFields(userId, { tiene_adr: false, adr_caducidad: null });
      if (error) return askRetry(T(lang,{es:"No he podido guardar el ADR. Intenta otra vez.",ro:"Nu am putut salva ADR-ul. Încearcă din nou.",ca:"No he pogut desar l'ADR. Torna-ho a provar."}));
      setMessages(m => [
        ...m,
        { from: "bot", reply_text: T(lang,{es:"Entendido (ADR: no).",ro:"Înțeles (ADR: nu).",ca:"Entès (ADR: no)."}) },
        { from: "bot", reply_text: T(lang,{es:"Dime la matrícula de tu camión (ej.: 1710KKY). Si no tienes, escribe «no».",ro:"Spune-mi numărul camionului (ex.: 1710KKY). Dacă nu ai, scrie «nu».",ca:"Digue'm la matrícula del teu camió (ex.: 1710KKY). Si no en tens, escriu «no»."}) }
      ]);
      setAwaiting("pf_truck_plate");
      return;
    }

    return askRetry(T(lang,{es:"Te entiendo con «sí» o «no». ¿Tienes ADR?",ro:"Te înțeleg cu «da» sau «nu». Ai ADR?",ca:"T'entenc amb «sí» o «no». Tens ADR?"}));
  }

  // ADR date
  if (awaiting === "pf_adr_date") {
    const iso = parseDateLoose(userText);
    if (!iso) return askRetry(T(lang,{es:"No he entendido la fecha del ADR. Dímela en formato libre (ej.: 12/07/2027).",ro:"Nu am înțeles data ADR. Spune-o liber (ex.: 12/07/2027).",ca:"No he entès la data de l'ADR. Digues-la en format lliure (ex.: 12/07/2027)."}));
    const { error } = await updateProfileFields(userId, { adr_caducidad: iso, tiene_adr: true });
    if (error) return askRetry(T(lang,{es:"No he podido guardar el ADR. Intenta otra vez.",ro:"Nu am putut salva ADR-ul. Încearcă din nou.",ca:"No he pogut desar l'ADR. Torna-ho a provar."}));
    setMessages(m => [
      ...m,
      { from: "bot", reply_text: T(lang,{es:`Anotado, ADR: **${iso}**.`,ro:`Notat, ADR: **${iso}**.`,ca:`Anotat, ADR: **${iso}**.`}) },
      { from: "bot", reply_text: T(lang,{es:"Dime la matrícula de tu camión (ej.: 1710KKY). Si no tienes, escribe «no».",ro:"Spune-mi numărul camionului (ex.: 1710KKY). Dacă nu ai, scrie «nu».",ca:"Digue'm la matrícula del teu camió (ex.: 1710KKY). Si no en tens, escriu «no»."}) }
    ]);
    setAwaiting("pf_truck_plate");
    return;
  }

  // Camión plate
  if (awaiting === "pf_truck_plate") {
    const txt = String(userText).trim().toUpperCase();
    if (txt === "NO") {
      setMessages(m => [
        ...m,
        { from: "bot", reply_text: T(lang,{es:"Ok, sin camión asignado.",ro:"Ok, fără camion asignat.",ca:"D'acord, sense camió assignat."}) },
        { from: "bot", reply_text: T(lang,{es:"¿Y tu remolque? Dime la matrícula o «no» si no tienes.",ro:"Și remorca ta? Spune-mi numărul sau «nu» dacă nu ai.",ca:"I el teu remolc? Digue'm la matrícula o «no» si no en tens."}) }
      ]);
      setAwaiting("pf_trailer_plate");
      return;
    }

    const { error } = await updateProfileFields(userId, { new_camion_matricula: txt });
    if (error) return askRetry(T(lang,{es:"No he podido guardar la matrícula del camión. Intenta otra vez.",ro:"Nu am putut salva numărul camionului. Încearcă din nou.",ca:"No he pogut desar la matrícula del camió. Torna-ho a provar."}));

    setMessages(m => [
      ...m,
      { from: "bot", reply_text: T(lang,{es:`Camión anotado: **${txt}**.`,ro:`Camion notat: **${txt}**.`,ca:`Camió anotat: **${txt}**.`}) },
      { from: "bot", reply_text: T(lang,{es:"Ahora, matrícula del remolque o «no» si no tienes.",ro:"Acum, numărul remorcii sau «nu» dacă nu ai.",ca:"Ara, matrícula del remolc o «no» si no en tens."}) }
    ]);
    setAwaiting("pf_trailer_plate");
    return;
  }

  // Remolque plate
  if (awaiting === "pf_trailer_plate") {
    const txt = String(userText).trim().toUpperCase();
    if (txt !== "NO") {
      const { error } = await updateProfileFields(userId, { new_remorca_matricula: txt });
      if (error) return askRetry(T(lang,{es:"No he podido guardar la matrícula del remolque. Intenta otra vez.",ro:"Nu am putut salva numărul remorcii. Încearcă din nou.",ca:"No he pogut desar la matrícula del remolc. Torna-ho a provar."}));
      setMessages(m => [...m, { from: "bot", reply_text: T(lang,{es:`Remolque anotado: **${txt}**.`,ro:`Remorcă notată: **${txt}**.`,ca:`Remolc anotat: **${txt}**.`}) }]);
    } else {
      setMessages(m => [...m, { from: "bot", reply_text: T(lang,{es:"Ok, sin remolque asignado.",ro:"Ok, fără remorcă asignată.",ca:"D'acord, sense remolc assignat."}) }]);
    }

    setMessages(m => [
      ...m,
      { from: "bot", reply_text: T(lang,{es:"¡Listo! He guardado los cambios. Puedes revisar o completar más detalles desde tu perfil.",ro:"Gata! Am salvat schimbările. Poți verifica sau completa mai multe din profil.",ca:"Llest! He desat els canvis. Pots revisar o completar més detalls des del teu perfil."}) },
      {
        from: "bot",
        reply_text: T(lang,{es:"Abrir mi perfil:",ro:"Deschide profilul meu:",ca:"Obrir el meu perfil:"}),
        render: () => (
          <div className={styles.card}>
            <div className={styles.cardTitle}>{T(lang,{es:"Perfil",ro:"Profil",ca:"Perfil"})}</div>
            <div className={styles.cardActions}>
              <a className={styles.actionBtn} data-variant="primary" href="/mi-perfil">
                {T(lang,{es:"Ver / Editar perfil",ro:"Vezi / Editează profil",ca:"Veure / Editar perfil"})}
              </a>
            </div>
          </div>
        )
      }
    ]);
    setAwaiting(null);
    return;
  }
}
import React, { useEffect, useRef, useState, useMemo } from "react";
import styles from "./Chatbot.module.css";

// hook anti-zoom iOS (ajustează calea dacă folderul e altul)
import useIOSNoInputZoom from "../../hooks/useIOSNoInputZoom";

import { supabase } from "../../supabaseClient";
import { useAuth } from "../../AuthContext.jsx";
import intentsData from "../../rayna.intents.json";
import { detectIntent } from "../../nluEngine";
import ChatMiniMap from "./ChatMiniMap";

import {
  findPlaceByName,
  findPlacesByName,
  findCameraFor,
  getMapsLinkFromRecord,
  pointGeoJSONFromCoords,
  loadGpsList,
} from "./gpsHelpers";

import BotBubble from "./ui/BotBubble";
import ActionCard from "./ui/ActionCard";
import AnnouncementBox from "./ui/AnnouncementBox";
import AddCameraInline from "./ui/AddCameraInline";
import PlaceInfoCard from "./ui/PlaceInfoCard";
import SimpleList from "./ui/SimpleList";
import AddGpsWizard from "./ui/AddGpsWizard"; // ✅ wizard-ul conversațional

/* -------------------- Helpers multilingve + templating -------------------- */

// Heuristică simplă pentru limbă (ES/RO/CA) pe baza textului
function detectLangFromText(text) {
  const t = String(text || "").toLowerCase();
  const hit = (arr) => arr.some(w => t.includes(w));
  if (hit(["qué", "que ", "hola", "buenas", "buenos dias", "buenas tardes", "buenas noches", "cámara", "camara", "abrir", "abre"])) return "es";
  if (hit(["bună", "buna", "salut", "vreau", "ajung", "merg", "unde", "anunț", "anunt", "deschide", "camera"])) return "ro";
  if (hit(["bon dia", "bona tarda", "bona nit", "hola que tal", "què", "vull", "arribar", "càmera", "obre"])) return "ca";
  return null;
}

// Limbă implicită de interfață (navigator → es/ro/ca)
function defaultLang() {
  const nav = (typeof navigator !== "undefined" && navigator.language) ? navigator.language.toLowerCase() : "es";
  if (nav.startsWith("ro")) return "ro";
  if (nav.startsWith("ca")) return "ca";
  return "es";
}

// Extrage textul: poate fi string sau obiect { es, ro, ca }
function pickText(txt, lang) {
  if (txt == null) return "";
  if (typeof txt === "string") return txt;
  return txt[lang] || txt.es || txt.ro || txt.ca || Object.values(txt)[0] || "";
}

// Etichete la fel ca textul, dar acceptă și string
function pickLabel(lbl, lang) {
  if (lbl == null) return "";
  if (typeof lbl === "string") return lbl;
  return lbl[lang] || lbl.es || lbl.ro || lbl.ca || Object.values(lbl)[0] || "";
}

// Înlocuire {{path}} – suportă căi simple cu puncte (ex.: camera.name)
function tpl(str, data = {}) {
  const s = String(str ?? "");
  return s.replace(/{{\s*([^}]+?)\s*}}/g, (_, key) => {
    const path = String(key).split(".").map(k => k.trim());
    let cur = data;
    for (const p of path) {
      if (cur && Object.prototype.hasOwnProperty.call(cur, p)) cur = cur[p];
      else return "";
    }
    return cur == null ? "" : String(cur);
  });
}

/* ------------------------------------------------------------------------ */

export default function RaynaHub() {
  // 👉 anti-zoom iOS
  useIOSNoInputZoom();

  const { profile } = useAuth();
  const role = profile?.role || "driver";

  // limbă implicită UI
  const uiDefaultLang = useMemo(() => defaultLang(), []);
  const [lastLang, setLastLang] = useState(uiDefaultLang);

  // salut inițial (în limba UI)
  const saludoTextRaw = intentsData.find(i => i.id === "saludo")?.response?.text;
  const saludoText = pickText(saludoTextRaw, lastLang) || "¡Hola!";
  const [messages, setMessages] = useState([
    { from: "bot", reply_text: saludoText }
  ]);

  const [text, setText] = useState("");
  const [awaiting, setAwaiting] = useState(null);
  const [saving, setSaving] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // helper: pune întrebarea „qué me puedes decir de X” și o trimite prin același flux
  const askInfoNow = (name) => {
    const q = `qué me puedes decir de ${name}`;
    setText(q);
    setTimeout(() => { send(); }, 0);
  };

  async function send() {
    const userText = text.trim();
    if (!userText) return;

    // detectăm limba pentru acest mesaj (cu fallback pe ultima)
    const msgLang = detectLangFromText(userText) || lastLang || uiDefaultLang;
    if (msgLang !== lastLang) setLastLang(msgLang);

    setMessages(m => [...m, { from: "user", text: userText }]);
    setText("");

    // ——— dialog "anuncio"
    if (awaiting === "anuncio_text") {
      const di = intentsData.find(i => i.id === "set_anuncio")?.dialog;
      if (!(role === "admin" || role === "dispecer")) {
        setMessages(m => [...m, { from: "bot", reply_text: pickText("No tienes permiso para actualizar anuncios.", msgLang) }]);
        setAwaiting(null);
        return;
      }
      setSaving(true);
      const { error } = await supabase.from("anuncios").update({ content: userText }).eq("id", 1);
      setSaving(false);
      setAwaiting(null);
      const ok = pickText(di?.save_ok, msgLang) || "¡Anuncio actualizado con éxito!";
      const err = pickText(di?.save_err, msgLang) || "Ha ocurrido un error al guardar el anuncio.";
      setMessages(m => [...m, { from: "bot", reply_text: error ? err : ok }]);
      return;
    }

    // ——— detect intent
    const det = detectIntent(userText, intentsData);
    const intent = det.intent;
    const slots  = det.slots || {};
    const langFromDetect = det.lang || null;  // suport și pentru NLU care returnează lang
    const lang = langFromDetect || msgLang;

    // ==== STATIC
    if (intent.type === "static") {
      const textOut = pickText(intent.response?.text, lang);
      const objs = intent.response?.objects || [];
      if (!objs.length) {
        setMessages(m => [...m, { from: "bot", reply_text: textOut }]);
        return;
      }
      const first = objs[0];
      if (first?.type === "card") {
        const card = {
          title: pickText(first.title, lang) || "",
          subtitle: pickText(first.subtitle, lang) || "",
          actions: (first.actions || []).map(a => ({
            ...a,
            label: pickLabel(a.label, lang),
            route: a.route,
            newTab: a.newTab
          }))
        };
        setMessages(m => [...m, {
          from: "bot",
          reply_text: textOut,
          render: () => <ActionCard card={card} />
        }]);
        return;
      }
      setMessages(m => [...m, { from: "bot", reply_text: textOut }]);
      return;
    }

    // ==== DIALOG
    if (intent.type === "dialog") {
      const allowed = intent.roles_allowed ? intent.roles_allowed.includes(role) : true;
      if (!allowed) {
        const noPerm = pickText("No tienes permiso para esta acción.", lang);
        setMessages(m => [...m, { from: "bot", reply_text: noPerm }]);
        return;
      }

      // ——— flux existent: add camera inline
      if (intent.dialog?.form === "add_camera_inline") {
        const intro = pickText("Perfecto. Añadamos una cámara:", lang);
        setMessages(m => [...m, {
          from: "bot",
          reply_text: intro,
          render: () => (
            <AddCameraInline
              saving={saving}
              onSubmit={async ({ name, url }) => {
                setSaving(true);
                const { data, error } = await supabase
                  .from("external_links")
                  .insert({ name, url, icon_type: "camera", display_order: 9999 })
                  .select()
                  .single();
                setSaving(false);
                const ok = pickText(intent.dialog?.save_ok, lang) || `¡Listo! Cámara ${data?.name} añadida.`;
                const err = pickText(intent.dialog?.save_err, lang) || "No pude añadir la cámara. Revisa el URL.";
                setMessages(mm => [...mm, { from: "bot", reply_text: error ? err : ok.replace("{{camera.name}}", data?.name || "") }]);
              }}
            />
          )
        }]);
        return;
      }

      if (intent.dialog?.await_key === "anuncio_text") {
        setAwaiting("anuncio_text");
        const ask = pickText(intent.dialog?.ask_text, lang) || "Claro, ¿qué anuncio quieres?";
        setMessages(m => [...m, { from: "bot", reply_text: ask }]);
        return;
      }
    } // end dialog

    // ==== NOU: ACTION – pornește wizard-ul conversațional de adăugare locație
    if (intent.type === "action" && intent.action === "start_gps_add_chat") {
      const intro = pickText(intent.response?.text, lang) || "Vamos a crearla paso a paso (chat).";
      setMessages(m => [...m, {
        from: "bot",
        reply_text: intro,
        render: () => (
          <AddGpsWizard
            onDone={({ openPreviewOf }) => {
              if (openPreviewOf) {
                // injectează automat întrebarea de info pt. card
                setMessages(mm => [...mm, { from: "user", text: `que me puedes decir de ${openPreviewOf}` }]);
              }
            }}
            onCancel={() => setMessages(mm => [...mm, { from: "bot", reply_text: pickText("Cancelado. ¿Algo más?", lang) }])}
          />
        )
      }]);
      return;
    }

    // ==== ACTION: list_all_cameras
    if (intent.type === "action" && intent.action === "list_all_cameras") {
      const { data } = await supabase
        .from("external_links")
        .select("id,name,url,icon_type")
        .eq("icon_type", "camera")
        .order("name");
      const items = (data || []).map(d => ({ ...d, _table: "external_links", nombre: d.name }));
      const txt = pickText(intent.response?.text, lang) || pickText("Aquí tienes todas las cámaras disponibles:", lang);
      setMessages(m => [...m, {
        from: "bot",
        reply_text: txt,
        render: () => (
          <div className={styles.card}>
            <div className={styles.cardTitle}>{pickText({es:"Cámaras", ro:"Camere", ca:"Càmeres"}, lang)}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              {items.map(it => (
                <button key={it.id} className={styles.actionBtn} onClick={() => window.open(it.url, "_blank", "noopener")}>
                  {it.name}
                </button>
              ))}
            </div>
          </div>
        )
      }]);
      return;
    }

    // ==== ACTION: open_camera
    if (intent.type === "action" && intent.action === "open_camera") {
      const queryName = (slots.cameraName || "").trim();
      if (!queryName) {
        setMessages(m => [...m, { from: "bot", reply_text: pickText("Dime el nombre de la cámara (por ejemplo: TCB).", lang) }]);
        return;
      }

      let { data, error } = await supabase
        .from("external_links")
        .select("id,name,url,icon_type")
        .eq("icon_type", "camera")
        .ilike("name", `%${queryName}%`)
        .limit(1)
        .maybeSingle();

      if ((!data || error) && queryName.split(" ").length > 1) {
        let q = supabase.from("external_links").select("id,name,url,icon_type").eq("icon_type", "camera");
        queryName.split(" ").forEach(tok => { q = q.ilike("name", `%${tok}%`); });
        const r = await q.limit(1);
        data = r.data?.[0]; error = r.error;
      }
      if (error || !data) {
        const nf = pickText(intent.not_found?.text, lang) || pickText(`No he encontrado la cámara "{{query}}".`, lang);
        setMessages(m => [...m, { from: "bot", reply_text: tpl(nf, { query: queryName }) }]);
        return;
      }

      // text & card cu templating și etichete localizate
      const replyRaw = pickText(intent.response?.text, lang);
      const reply = tpl(replyRaw, { camera: { name: data.name, url: data.url } });

      const cardDef = intent.response?.objects?.[0];
      const cardTitleRaw = pickText(cardDef?.title, lang) || data.name;
      const cardTitle = tpl(cardTitleRaw, { camera: { name: data.name } });

      const actions = (cardDef?.actions || []).map(a => ({
        ...a,
        label: pickLabel(a.label, lang),
        route: tpl(a.route || "", { camera: { url: data.url, name: data.name } })
      }));

      setMessages(m => [...m, {
        from: "bot",
        reply_text: reply,
        render: () => <ActionCard card={{ title: cardTitle, actions }} />
      }]);
      return;
    }

    // ==== ACTION: show_announcement
    if (intent.type === "action" && intent.action === "show_announcement") {
      const { data, error } = await supabase.from("anuncios").select("content").eq("id", 1).maybeSingle();
      const content = error ? pickText("No se pudo cargar el anuncio.", lang) : (data?.content || pickText("Sin contenido.", lang));
      const txt = pickText(intent.response?.text, lang) || pickText("Este es el anuncio vigente:", lang);
      setMessages(m => [...m, {
        from: "bot",
        reply_text: txt,
        render: () => <AnnouncementBox content={content} />
      }]);
      return;
    }

    // ==== ACTION: GPS – navegar a (preview rută)
    if (intent.type === "action" && (intent.id === "gps_navegar_a" || intent.action === "gps_route_preview")) {
      const placeName = (slots.placeName || "").trim();
      if (!placeName) {
        setMessages(m => [...m, { from: "bot", reply_text: pickText("Dime el destino (por ejemplo: TCB).", lang) }]);
        return;
      }

      const options = await findPlacesByName(placeName);
      if (!options.length) {
        const nf = pickText(intent.not_found?.text, lang) || pickText(`No he encontrado la ubicación "{{query}}".`, lang);
        setMessages(m => [...m, { from: "bot", reply_text: tpl(nf, { query: placeName }) }]);
        return;
      }

      const showRoute = (p) => {
        const mapsUrl = getMapsLinkFromRecord(p);
        const geojson = pointGeoJSONFromCoords(p.coordenadas);

        const replyRaw = pickText(intent.response?.text, lang) ||
          pickText(`Claro, aquí tienes la ruta a **{{place.name}}**.`, lang);

        setMessages(mm => [...mm, {
          from: "bot",
          reply_text: tpl(replyRaw, { place: { name: p.nombre } }),
          render: () => (
            <div className={styles.card}>
              <div className={styles.cardTitle}>{p.nombre}</div>
              <div style={{ marginTop: 8 }}>
                <ChatMiniMap id={`chatmap-${p._table}-${p.id}`} geojson={geojson} mapsLink={mapsUrl} title={p.nombre} />
              </div>
              {mapsUrl && (
                <div className={styles.cardActions} style={{ marginTop: 8 }}>
                  <button className={styles.actionBtn} onClick={() => window.open(mapsUrl, "_blank", "noopener")}>
                    {pickLabel({ es: "Abrir en Google Maps", ro: "Deschide în Google Maps", ca: "Obrir a Google Maps" }, lang)}
                  </button>
                </div>
              )}
            </div>
          )
        }]);
      };

      if (options.length > 1) {
        setMessages(m => [...m, {
          from: "bot",
          reply_text: pickText(`He encontrado varios sitios para «${placeName}». Elige uno:`, lang),
          render: () => <SimpleList title={pickText({es:"Resultados", ro:"Rezultate", ca:"Resultats"}, lang)} items={options} onPick={showRoute} />
        }]);
        return;
      }

      showRoute(options[0]);
      return;
    }

    // ==== ACTION: GPS – info de
    if (intent.type === "action" && intent.id === "gps_info_de") {
      const placeName = (slots.placeName || "").trim();
      if (!placeName) {
        setMessages(m => [...m, { from: "bot", reply_text: pickText("¿De qué sitio quieres información?", lang) }]);
        return;
      }

      const options = await findPlacesByName(placeName);
      if (!options.length) {
        const nf = pickText(intent.not_found?.text, lang) || pickText(`No he encontrado información de "{{query}}".`, lang);
        setMessages(m => [...m, { from: "bot", reply_text: tpl(nf, { query: placeName }) }]);
        return;
      }

      const showInfo = async (p) => {
        const cam = await findCameraFor(p.nombre);
        const mapsUrl = getMapsLinkFromRecord(p);
        const txt = pickText(intent.response?.text, lang) ||
          pickText(`Esto es lo que tengo de **{{place.name}}**:`, lang);

        setMessages(mm => [...mm, {
          from: "bot",
          reply_text: tpl(txt, { place: { name: p.nombre } }),
          render: () => <PlaceInfoCard place={p} mapsUrl={mapsUrl} cameraUrl={cam?.url} />
        }]);
      };

      if (options.length > 1) {
        setMessages(m => [...m, {
          from: "bot",
          reply_text: pickText(`He encontrado varios «${placeName}». Elige uno:`, lang),
          render: () => <SimpleList title={pickText({es:"Resultados", ro:"Rezultate", ca:"Resultats"}, lang)} items={options} onPick={showInfo} />
        }]);
        return;
      }

      await showInfo(options[0]);
      return;
    }

    // ==== ACTION: GPS – LISTE GENERICE
    if (intent.type === "action" && intent.action === "gps_list") {
      const id = intent.id;
      const tables = {
        "gps_list_terminale": { table: "gps_terminale", label: { es: "Terminales", ro: "Terminale", ca: "Terminals" } },
        "gps_list_parkings":  { table: "gps_parkings",  label: { es: "Parkings",  ro: "Parcări",   ca: "Pàrquings" } },
        "gps_list_servicios": { table: "gps_servicios", label: { es: "Servicios", ro: "Servicii",   ca: "Serveis" } }
      };
      const cfg = tables[id];
      if (cfg) {
        const items = await loadGpsList(cfg.table);
        const txt = pickText(intent.response?.text, lang) ||
          pickText({ es: `Estas son las ${pickText(cfg.label, "es").toLowerCase()}:`,
                     ro: `Acestea sunt ${pickText(cfg.label, "ro").toLowerCase()}:`,
                     ca: `Aquests són els/les ${pickText(cfg.label, "ca").toLowerCase()}:` }, lang);
        setMessages(m => [...m, {
          from: "bot",
          reply_text: txt,
          render: () => <SimpleList title={pickText(cfg.label, lang)} items={items} />
        }]);
        return;
      }
    }
// ==== ACTION: driver_self_info (STRICT self-only)
if (intent.type === "action" && intent.action === "driver_self_info") {
  // 0) Safety: doar despre tine, nu alte ID-uri/nume
  // (Intențiile sunt formulate generic; dacă adaugi în viitor ceva cu alt user, pune aici verificări.)

  // 1) Info din profil – disponibil imediat
  const truck = {
    itv: profile?.camioane?.fecha_itv || "—",
    plate: profile?.camioane?.matricula || "—",
    km: profile?.camioane?.kilometros ?? null,
  };
  const trailer = {
    itv: profile?.remorci?.fecha_itv || "—",
    plate: profile?.remorci?.matricula || "—",
  };
  const driver = {
    cap: profile?.cap_expirare || "—",
    lic: profile?.carnet_caducidad || "—",
    adr: profile?.tiene_adr ? (profile?.adr_caducidad || "Sí") : "No",
  };

  const topic = intent?.meta?.topic;

  // 2) Răspunsuri simple (fără DB extra)
  if (topic === "truck_itv") {
    setMessages(m => [...m, { from: "bot", reply_text: intent.response?.text?.replace("{{truck.itv}}", String(truck.itv)) }]);
    return;
  }
  if (topic === "trailer_itv") {
    setMessages(m => [...m, { from: "bot", reply_text: intent.response?.text?.replace("{{trailer.itv}}", String(trailer.itv)) }]);
    return;
  }
  if (topic === "plates") {
    const txt = intent.response?.text
      ?.replace("{{truck.plate}}", String(truck.plate))
      ?.replace("{{trailer.plate}}", String(trailer.plate));
    setMessages(m => [...m, { from: "bot", reply_text: txt }]);
    return;
  }
  if (topic === "driver_credentials") {
    const txt = intent.response?.text
      ?.replace("{{driver.cap}}", String(driver.cap))
      ?.replace("{{driver.lic}}", String(driver.lic))
      ?.replace("{{driver.adr}}", String(driver.adr));
    setMessages(m => [...m, { from: "bot", reply_text: txt }]);
    return;
  }

  // 3) Răspunsuri cu DB (payroll & vacanțe) – replică logică din MiPerfilPage
  if (topic === "payroll_summary") {
    try {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth() + 1;
      const { data } = await supabase
        .from("pontaje_curente")
        .select("pontaj_complet")
        .eq("user_id", profile?.id)
        .eq("an", y)
        .eq("mes", m)
        .maybeSingle();

      const zile = data?.pontaj_complet?.zilePontaj || [];
      let D = 0, C = 0, P = 0, KM = 0, CT = 0;
      const marks = new Set();
      zile.forEach((zi, idx) => {
        if (!zi) return;
        const kmZi = (parseFloat(zi.km_final) || 0) - (parseFloat(zi.km_iniciar) || 0);
        if (zi.desayuno) D++;
        if (zi.cena) C++;
        if (zi.procena) P++;
        if (kmZi > 0) KM += kmZi;
        if ((zi.contenedores || 0) > 0) CT += zi.contenedores || 0;
        if (zi.desayuno || zi.cena || zi.procena || kmZi > 0 || (zi.contenedores || 0) > 0 || (zi.suma_festivo || 0) > 0) {
          marks.add(idx + 1);
        }
      });
      const txt = intent.response?.text
        ?.replace("{{payroll.dias}}", String(marks.size))
        ?.replace("{{payroll.km}}", String(Math.round(KM)))
        ?.replace("{{payroll.conts}}", String(CT))
        ?.replace("{{payroll.desayunos}}", String(D))
        ?.replace("{{payroll.cenas}}", String(C))
        ?.replace("{{payroll.procenas}}", String(P));
      setMessages(m => [...m, { from: "bot", reply_text: txt }]);
    } catch (e) {
      setMessages(m => [...m, { from: "bot", reply_text: "No he podido leer tu nómina ahora mismo." }]);
    }
    return;
  }

  if (topic === "vacation_balance") {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const yearStart = `${year}-01-01`;
      const yearEnd = `${year}-12-31`;

      const { data: cfg } = await supabase
        .from("vacaciones_parametros_anio")
        .select("*")
        .eq("anio", year)
        .maybeSingle();

      const dias_base = cfg?.dias_base ?? 23;
      const dias_personales = cfg?.dias_personales ?? 2;
      const dias_pueblo = cfg?.dias_pueblo ?? 0;

      const { data: ex } = await supabase
        .from("vacaciones_asignaciones_extra")
        .select("dias_extra")
        .eq("user_id", profile?.id)
        .eq("anio", year)
        .maybeSingle();
      const dias_extra = ex?.dias_extra ?? 0;

      const total = (dias_base || 0) + (dias_personales || 0) + (dias_pueblo || 0) + (dias_extra || 0);

      const { data: evs } = await supabase
        .from("vacaciones_eventos")
        .select("id,tipo,state,start_date,end_date")
        .eq("user_id", profile?.id)
        .or(`and(start_date.lte.${yearEnd},end_date.gte.${yearStart})`);

      const fmt = (d) => {
        const x = new Date(d);
        const z = new Date(x.getTime() - x.getTimezoneOffset() * 60000);
        return z.toISOString().slice(0, 10);
      };
      const daysBetween = (a, b) => {
        const A = new Date(fmt(a)), B = new Date(fmt(b));
        return Math.floor((B - A) / 86400000) + 1;
      };
      const overlapDaysWithinYear = (ev) => {
        const yStart = new Date(`${year}-01-01T00:00:00`);
        const yEnd = new Date(`${year}-12-31T23:59:59`);
        const s0 = new Date(ev.start_date);
        const e0 = new Date(ev.end_date);
        const s = s0 < yStart ? yStart : s0;
        const e = e0 > yEnd ? yEnd : e0;
        if (e < s) return 0;
        return daysBetween(s, e);
      };

      const usadas = (evs || []).filter(e => e.state === "aprobado").reduce((s, e) => s + overlapDaysWithinYear(e), 0);
      const pendientes = (evs || []).filter(e => e.state === "pendiente" || e.state === "conflicto").reduce((s, e) => s + overlapDaysWithinYear(e), 0);
      const disponibles = Math.max(total - usadas - pendientes, 0);

      const txt = intent.response?.text
        ?.replace("{{vac.total}}", String(total))
        ?.replace("{{vac.usadas}}", String(usadas))
        ?.replace("{{vac.pendientes}}", String(pendientes))
        ?.replace("{{vac.disponibles}}", String(disponibles));
      setMessages(m => [...m, { from: "bot", reply_text: txt }]);
    } catch (e) {
      setMessages(m => [...m, { from: "bot", reply_text: "Nu am putut calcula acum concediul tău." }]);
    }
    return;
  }

  // fallback pentru driver_self_info necunoscut
  setMessages(m => [...m, { from: "bot", reply_text: "Nu găsesc informația cerută din profilul tău." }]);
  return;
}
    // ==== fallback
    const fbText = pickText(
      intentsData.find(i => i.id === "fallback")?.response?.text,
      lang
    ) || pickText(
      "Te escucho. Puedo abrir cámaras por nombre, mostrar el anuncio o ayudarte con el depósito y el GPS.",
      lang
    );

    setMessages(m => [...m, { from: "bot", reply_text: fbText }]);
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.logoDot} />
        <div className={styles.headerTitleWrap}>
          <div className={styles.brand}>Rayna 2.0</div>
          <div className={styles.tagline}>Tu transportista virtual</div>
        </div>
        <button className={styles.closeBtn} onClick={() => window.history.back()} aria-label="Cerrar">×</button>
      </header>

      <main className={styles.chat}>
        {messages.map((m, i) =>
          m.from === "user"
            ? <div key={i} className={`${styles.bubble} ${styles.me}`}>{m.text}</div>
            : <BotBubble key={i} reply_text={m.reply_text}>{m.render ? m.render() : null}</BotBubble>
        )}
        <div ref={endRef} />
      </main>

      <footer className={styles.inputBar}>
        <input
          className={styles.input}
          placeholder="Escribe aquí… (ej.: Quiero llegar a TCB)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => (e.key === "Enter" ? send() : null)}
        />
        <button className={styles.sendBtn} onClick={send}>Enviar</button>
      </footer>
    </div>
  );
}
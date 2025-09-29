import React, { useEffect, useRef, useState } from "react";
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
import AddGpsWizard from "./ui/AddGpsWizard"; // ✅ import corect

export default function RaynaHub() {
  // 👉 apelează hook-ul anti-zoom la MOUNT
  useIOSNoInputZoom();

  const { profile } = useAuth();
  const role = profile?.role || "driver";

  const [messages, setMessages] = useState([
    { from: "bot", reply_text: intentsData.find(i => i.id === "saludo")?.response?.text || "¡Hola!" }
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
    setMessages(m => [...m, { from: "user", text: userText }]);
    setText("");

    // ——— dialog "anuncio"
    if (awaiting === "anuncio_text") {
      const di = intentsData.find(i => i.id === "set_anuncio")?.dialog;
      if (!(role === "admin" || role === "dispecer")) {
        setMessages(m => [...m, { from: "bot", reply_text: "No tienes permiso para actualizar anuncios." }]);
        setAwaiting(null);
        return;
      }
      setSaving(true);
      const { error } = await supabase.from("anuncios").update({ content: userText }).eq("id", 1);
      setSaving(false);
      setAwaiting(null);
      setMessages(m => [...m, { from: "bot", reply_text: error ? di.save_err : di.save_ok }]);
      return;
    }

    // ——— detect intent
    const { intent, slots } = detectIntent(userText, intentsData);

    // ==== STATIC
    if (intent.type === "static") {
      const objs = intent.response?.objects || [];
      if (!objs.length) {
        setMessages(m => [...m, { from: "bot", reply_text: intent.response.text }]);
        return;
      }
      const first = objs[0];
      if (first?.type === "card") {
        const card = {
          title: first.title || "",
          subtitle: first.subtitle || "",
          actions: (first.actions || []).map(a => ({ ...a, label: a.label, route: a.route, newTab: a.newTab }))
        };
        setMessages(m => [...m, { from: "bot", reply_text: intent.response.text, render: () => <ActionCard card={card} /> }]);
        return;
      }
      setMessages(m => [...m, { from: "bot", reply_text: intent.response.text }]);
      return;
    }

    // ==== DIALOG
    if (intent.type === "dialog") {
      const allowed = intent.roles_allowed ? intent.roles_allowed.includes(role) : true;
      if (!allowed) {
        setMessages(m => [...m, { from: "bot", reply_text: "No tienes permiso para esta acción." }]);
        return;
      }

      // ——— flux existent: add camera inline
      if (intent.dialog.form === "add_camera_inline") {
        setMessages(m => [...m, {
          from: "bot",
          reply_text: "Perfecto. Añadamos una cámara:",
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
                setMessages(mm => [...mm, { from: "bot", reply_text: error ? intent.dialog.save_err : `¡Listo! Cámara ${data?.name} añadida.` }]);
              }}
            />
          )
        }]);
        return;
      }

      if (intent.dialog.await_key === "anuncio_text") {
        setAwaiting("anuncio_text");
        setMessages(m => [...m, { from: "bot", reply_text: intent.dialog.ask_text }]);
        return;
      }
    } // ← închidere dialog

    // ==== NOU: ACTION – pornește wizard-ul conversațional de adăugare locație
    if (intent.type === "action" && intent.action === "start_gps_add_chat") {
      setMessages(m => [...m, {
        from: "bot",
        reply_text: "Vale, iniciamos el alta de ubicación:",
        render: () => (
          <AddGpsWizard
            onDone={({ openPreviewOf }) => {
              if (openPreviewOf) {
                // injectează automat întrebarea de info pt. card
                setMessages(mm => [...mm, { from: "user", text: `que me puedes decir de ${openPreviewOf}` }]);
              }
            }}
            onCancel={() => setMessages(mm => [...mm, { from: "bot", reply_text: "Cancelado. ¿Algo más?" }])}
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
      setMessages(m => [...m, {
        from: "bot",
        reply_text: intent.response?.text || "Cámaras:",
        render: () => (
          <div className={styles.card}>
            <div className={styles.cardTitle}>Cámaras</div>
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
        setMessages(m => [...m, { from: "bot", reply_text: "Dime el nombre de la cámara (por ejemplo: TCB)." }]);
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
        setMessages(m => [...m, { from: "bot", reply_text: intent.not_found?.text?.replace("{{query}}", queryName) || `No he encontrado "${queryName}".` }]);
        return;
      }
      const cardDef = intent.response.objects?.[0];
      setMessages(m => [...m, {
        from: "bot",
        reply_text: intent.response.text.replace("{{camera.name}}", data.name),
        render: () => <ActionCard card={{
          title: (cardDef?.title || "").replace("{{camera.name}}", data.name),
          actions: (cardDef?.actions || []).map(a => ({ ...a, route: (a.route || "").replace("{{camera.url}}", data.url) }))
        }} />
      }]);
      return;
    }

    // ==== ACTION: show_announcement
    if (intent.type === "action" && intent.action === "show_announcement") {
      const { data, error } = await supabase.from("anuncios").select("content").eq("id", 1).maybeSingle();
      const content = error ? "No se pudo cargar el anuncio." : (data?.content || "Sin contenido.");
      setMessages(m => [...m, {
        from: "bot",
        reply_text: intent.response?.text || "Este es el anuncio vigente:",
        render: () => <AnnouncementBox content={content} />
      }]);
      return;
    }

    // ==== ACTION: GPS – navegar a
    if (intent.type === "action" && (intent.id === "gps_navegar_a" || intent.action === "gps_route_preview")) {
      const placeName = (slots.placeName || "").trim();
      if (!placeName) { setMessages(m => [...m, { from: "bot", reply_text: "Dime el destino (por ejemplo: TCB)." }]); return; }

      const options = await findPlacesByName(placeName);
      if (!options.length) { setMessages(m => [...m, { from: "bot", reply_text: `No he encontrado «${placeName}».` }]); return; }

      const showRoute = (p) => {
        const mapsUrl = getMapsLinkFromRecord(p);
        const geojson = pointGeoJSONFromCoords(p.coordenadas);
        setMessages(mm => [...mm, {
          from: "bot",
          reply_text: `Claro, aquí tienes la ruta a **${p.nombre}**. Toca el mapa para abrir Google Maps.`,
          render: () => (
            <div className={styles.card}>
              <div className={styles.cardTitle}>{p.nombre}</div>
              <div style={{ marginTop: 8 }}>
                <ChatMiniMap id={`chatmap-${p._table}-${p.id}`} geojson={geojson} mapsLink={mapsUrl} title={p.nombre} />
              </div>
              {mapsUrl && (
                <div className={styles.cardActions} style={{ marginTop: 8 }}>
                  <button className={styles.actionBtn} onClick={() => window.open(mapsUrl, "_blank", "noopener")}>
                    Abrir en Google Maps
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
          reply_text: `He encontrado varios sitios para «${placeName}». Elige uno:`,
          render: () => <SimpleList title="Resultados" items={options} onPick={showRoute} />
        }]);
        return;
      }

      showRoute(options[0]);
      return;
    }

    // ==== ACTION: GPS – info de
    if (intent.type === "action" && intent.id === "gps_info_de") {
      const placeName = (slots.placeName || "").trim();
      if (!placeName) { setMessages(m => [...m, { from: "bot", reply_text: "¿De qué sitio quieres información?" }]); return; }

      const options = await findPlacesByName(placeName);
      if (!options.length) { setMessages(m => [...m, { from: "bot", reply_text: `No he encontrado «${placeName}».` }]); return; }

      const showInfo = async (p) => {
        const cam = await findCameraFor(p.nombre);
        const mapsUrl = getMapsLinkFromRecord(p);
        setMessages(mm => [...mm, {
          from: "bot",
          reply_text: `Esto es lo que tengo de **${p.nombre}**:`,
          render: () => <PlaceInfoCard place={p} mapsUrl={mapsUrl} cameraUrl={cam?.url} />
        }]);
      };

      if (options.length > 1) {
        setMessages(m => [...m, {
          from: "bot",
          reply_text: `He encontrado varios «${placeName}». Elige uno:`,
          render: () => <SimpleList title="Resultados" items={options} onPick={showInfo} />
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
        "gps_list_terminale": { table: "gps_terminale", label: "Terminales" },
        "gps_list_parkings":  { table: "gps_parkings",  label: "Parkings"  },
        "gps_list_servicios": { table: "gps_servicios", label: "Servicios" }
      };
      const cfg = tables[id];
      if (cfg) {
        const items = await loadGpsList(cfg.table);
        setMessages(m => [...m, {
          from: "bot",
          reply_text: intent.response?.text || `Estas son las ${cfg.label.toLowerCase()}:`,
          render: () => <SimpleList title={cfg.label} items={items} />
        }]);
        return;
      }
    }

    // ==== fallback
    setMessages(m => [...m, {
      from: "bot",
      reply_text: intentsData.find(i => i.id === "fallback")?.response?.text ||
        "Te escucho. Puedo abrir cámaras por nombre, mostrar el anuncio o ayudarte con el depósito y el GPS."
    }]);
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
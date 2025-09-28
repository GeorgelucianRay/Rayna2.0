// src/components/RaynaHub.jsx
import React, { useEffect, useRef, useState } from "react";
import styles from "./Chatbot.module.css";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthContext.jsx";
import intentsData from "../rayna.intents.json";
import { detectIntent } from "../nluEngine";

// 🔴 Schimbat importul MiniMap -> ChatMiniMap (și calea corectă)
import ChatMiniMap from "./chat/ChatMiniMap";

/* ============== UI mici ============== */
function BotBubble({ reply_text, children }) {
  const [shown,setShown]=useState("");
  const idx=useRef(0);
  useEffect(()=>{ const txt=reply_text||""; const speed=18;
    const t=setInterval(()=>{ idx.current++; setShown(txt.slice(0,idx.current)); if(idx.current>=txt.length) clearInterval(t); }, speed);
    return ()=>clearInterval(t);
  },[reply_text]);
  return (
    <div className={`${styles.bubble} ${styles.bot}`}>
      <div className={styles.botText}>
        {shown}{shown.length<(reply_text||"").length && <span className={styles.cursor}>▍</span>}
      </div>
      {shown.length===(reply_text||"").length && children}
    </div>
  );
}

function ActionsRenderer({ card }) {
  return (
    <div className={styles.card}>
      {card.title && <div className={styles.cardTitle}>{card.title}</div>}
      {card.subtitle && <div className={styles.cardSubtitle}>{card.subtitle}</div>}
      <div className={styles.cardActions}>
        {(card.actions||[]).map((a,i)=>(
          <button key={i} className={styles.actionBtn} onClick={()=>window.open(a.route, a.newTab?"_blank":"_self","noopener,noreferrer")}>
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function AnnouncementBox({ content }) {
  return (
    <div className={styles.annBox}>
      <div className={styles.annHead}>📣 Anuncio</div>
      <div className={styles.annBody}>{content || "Sin contenido."}</div>
    </div>
  );
}

function AddCameraInline({ onSubmit, saving }) {
  const [name,setName]=useState(""); const [url,setUrl]=useState("");
  return (
    <form className={styles.formRow} onSubmit={e=>{e.preventDefault(); onSubmit({name,url});}}>
      <input className={styles.input} placeholder="Nombre (p.ej. TCB)" value={name} onChange={e=>setName(e.target.value)} required/>
      <input className={styles.input} placeholder="URL (https://…)" type="url" value={url} onChange={e=>setUrl(e.target.value)} required/>
      <button className={styles.sendBtn} type="submit" disabled={saving}>{saving?"Guardando…":"Añadir"}</button>
    </form>
  );
}

/* Card info loc, cu butoane Maps / Cámara */
function PlaceInfoCard({ place, mapsUrl, cameraUrl }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>{place.nombre}</div>
      {place.direccion && <div className={styles.cardSubtitle}>{place.direccion}</div>}
      {place.detalles && <div style={{marginTop:6}}>{place.detalles}</div>}
      <div className={styles.cardActions} style={{marginTop:8}}>
        {mapsUrl && (
          <button className={styles.actionBtn} onClick={()=>window.open(mapsUrl, "_blank","noopener")}>
            Abrir en Google Maps
          </button>
        )}
        {cameraUrl && (
          <button className={styles.actionBtn} onClick={()=>window.open(cameraUrl, "_blank","noopener")}>
            Ver cámara
          </button>
        )}
      </div>
    </div>
  );
}

/* Listă simplă de locuri (terminales/parkings/servicios) */
function SimpleList({ title, items }) {
  return (
    <div className={styles.card}>
      {title && <div className={styles.cardTitle}>{title}</div>}
      <div style={{display:"flex", flexDirection:"column", gap:8, marginTop:8}}>
        {(items||[]).map((it)=>(
          <button
            key={`${it._table}-${it.id}`}
            className={styles.actionBtn}
            onClick={()=> window.open(it._mapsUrl, "_blank", "noopener")}
          >
            {it.nombre}
          </button>
        ))}
      </div>
    </div>
  );
}

/* —— helpers de templating simplu {{place}} —— */
function tpl(str, ctx) {
  return (str||"").replace(/\{\{([^}]+)\}\}/g, (_,k)=> {
    const path = k.trim().split(".");
    return path.reduce((acc, key)=> (acc && acc[key] != null ? acc[key] : ""), ctx);
  });
}

/* ===== Helpers GPS ===== */
function getMapsLinkFromRecord(rec){
  if (!rec) return null;
  if (rec.link_maps) return rec.link_maps;
  if (rec.coordenadas) return `https://maps.google.com/?q=${encodeURIComponent(rec.coordenadas)}`;
  return null;
}

// construiește un GeoJSON Point din stringul "lat,lon" (Leaflet/GeoJSON → [lon,lat])
function pointGeoJSONFromCoords(coordsString){
  if (!coordsString) return null;
  const [latStr, lonStr] = String(coordsString).split(",").map(s=>s.trim());
  const lat = Number(latStr), lon = Number(lonStr);
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    return {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        geometry: { type: "Point", coordinates: [lon, lat] },
        properties: {}
      }]
    };
  }
  return null;
}

// caută în tabelele GPS
async function findPlaceByName(name){
  const tables = ["gps_clientes","gps_parkings","gps_servicios","gps_terminale"];
  for (const t of tables){
    const { data, error } = await supabase.from(t)
      .select("id, nombre, direccion, detalles, link_maps, coordenadas")
      .ilike("nombre", `%${name}%`)
      .limit(1)
      .maybeSingle();
    if (!error && data) return { ...data, _table: t };
  }
  return null;
}

// caută o cameră similară
async function findCameraFor(placeName){
  const { data } = await supabase
    .from("external_links")
    .select("id,name,url,icon_type")
    .eq("icon_type","camera")
    .ilike("name", `%${placeName}%`)
    .limit(1);
  return data?.[0] || null;
}

export default function RaynaHub(){
  const { profile } = useAuth();
  const role = profile?.role || "driver";

  const [messages,setMessages]=useState([
    { from:"bot", reply_text: intentsData.find(i=>i.id==="saludo")?.response?.text || "¡Hola!" }
  ]);
  const [text,setText]=useState("");
  const [awaiting,setAwaiting]=useState(null);
  const [saving,setSaving]=useState(false);
  const endRef=useRef(null);
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[messages]);

  const send = async ()=>{
    const userText = text.trim();
    if (!userText) return;
    setMessages(m=>[...m, {from:"user", text:userText}]);
    setText("");

    // === dialog anunț ===
    if (awaiting === "anuncio_text") {
      const di = intentsData.find(i=>i.id==="set_anuncio")?.dialog;
      if (!(role==="admin" || role==="dispecer")) {
        setMessages(m=>[...m, {from:"bot", reply_text:"No tienes permiso para actualizar anuncios."}]);
        setAwaiting(null);
        return;
      }
      setSaving(true);
      const { error } = await supabase.from("anuncios").update({ content: userText }).eq("id",1);
      setSaving(false);
      setAwaiting(null);
      setMessages(m=>[...m, {from:"bot", reply_text: error ? di.save_err : di.save_ok }]);
      return;
    }

    // ——— detect intent din JSON
    const { intent, slots } = detectIntent(userText, intsentsData);

    /* ==== STATICE ==== */
    if (intent.type === "static") {
      const objs = intent.response?.objects || [];
      if (!objs.length) {
        setMessages(m=>[...m, {from:"bot", reply_text: intent.response.text}]);
        return;
      }
      const first = objs[0];
      if (first?.type === "card") {
        const card = {
          title: tpl(first.title || "", {}),
          subtitle: tpl(first.subtitle || "", {}),
          actions: (first.actions||[]).map(a=>({
            ...a,
            label: tpl(a.label||"",{}),
            route: tpl(a.route||"",{}),
            newTab: a.newTab
          }))
        };
        setMessages(m=>[...m, {
          from:"bot",
          reply_text: intent.response.text,
          render: () => <ActionsRenderer card={card}/>
        }]);
        return;
      }
      setMessages(m=>[...m, {from:"bot", reply_text: intent.response.text}]);
      return;
    }

    /* ==== DIALOG (add camera / set anuncio) ==== */
    if (intent.type === "dialog") {
      const allowed = intent.roles_allowed ? intent.roles_allowed.includes(role) : true;
      if (!allowed) {
        setMessages(m=>[...m, {from:"bot", reply_text:"No tienes permiso para esta acción."}]);
        return;
      }
      if (intent.dialog.form === "add_camera_inline") {
        setMessages(m=>[...m, {
          from:"bot",
          reply_text:"Perfecto. Añadamos una cámara:",
          render: () => (
            <AddCameraInline
              saving={saving}
              onSubmit={async ({name,url})=>{
                setSaving(true);
                const { data, error } = await supabase
                  .from("external_links")
                  .insert({ name, url, icon_type:"camera", display_order:9999 })
                  .select().single();
                setSaving(false);
                setMessages(mm=>[...mm, { from:"bot", reply_text: error ? intent.dialog.save_err : tpl(intent.dialog.save_ok, {camera:data}) }]);
              }}
            />
          )
        }]);
        return;
      }
      if (intent.dialog.await_key === "anuncio_text") {
        setAwaiting("anuncio_text");
        setMessages(m=>[...m, {from:"bot", reply_text: intent.dialog.ask_text}]);
        return;
      }
    }

    /* ==== ACȚIUNI EXISTENTE: CAMERĂ ==== */
    if (intent.type === "action" && intent.action === "open_camera") {
      const queryName = (slots.cameraName || "").trim();
      if (!queryName) {
        setMessages(m=>[...m, {from:"bot", reply_text:"Dime el nombre de la cámara (por ejemplo: TCB)."}]);
        return;
      }
      let { data, error } = await supabase
        .from("external_links")
        .select("id,name,url,icon_type")
        .eq("icon_type","camera")
        .ilike("name", `%${queryName}%`)
        .limit(1)
        .maybeSingle();
      if ((!data || error) && queryName.split(" ").length>1) {
        let q = supabase.from("external_links").select("id,name,url,icon_type").eq("icon_type","camera");
        queryName.split(" ").forEach(tok => { q = q.ilike("name", `%${tok}%`); });
        const r = await q.limit(1);
        data = r.data?.[0]; error = r.error;
      }
      if (error || !data) {
        setMessages(m=>[...m, {from:"bot", reply_text: tpl(intent.not_found.text, {query: queryName}) }]);
        return;
      }
      const text = tpl(intent.response.text, { camera: data });
      const card = intent.response.objects?.[0];
      setMessages(m=>[...m, {
        from:"bot",
        reply_text: text,
        render: () => (
          <ActionsRenderer card={{
            type:"card",
            title: tpl(card.title, {camera:data}),
            actions: (card.actions||[]).map(a=>({
              ...a,
              label: a.label,
              route: tpl(a.route, {camera:data})
            }))
          }}/>
        )
      }]);
      return;
    }

    /* ==== ACȚIUNI: ANUNȚ ==== */
    if (intent.type === "action" && intent.action === "show_announcement") {
      const { data, error } = await supabase.from("anuncios").select("content").eq("id",1).maybeSingle();
      const text = intent.response.text;
      const content = error ? "No se pudo cargar el anuncio." : (data?.content || "Sin contenido.");
      setMessages(m=>[...m, {
        from:"bot",
        reply_text: text,
        render: () => <AnnouncementBox content={tpl(intent.response.objects[0].content, {announcement:{content}})} />
      }]);
      return;
    }

    /* ==== ACȚIUNI: GPS – NAVEGAR A ==== */
    if (intent.type === "action" && (intent.id === "gps_navegar_a" || intent.action === "gps_route_preview")) {
      const placeName = (slots.placeName || "").trim();
      if (!placeName) {
        setMessages(m=>[...m, {from:"bot", reply_text:"Dime el destino (por ejemplo: TCB)."}]);
        return;
      }
      const place = await findPlaceByName(placeName);
      if (!place) {
        setMessages(m=>[...m, {from:"bot", reply_text:`No he encontrado «${placeName}».`}]);
        return;
      }
      const mapsUrl = getMapsLinkFromRecord(place);
      const geojson = pointGeoJSONFromCoords(place.coordenadas);

      setMessages(m=>[...m, {
        from:"bot",
        reply_text: `Claro, aquí tienes la ruta a **${place.nombre}**. Toca el mapa para abrir Google Maps.`,
        render: () => (
          <div className={styles.card}>
            <div className={styles.cardTitle}>{place.nombre}</div>
            <div style={{marginTop:8}}>
              <ChatMiniMap
                id={`chatmap-${place._table}-${place.id}`}
                geojson={geojson}
                mapsLink={mapsUrl}
                title={place.nombre}
              />
            </div>
            {mapsUrl && (
              <div className={styles.cardActions} style={{marginTop:8}}>
                <button className={styles.actionBtn} onClick={()=>window.open(mapsUrl,"_blank","noopener")}>
                  Abrir en Google Maps
                </button>
              </div>
            )}
          </div>
        )
      }]);
      return;
    }

    /* ==== ACȚIUNI: GPS – INFO DE ==== */
    if (intent.type === "action" && intent.id === "gps_info_de") {
      const placeName = (slots.placeName || "").trim();
      if (!placeName) {
        setMessages(m=>[...m, {from:"bot", reply_text:"¿De qué sitio quieres información?"}]);
        return;
      }
      const place = await findPlaceByName(placeName);
      if (!place) {
        setMessages(m=>[...m, {from:"bot", reply_text:`No he encontrado «${placeName}».`}]);
        return;
      }
      const mapsUrl = getMapsLinkFromRecord(place);
      const cam = await findCameraFor(place.nombre);
      setMessages(m=>[...m, {
        from:"bot",
        reply_text: `Esto es lo que tengo de **${place.nombre}**:`,
        render: () => <PlaceInfoCard place={place} mapsUrl={mapsUrl} cameraUrl={cam?.url}/>
      }]);
      return;
    }

    /* ==== ACȚIUNI: GPS – LISTAS ==== */
    if (intent.type === "action" && intent.action === "gps_list" && intent.id === "gps_list_terminale") {
      const { data } = await supabase.from("gps_terminale").select("id,nombre,link_maps,coordenadas").order("nombre").limit(50);
      const items = (data||[]).map(d => ({...d, _table:"gps_terminale", _mapsUrl:getMapsLinkFromRecord(d)}));
      setMessages(m=>[...m, { from:"bot", reply_text:intent.response?.text || "Terminales:",
        render: () => <SimpleList title="Terminales" items={items}/> }]);
      return;
    }
    if (intent.type === "action" && intent.action === "gps_list" && intent.id === "gps_list_parkings") {
      const { data } = await supabase.from("gps_parkings").select("id,nombre,link_maps,coordenadas").order("nombre").limit(50);
      const items = (data||[]).map(d => ({...d, _table:"gps_parkings", _mapsUrl:getMapsLinkFromRecord(d)}));
      setMessages(m=>[...m, { from:"bot", reply_text:intent.response?.text || "Parkings:",
        render: () => <SimpleList title="Parkings" items={items}/> }]);
      return;
    }
    if (intent.type === "action" && intent.action === "gps_list" && intent.id === "gps_list_servicios") {
      const { data } = await supabase.from("gps_servicios").select("id,nombre,link_maps,coordenadas").order("nombre").limit(50);
      const items = (data||[]).map(d => ({...d, _table:"gps_servicios", _mapsUrl:getMapsLinkFromRecord(d)}));
      setMessages(m=>[...m, { from:"bot", reply_text:intent.response?.text || "Servicios:",
        render: () => <SimpleList title="Servicios" items={items}/> }]);
      return;
    }

    /* ==== FALLBACK ==== */
    setMessages(m=>[...m, {from:"bot", reply_text: intentsData.find(i=>i.id==="fallback")?.response?.text || "No te he entendido."}]);
  };

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.logoDot}/>
        <div className={styles.headerTitleWrap}>
          <div className={styles.brand}>Rayna 2.0</div>
          <div className={styles.tagline}>Tu transportista virtual</div>
        </div>
        <button className={styles.closeBtn} onClick={()=>window.history.back()}>×</button>
      </header>

      <main className={styles.chat}>
        {messages.map((m,i)=> m.from==="user"
          ? <div key={i} className={`${styles.bubble} ${styles.me}`}>{m.text}</div>
          : <BotBubble key={i} reply_text={m.reply_text}>{m.render? m.render():null}</BotBubble>
        )}
        <div ref={endRef}/>
      </main>

      <footer className={styles.inputBar}>
        <input
          className={styles.input}
          placeholder="Escribe aquí… (ej.: Quiero llegar a TCB)"
          value={text}
          onChange={e=>setText(e.target.value)}
          onKeyDown={e=> e.key==="Enter" ? send() : null}
        />
        <button className={styles.sendBtn} onClick={send}>Enviar</button>
      </footer>
    </div>
  );
}
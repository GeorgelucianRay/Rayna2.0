import React, { useEffect, useRef, useState } from "react";
import styles from "./Chatbot.module.css";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthContext.jsx";
import intentsData from "../rayna.intents.json";
import { detectIntent } from "../nluEngine";

// —— UI mici ——
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

// —— helpers de templating simplu {{place}} ——
function tpl(str, ctx) {
  return (str||"").replace(/\{\{([^}]+)\}\}/g, (_,k)=> {
    const path = k.trim().split(".");
    return path.reduce((acc, key)=> (acc && acc[key] != null ? acc[key] : ""), ctx);
  });
}

export default function RaynaHub(){
  const { profile } = useAuth();
  const role = profile?.role || "driver";

  const [messages,setMessages]=useState([
    { from:"bot", reply_text: intentsData.find(i=>i.id==="saludo")?.response?.text || "¡Hola!" }
  ]);
  const [text,setText]=useState("");
  const [awaiting,setAwaiting]=useState(null); // ex.: "anuncio_text"
  const [saving,setSaving]=useState(false);
  const endRef=useRef(null);
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[messages]);

  const send = async ()=>{
    const userText = text.trim();
    if (!userText) return;
    setMessages(m=>[...m, {from:"user", text:userText}]);
    setText("");

    // dialog deschis pentru anunț (din JSON)
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
    const { intent, slots } = detectIntent(userText, intentsData);

    // 1) tip static
    if (intent.type === "static") {
      setMessages(m=>[...m, {from:"bot", reply_text: intent.response.text}]);
      return;
    }

    // 2) dialog (set anuncio / add camara)
    if (intent.type === "dialog") {
      // roluri
      const allowed = intent.roles_allowed ? intent.roles_allowed.includes(role) : true;
      if (!allowed) {
        setMessages(m=>[...m, {from:"bot", reply_text:"No tienes permiso para esta acción."}]);
        return;
      }
      // add camera (form inline)
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
      // set anuncio (await text)
      if (intent.dialog.await_key === "anuncio_text") {
        setAwaiting("anuncio_text");
        setMessages(m=>[...m, {from:"bot", reply_text: intent.dialog.ask_text}]);
        return;
      }
    }

    // 3) acțiuni (consultă DB și randează după template)
    if (intent.type === "action" && intent.action === "open_camera") {
      const queryName = (slots.cameraName || "").trim();
      if (!queryName) {
        setMessages(m=>[...m, {from:"bot", reply_text:"Dime el nombre de la cámara (por ejemplo: TCB)."}]);
        return;
      }
      // căutare: match mare + fallback pe tokeni
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
      // rander după template JSON
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

    // 4) fallback din JSON
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
          placeholder="Escribe aquí… (ej.: Abre TCB)"
          value={text}
          onChange={e=>setText(e.target.value)}
          onKeyDown={e=> e.key==="Enter" ? send() : null}
        />
        <button className={styles.sendBtn} onClick={send}>Enviar</button>
      </footer>
    </div>
  );
}
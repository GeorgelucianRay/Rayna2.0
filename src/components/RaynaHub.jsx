// src/components/RaynaHub.jsx
import React, { useEffect, useRef, useState } from "react";
import styles from "./Chatbot.module.css";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthContext.jsx";

/* ——— Utils NLU (normalize + fuzzy) ——— */
const DIAC = { á:"a", é:"e", í:"i", ó:"o", ú:"u", ü:"u", ñ:"n",
               Á:"a", É:"e", Í:"i", Ó:"o", Ú:"u", Ü:"u", Ñ:"n" };
const norm = s => (s||"").toLowerCase()
  .replace(/[áéíóúüñÁÉÍÓÚÜÑ]/g,c=>DIAC[c]??c)
  .replace(/[^\p{L}\p{N}\s]/gu," ")
  .replace(/\s+/g," ").trim();
function ed(a,b){const al=a.length,bl=b.length;const d=Array.from({length:al+1},(_,i)=>Array.from({length:bl+1},(_,j)=>(i===0?j:j===0?i:0)));
for(let i=1;i<=al;i++){for(let j=1;j<=bl;j++){const c=a[i-1]===b[j-1]?0:1;d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+c);if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])d[i][j]=Math.min(d[i][j],d[i-2][j-2]+c);}}
return d[al][bl];}
const fuzzyEq=(a,b)=>{a=norm(a);b=norm(b);if(a===b)return true;const L=Math.max(a.length,b.length);const tol=L<=4?1:2;return ed(a,b)<=tol;};

/* ——— Intenții (prioritate mare → mică) ——— */
const LEX = {
  saludo: ["hola","buenas","buenos dias","buenas tardes","buenas noches","que tal","hola rayna","buenas rayna"],
  quien:  ["quien eres","quién eres","que eres","quien es rayna","quién es rayna"],
  setAn:  ["quiero poner un anuncio","poner anuncio","publicar anuncio"],
  addCam: ["quiero anadir una camara","quiero añadir una camara","quiero añadir una cámara","agregar camara","agregar cámara"],
  verAn:  ["que anuncio hay","qué anuncio hay","ver anuncio","anuncios","ce anunț avem","ce anunt avem"],
  camVerb:["abre","abrir","ver","muestra","desplegar","abreme","abreme","deschide","vreau sa vad","vreau să văd"]
};

// extrage un posibil nume de cameră
function captureCameraName(raw){
  // 1) “abre/ver TCB”, “vreau să văd TCB”
  const p1 = /(?:abre|abrir|ver|muestra|desplegar|deschide|vreau(?:\s+s[ăa]\s+v[ăa]d))\s+(?:cam(e|é)ra\s+)?([A-Za-z0-9._ -]{2,})$/i;
  const m1 = raw.match(p1);
  if (m1) return m1[2].trim();

  // 2) întrebare scurtă: “TCB?”, “TCB”
  const t = raw.trim();
  if (/^[A-Za-z0-9._ -]{2,}$/.test(t)) return t;

  return null;
}

function includesAny(text, arr){ const n=norm(text); return arr.some(p=>n.includes(norm(p))); }
function hasToken(text, wordlist){
  const toks = norm(text).split(" ");
  return wordlist.some(w => toks.some(tk => fuzzyEq(tk, w)));
}

// detectează intenția (ordine strictă)
function detectIntent(text){
  if (includesAny(text, LEX.saludo) || hasToken(text, LEX.saludo)) return {id:"saludo"};
  if (includesAny(text, LEX.quien)) return {id:"quien_eres"};
  if (includesAny(text, LEX.setAn)) return {id:"set_anuncio"};
  if (includesAny(text, LEX.addCam)) return {id:"admin_add_camara"};
  if (includesAny(text, LEX.verAn))  return {id:"ver_anuncio"};

  // ver cámara — doar dacă există verb de cameră SAU un singur token gen “TCB?”
  if (includesAny(text, LEX.camVerb) || /^[A-Za-z0-9._ -]{2,}\??$/.test(text.trim())) {
    const cameraName = captureCameraName(text);
    if (cameraName) return {id:"ver_camara", slots:{cameraName}};
  }

  return {id:"desconocido"};
}

/* ——— UI: bubble cu efect scriere ——— */
function BotBubble({ reply_text, children }) {
  const [shown,setShown]=useState("");
  const idx=useRef(0);
  useEffect(()=>{ const txt=reply_text||""; const speed=18;
    const timer=setInterval(()=>{ idx.current+=1; setShown(txt.slice(0,idx.current)); if(idx.current>=txt.length) clearInterval(timer); }, speed);
    return()=>clearInterval(timer);
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

/* ——— card generic cu butoane ——— */
function ActionsRenderer({ obj }){
  return (
    <div className={styles.card}>
      {obj.title && <div className={styles.cardTitle}>{obj.title}</div>}
      {obj.subtitle && <div className={styles.cardSubtitle}>{obj.subtitle}</div>}
      <div className={styles.cardActions}>
        {(obj.actions||[]).map((a,i)=>{
          const go = ()=> window.open(a.route, a.newTab?"_blank":"_self","noopener,noreferrer");
          return <button key={i} className={styles.actionBtn} onClick={go}>{a.label}</button>;
        })}
      </div>
    </div>
  );
}

/* ——— box anunț ——— */
function AnnouncementBox({ content }){
  return (
    <div className={styles.annBox}>
      <div className={styles.annHead}>📣 Anuncio</div>
      <div className={styles.annBody}>{content || "Sin contenido."}</div>
    </div>
  );
}

/* ——— form inline adăugare cameră ——— */
function AddCameraInline({ onSubmit, saving }){
  const [name,setName]=useState(""); const [url,setUrl]=useState("");
  return (
    <form className={styles.formRow} onSubmit={e=>{e.preventDefault(); onSubmit({name,url});}}>
      <input className={styles.input} placeholder="Nombre (p.ej. TCB)" value={name} onChange={e=>setName(e.target.value)} required />
      <input className={styles.input} placeholder="URL (https://…)" type="url" value={url} onChange={e=>setUrl(e.target.value)} required />
      <button className={styles.sendBtn} type="submit" disabled={saving}>{saving?"Guardando…":"Añadir"}</button>
    </form>
  );
}

export default function RaynaHub(){
  const { profile } = useAuth();
  const role = profile?.role || "driver";

  const [messages,setMessages]=useState([
    { from:"bot", reply_text:"¡Hola! Soy Rayna, tu transportista virtual. Dime qué necesitas." }
  ]);
  const [text,setText]=useState("");
  const endRef=useRef(null);

  // stări de flux
  const [awaiting,setAwaiting]=useState(null); // "anuncio_text"
  const [saving,setSaving]=useState(false);

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[messages]);

  const send = async ()=>{
    const t = text.trim();
    if(!t) return;
    setMessages(m=>[...m,{from:"user", text:t}]);
    setText("");

    // ——— dacă așteptăm textul anunțului
    if (awaiting==="anuncio_text"){
      if (!(role==="admin" || role==="dispecer")){
        setMessages(m=>[...m,{from:"bot",reply_text:"Lo siento, no tienes permiso para publicar anuncios."}]);
        setAwaiting(null);
        return;
      }
      setSaving(true);
      const { error } = await supabase.from("anuncios").update({ content: t }).eq("id",1);
      setSaving(false);
      setAwaiting(null);
      setMessages(m=>[...m,{from:"bot",reply_text: error? "Ha ocurrido un error al guardar el anuncio." : "¡Anuncio actualizado con éxito!"}]);
      return;
    }

    // ——— NLU standard
    const { id, slots } = detectIntent(t);

    if (id==="saludo"){
      setMessages(m=>[...m,{from:"bot",reply_text:"¡Buenas! Soy Rayna — tu transportista virtual. ¿Qué hacemos?"}]);
      return;
    }
    if (id==="quien_eres"){
      setMessages(m=>[...m,{from:"bot",reply_text:"Soy Rayna: **R**utas • **A.Y.** Inteligencia Artificial • **N**avegar • **A**sistente. Formal pero cercana; rápida siempre 😉."}]);
      return;
    }
    if (id==="set_anuncio"){
      if (!(role==="admin" || role==="dispecer")){
        setMessages(m=>[...m,{from:"bot",reply_text:"No tienes permiso para actualizar anuncios."}]);
        return;
      }
      setAwaiting("anuncio_text");
      setMessages(m=>[...m,{from:"bot",reply_text:"Claro, ¿qué anuncio quieres?"}]);
      return;
    }
    if (id==="admin_add_camara"){
      if (role!=="admin"){
        setMessages(m=>[...m,{from:"bot",reply_text:"Solo los administradores pueden añadir cámaras."}]);
        return;
      }
      setMessages(m=>[...m,{from:"bot",reply_text:"Perfecto. Añadamos una cámara nueva:", render:()=>(
        <AddCameraInline saving={saving} onSubmit={async ({name,url})=>{
          setSaving(true);
          const { data, error } = await supabase
            .from("external_links")
            .insert({ name, url, icon_type:"camera", display_order:9999 })
            .select().single();
          setSaving(false);
          setMessages(mm=>[...mm,{from:"bot",reply_text: error? "No pude añadir la cámara. Revisa el URL." : `¡Listo! Cámara **${data.name}** añadida.`}]);
        }}/>
      )}]);
      return;
    }
    if (id==="ver_anuncio"){
      const { data, error } = await supabase.from("anuncios").select("content").eq("id",1).maybeSingle();
      const content = error? "No se pudo cargar el anuncio." : (data?.content || "Sin contenido.");
      setMessages(m=>[...m,{from:"bot",reply_text:"Este es el anuncio vigente:", render:()=> <AnnouncementBox content={content}/> }]);
      return;
    }
    if (id==="ver_camara"){
      const name = slots?.cameraName?.trim();
      if (!name){
        setMessages(m=>[...m,{from:"bot",reply_text:"Dime el nombre de la cámara (por ejemplo: TCB)."}]);
        return;
      }
      const { data, error } = await supabase
        .from("external_links")
        .select("id,name,url,icon_type")
        .eq("icon_type","camera")
        .ilike("name", `%${name}%`)
        .limit(1)
        .maybeSingle();
      if (error || !data){
        setMessages(m=>[...m,{from:"bot",reply_text:`No he encontrado la cámara "${name}".`}]);
        return;
      }
      const obj = { title: data.name, actions:[{type:"open",label:"Abrir cámara",route:data.url,newTab:true}] };
      setMessages(m=>[...m,{from:"bot",reply_text:`Aquí tienes **${data.name}**. Pulsa el botón para abrirla.`, render:()=> <ActionsRenderer obj={obj}/> }]);
      return;
    }

    // fallback
    setMessages(m=>[...m,{from:"bot",reply_text:"Te escucho. Puedo abrir cámaras por nombre, mostrar el anuncio o ayudarte con el depósito y el GPS."}]);
  };

  const end = useRef(null);
  useEffect(()=>{ end.current?.scrollIntoView({behavior:"smooth"}); },[messages]);

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
        <div ref={end}/>
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
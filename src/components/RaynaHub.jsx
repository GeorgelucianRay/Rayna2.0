import React, { useEffect, useRef, useState } from "react";
import styles from "./Chatbot.module.css";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthContext.jsx";

/** Personalidad:
 * Rayna — formal y cercana, con humor ligero.
 * Responde SIEMPRE en español.
 */

// ---------- utilidades de NLU (normalización + fuzzy) ----------
const DIAC = { á:"a", é:"e", í:"i", ó:"o", ú:"u", ü:"u", ñ:"n",
               Á:"a", É:"e", Í:"i", Ó:"o", Ú:"u", Ü:"u", Ñ:"n" };
const norm = (s)=> (s||"").toLowerCase()
  .replace(/[áéíóúüñÁÉÍÓÚÜÑ]/g,(c)=>DIAC[c]??c)
  .replace(/[^\p{L}\p{N}\s]/gu," ")
  .replace(/\s+/g," ").trim();

function editDistance(a,b){
  const al=a.length, bl=b.length;
  const d=Array.from({length:al+1},(_,i)=>Array.from({length:bl+1},(_,j)=>(i===0?j:j===0?i:0)));
  for(let i=1;i<=al;i++){
    for(let j=1;j<=bl;j++){
      const cost = a[i-1]===b[j-1]?0:1;
      d[i][j]=Math.min(d[i-1][j]+1, d[i][j-1]+1, d[i-1][j-1]+cost);
      if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1]) d[i][j]=Math.min(d[i][j], d[i-2][j-2]+cost);
    }
  }
  return d[al][bl];
}
const fuzzyEq = (a,b)=>{a=norm(a);b=norm(b); if(a===b) return true; const L=Math.max(a.length,b.length); const tol=L<=4?1:2; return editDistance(a,b)<=tol;};

// ---------- léxicos (ES + RO) ----------
const saludoLex = ["hola","buenas","buenos dias","buenas tardes","buenas noches","que tal","saludos","hey","hola rayna","buenas rayna","holaaa"];
const camLexES = ["camara","cámara","ver camara","ver cámara"];
const camLexRO = ["vreau sa vad","vreau să văd","vreau sa vad camera","vreau să văd camera"];
const anuncioAskES = ["que anuncio hay","qué anuncio hay","ver anuncio","anuncios"];
const anuncioAskRO = ["ce anunt avem","ce anunț avem","anunt","anunț"];
const addCamES = ["quiero anadir una camara","quiero añadir una camara","quiero añadir una cámara","agregar camara","agregar cámara"];
const setAnuncioES = ["quiero poner un anuncio","quiero publicar un anuncio","poner anuncio"];

// ---------- detección de intención básica ----------
function detectIntent(text){
  const t = norm(text);

  // saludo
  if (saludoLex.some(w=> t.includes(norm(w)) || t.split(" ").some(tok=>fuzzyEq(tok,w)))) {
    return { id:"saludo" };
  }

  // ver cámara por nombre (ej: "ver TCB", "vreau să văd TCB")
  const hasCamVerb = [...camLexES, ...camLexRO].some(w=> t.includes(norm(w)));
  if (hasCamVerb) {
    // intenta capturar el token final como nombre de cámara
    // ejemplo: "ver TCB", "vreau să văd TCB", "quiero ver camara TCB"
    const m = text.match(/(?:ver|vreo|vreau|camera|cámara)\s+(?:cam(e)ra\s+)?([A-Za-z0-9 _.-]{2,})$/i);
    const cameraName = m ? m[2]?.trim() : null;
    return { id:"ver_camara", slots:{ cameraName } };
  }

  // si escribe solo "TCB" o "ver TCB" sin verbo claro
  if (/^[A-Za-z0-9 _.-]{2,}$/.test(text.trim())) {
    return { id:"ver_camara", slots:{ cameraName: text.trim() } };
  }

  // consultar anuncio
  if ([...anuncioAskES, ...anuncioAskRO].some(w=> t.includes(norm(w)))) {
    return { id:"ver_anuncio" };
  }

  // admin: añadir cámara
  if (addCamES.some(w=> t.includes(norm(w)))) {
    return { id:"admin_add_camara" };
  }

  // admin/disp: poner anuncio
  if (setAnuncioES.some(w=> t.includes(norm(w)))) {
    return { id:"set_anuncio" };
  }

  return { id:"desconocido" };
}

// ---------- Burbuja bot con texto “máquina de escribir” ----------
function BotBubble({ reply_text, children }) {
  const [shown, setShown] = useState("");
  const idxRef = useRef(0);

  useEffect(()=>{
    const txt = reply_text || "";
    const speed = 18;
    const timer = setInterval(()=>{
      idxRef.current += 1;
      setShown(txt.slice(0, idxRef.current));
      if (idxRef.current >= txt.length) clearInterval(timer);
    }, speed);
    return ()=> clearInterval(timer);
  }, [reply_text]);

  return (
    <div className={`${styles.bubble} ${styles.bot}`}>
      <div className={styles.botText}>
        {shown}
        {shown.length < (reply_text||"").length && <span className={styles.cursor}>▍</span>}
      </div>
      {shown.length === (reply_text||"").length && children}
    </div>
  );
}

// ---------- Render de tarjeta genérica con acciones ----------
function ActionsRenderer({ obj }) {
  return (
    <div className={styles.card}>
      {obj.title && <div className={styles.cardTitle}>{obj.title}</div>}
      {obj.subtitle && <div className={styles.cardSubtitle}>{obj.subtitle}</div>}
      <div className={styles.cardActions}>
        {(obj.actions||[]).map((a,i)=>{
          const go = ()=> window.open(a.route, a.newTab ? "_blank" : "_self", "noopener,noreferrer");
          return (
            <button key={i} className={styles.actionBtn} onClick={go}>{a.label}</button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Caja de anuncio bonita ----------
function AnnouncementBox({ content }) {
  return (
    <div className={styles.annBox}>
      <div className={styles.annHead}>📣 Anuncio</div>
      <div className={styles.annBody}>{content || "Sin contenido."}</div>
    </div>
  );
}

// ---------- Formulario inline para añadir cámara (solo admin) ----------
function AddCameraInline({ onSubmit, saving }) {
  const [name, setName] = useState("");
  const [url, setUrl]   = useState("");
  return (
    <form className={styles.formRow} onSubmit={(e)=>{e.preventDefault(); onSubmit({name,url});}}>
      <input className={styles.input} placeholder="Nombre de la cámara (p.ej., TCB)" value={name} onChange={e=>setName(e.target.value)} required />
      <input className={styles.input} placeholder="URL (https://…)" type="url" value={url} onChange={e=>setUrl(e.target.value)} required />
      <button className={styles.sendBtn} type="submit" disabled={saving}>{saving? "Guardando…" : "Añadir"}</button>
    </form>
  );
}

export default function RaynaHub(){
  const { profile } = useAuth(); // profile?.role: "driver" | "dispecer" | "admin"
  const role = profile?.role || "driver";

  const [messages, setMessages] = useState([
    { from:"bot", reply_text:"¡Hola! Soy Rayna, tu transportista virtual. Dime qué necesitas." }
  ]);
  const [text, setText] = useState("");
  const endRef = useRef(null);

  // estados de flujo
  const [awaiting, setAwaiting] = useState(null); // "anuncio_text" | "new_camera"
  const [temp, setTemp] = useState(null);         // datos temporales para el flujo
  const [saving, setSaving] = useState(false);

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages]);

  const send = async ()=>{
    const t = text.trim();
    if (!t) return;
    setMessages(m=>[...m, {from:"user", text:t}]);
    setText("");

    // Si estamos en un flujo de espera:
    if (awaiting === "anuncio_text") {
      if (!(role==="admin" || role==="dispecer")) {
        setMessages(m=>[...m, {from:"bot", reply_text:"Lo siento, no tienes permiso para publicar anuncios."}]);
        setAwaiting(null);
        return;
      }
      setSaving(true);
      const { error } = await supabase.from("anuncios").update({ content: t }).eq("id", 1);
      setSaving(false);
      if (error) {
        setMessages(m=>[...m, {from:"bot", reply_text:"Ha ocurrido un error al guardar el anuncio."}]);
      } else {
        setMessages(m=>[...m, {from:"bot", reply_text:"¡Anuncio actualizado con éxito!"}]);
      }
      setAwaiting(null);
      return;
    }

    // NLU normal
    const intent = detectIntent(t);

    if (intent.id === "saludo") {
      setMessages(m=>[...m, {from:"bot", reply_text:"¡Buenas! Soy Rayna — tu transportista virtual. ¿Qué hacemos?"}]);
      return;
    }

    if (intent.id === "ver_camara") {
      const name = intent.slots?.cameraName?.trim();
      if (!name) {
        setMessages(m=>[...m, {from:"bot", reply_text:"Dime el nombre de la cámara (por ejemplo: TCB)."}]);
        return;
      }
      // busca en Supabase la cámara por nombre (ilike)
      const { data, error } = await supabase
        .from("external_links")
        .select("id,name,url,icon_type")
        .eq("icon_type","camera")
        .ilike("name", `%${name}%`)
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        setMessages(m=>[...m, {from:"bot", reply_text:`No he encontrado la cámara "${name}".` }]);
        return;
      }

      const obj = {
        title: data.name,
        actions: [{ type:"open", label:"Abrir cámara", route:data.url, newTab:true }]
      };

      setMessages(m=>[...m, {
        from:"bot",
        reply_text:`Aquí tienes **${data.name}**. Pulsa el botón para abrirla.`,
        objectsMarker: true, // marcador para render extra
        render: () => <ActionsRenderer obj={obj} />
      }]);
      return;
    }

    if (intent.id === "ver_anuncio") {
      const { data, error } = await supabase
        .from("anuncios")
        .select("content")
        .eq("id",1)
        .maybeSingle();

      const content = !error ? (data?.content || "Sin contenido.") : "No se pudo cargar el anuncio.";
      setMessages(m=>[...m, {
        from:"bot",
        reply_text:"Este es el anuncio vigente:",
        objectsMarker:true,
        render: () => <AnnouncementBox content={content} />
      }]);
      return;
    }

    if (intent.id === "admin_add_camara") {
      if (role !== "admin") {
        setMessages(m=>[...m, {from:"bot", reply_text:"Solo los administradores pueden añadir cámaras."}]);
        return;
      }
      // muestra formulario inline
      setAwaiting("new_camera");
      setTemp({});
      setMessages(m=>[...m, {
        from:"bot",
        reply_text:"Perfecto. Añadamos una cámara. Indica nombre y URL:",
        objectsMarker:true,
        render: () => (
          <AddCameraInline
            saving={saving}
            onSubmit={async ({name,url})=>{
              setSaving(true);
              const { data, error } = await supabase
                .from("external_links")
                .insert({ name, url, icon_type:"camera", display_order: 9999 })
                .select().single();
              setSaving(false);
              setAwaiting(null);
              if (error) {
                setMessages(m=>[...m, {from:"bot", reply_text:"No pude añadir la cámara. Revisa el URL y vuelve a intentarlo."}]);
              } else {
                setMessages(m=>[...m, {from:"bot", reply_text:`¡Listo! Cámara **${data.name}** añadida.`}]);
              }
            }}
          />
        )
      }]);
      return;
    }

    if (intent.id === "set_anuncio") {
      if (!(role==="admin" || role==="dispecer")) {
        setMessages(m=>[...m, {from:"bot", reply_text:"No tienes permiso para actualizar anuncios."}]);
        return;
      }
      setAwaiting("anuncio_text");
      setMessages(m=>[...m, {from:"bot", reply_text:"Claro, ¿qué anuncio quieres?"}]);
      return;
    }

    // fallback
    setMessages(m=>[...m, {from:"bot", reply_text:"Te escucho. Puedo abrir cámaras por nombre, mostrar el anuncio, o ayudarte con el depósito y el GPS."}]);
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
        {messages.map((m,i)=>{
          if (m.from==="user") {
            return <div key={i} className={`${styles.bubble} ${styles.me}`}>{m.text}</div>;
          }
          return (
            <BotBubble key={i} reply_text={m.reply_text}>
              {/* render opcional (botones / anuncio) */}
              {m.render ? m.render() : null}
            </BotBubble>
          );
        })}
        <div ref={endRef}/>
      </main>

      <footer className={styles.inputBar}>
        <input
          className={styles.input}
          placeholder="Escribe aquí… (ej.: Quiero ver TCB)"
          value={text}
          onChange={(e)=>setText(e.target.value)}
          onKeyDown={(e)=> e.key==="Enter" ? send() : null}
        />
        <button className={styles.sendBtn} onClick={send}>Enviar</button>
      </footer>
    </div>
  );
}
import React, { useEffect, useRef, useState } from "react";
import styles from "./Chatbot.module.css";

/* --- utilități NLU (salut) rămân neschimbate --- */
const DIAC = { á:"a", é:"e", í:"i", ó:"o", ú:"u", ü:"u", ñ:"n",
               Á:"a", É:"e", Í:"i", Ó:"o", Ú:"u", Ü:"u", Ñ:"n" };
const norm = (s)=> (s||"").toLowerCase()
  .replace(/[áéíóúüñÁÉÍÓÚÜÑ]/g,(c)=>DIAC[c]??c)
  .replace(/[^\p{L}\p{N}\s]/gu," ")
  .replace(/\s+/g," ").trim();
function editDistance(a,b){const al=a.length,bl=b.length;const d=Array.from({length:al+1},(_,i)=>Array.from({length:bl+1},(_,j)=>(i===0?j:j===0?i:0)));for(let i=1;i<=al;i++){for(let j=1;j<=bl;j++){const cost=a[i-1]===b[j-1]?0:1;d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+cost);if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])d[i][j]=Math.min(d[i][j],d[i-2][j-2]+cost);}}return d[al][bl];}
function fuzzyEq(a,b){a=norm(a);b=norm(b);if(a===b)return true;const L=Math.max(a.length,b.length);const tol=L<=4?1:2;return editDistance(a,b)<=tol;}
const saludoLex=["hola","buenas","buenos","buenas tardes","buenas noches","buenos dias","que tal","qué tal","saludos","hey","epa","ole","hola rayna","buenas rayna","holaaa","holi","holis"];
const saludosRespuestas=[
  "¡Hola! Soy Rayna, tu transportista virtual. ¿En qué te ayudo hoy?",
  "¡Buenas! Aquí Rayna — listas las rutas, listo el plan. ¿Qué necesitas?",
  "¡Hola! Soy Rayna (Rutas • IA • Navegar • Asistente). Dime y lo movemos.",
  "¡Ey! Soy Rayna. Formal cuando toca, rápida siempre 😉. ¿Qué hacemos?"
];
function esSaludo(text){const t=norm(text);const tokens=t.split(" ");for(const lex of saludoLex){if(t.includes(norm(lex)))return true;if(tokens.some(w=>fuzzyEq(w,lex)))return true;}return false;}

function generarRespuesta(userText){
  if (esSaludo(userText)) {
    const msg = saludosRespuestas[Math.floor(Math.random()*saludosRespuestas.length)];
    return {
      reply_text: msg,
      objects: [
        {
          type:"intro", id:"rayna_intro",
          title:"Rayna 2.0", subtitle:"Rutas • IA • Navegar • Asistente",
          actions:[
            { type:"navigate", label:"Ver camiones", route:"/depot" },
            { type:"navigate", label:"Ir al GPS", route:"/gps" }
          ]
        }
      ],
      suggested_buttons:[
        { label:"¿Mi camión?", intent:"get_truck_info" },
        { label:"Ir a un cliente", intent:"go_to_client" }
      ]
    };
  }
  return {
    reply_text:"Te escucho. Puedo saludarte, abrir el depósito o el GPS. En nada sabré también consultar camiones y clientes.",
    objects:[],
    suggested_buttons:[
      { label:"Abrir depósito", intent:"open_depot" },
      { label:"Abrir GPS", intent:"open_gps" }
    ]
  };
}

/* ---------- renderer pentru carduri ---------- */
function ActionsRenderer({ obj }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>{obj.title}</div>
      {obj.subtitle && <div className={styles.cardSubtitle}>{obj.subtitle}</div>}
      <div className={styles.cardActions}>
        {(obj.actions||[]).map((a,i)=>{
          const go = ()=> window.location.href = a.route;
          return (
            <button key={i} className={styles.actionBtn} onClick={go}>
              {a.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- bule bot cu efect “mașină de scris” ---------- */
function BotBubble({ reply_text, objects=[], suggested_buttons=[], onDone }) {
  const [shown, setShown] = useState("");
  const [finished, setFinished] = useState(false);
  const idxRef = useRef(0);

  useEffect(()=>{
    const txt = reply_text || "";
    const speed = 18; // ms per caracter (ajustează după gust)
    const timer = setInterval(()=>{
      idxRef.current += 1;
      setShown(txt.slice(0, idxRef.current));
      if (idxRef.current >= txt.length) {
        clearInterval(timer);
        setFinished(true);
        onDone?.();
      }
    }, speed);
    return ()=> clearInterval(timer);
  }, [reply_text, onDone]);

  return (
    <div className={`${styles.bubble} ${styles.bot}`}>
      <div className={styles.botText}>
        {shown}
        {!finished && <span className={styles.cursor}>▍</span>}
      </div>

      {finished && objects.map((o,i)=><ActionsRenderer key={i} obj={o} />)}
      {finished && suggested_buttons.length>0 && (
        <div className={styles.suggested}>
          {suggested_buttons.map((b,i)=>
            <button key={i} className={styles.suggestedBtn}
              onClick={()=>{ const e = new Event("rayna-quick"); e.value=b.label; window.dispatchEvent(e);} }>
              {b.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function RaynaHub(){
  const [messages, setMessages] = useState([
    {
      from:"bot",
      reply_text:"¡Hola! Soy Rayna, tu transportista virtual. ¿Listos para rodar?",
      objects:[{
        type:"intro", id:"start",
        title:"Rayna 2.0", subtitle:"Rutas • IA • Navegar • Asistente",
        actions:[
          { type:"navigate", label:"Abrir depósito", route:"/depot" },
          { type:"navigate", label:"Abrir GPS", route:"/gps" }
        ]
      }],
      suggested_buttons:[
        { label:"¿Quién eres?", intent:"who_is_rayna" },
        { label:"Ver camiones", intent:"open_depot" }
      ]
    }
  ]);
  const [text, setText] = useState("");
  const endRef = useRef(null);

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages]);

  useEffect(()=>{
    const handler = (ev)=>{ setText(ev.value); setTimeout(send,0); };
    window.addEventListener("rayna-quick", handler);
    return ()=> window.removeEventListener("rayna-quick", handler);
  },[]);

  const send = ()=>{
    const t = text.trim();
    if (!t) return;
    setMessages(m=>[...m, {from:"user", text:t}]);
    setText("");
    const reply = generarRespuesta(t);
    setMessages(m=>[...m, {from:"bot", ...reply}]);
  };

  const handleQuick = (label)=>{ setText(label); setTimeout(send,0); };

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
          // bot cu animație
          return <BotBubble key={i} reply_text={m.reply_text} objects={m.objects||[]} suggested_buttons={m.suggested_buttons||[]} />;
        })}
        <div ref={endRef}/>
      </main>

      <footer className={styles.inputBar}>
        <input
          className={styles.input}
          placeholder="Escribe aquí… (ej.: Hola Rayna)"
          value={text}
          onChange={(e)=>setText(e.target.value)}
          onKeyDown={(e)=> e.key==="Enter" ? send() : null}
        />
        <button className={styles.sendBtn} onClick={send}>Enviar</button>
      </footer>
    </div>
  );
}
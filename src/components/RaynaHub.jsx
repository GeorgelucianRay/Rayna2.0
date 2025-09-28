import React, { useEffect, useRef, useState } from "react";
import styles from "./Chatbot.module.css";

/**
 * Rayna — tu transportista virtual
 * R = Rutas
 * A.Y. = Inteligencia Artificial
 * N = Navegar
 * A = Asistente
 *
 * Personalidad: formal pero cercana; con humor leve y carácter firme.
 * Idioma de respuesta: ESPAÑOL (siempre).
 *
 * NOTA: Este primer paso es local y sin backend/LLM.
 * Tiene NLU simple con tolerancia a errores para SALUDOS.
 * Luego añadiremos más intenciones (camiones, clientes, GPS, etc.).
 */

// -------- Utilidades de NLU (normalización + fuzzy simple) --------
const DIAC = { á:"a", é:"e", í:"i", ó:"o", ú:"u", ü:"u", ñ:"n",
               Á:"a", É:"e", Í:"i", Ó:"o", Ú:"u", Ü:"u", Ñ:"n" };

const norm = (s) =>
  (s || "")
    .toLowerCase()
    .replace(/[áéíóúüñÁÉÍÓÚÜÑ]/g, (c) => DIAC[c] ?? c)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

// Damerau–Levenshtein muy compacto (tolerancia a 1–2 errores para palabras cortas)
function editDistance(a, b) {
  const al = a.length, bl = b.length;
  const d = Array.from({ length: al + 1 }, (_, i) =>
    Array.from({ length: bl + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,     // borrado
        d[i][j - 1] + 1,     // inserción
        d[i - 1][j - 1] + cost // sustitución
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost); // transposición
      }
    }
  }
  return d[al][bl];
}

// ¿palabras casi iguales?
function fuzzyEq(a, b) {
  a = norm(a); b = norm(b);
  if (a === b) return true;
  const L = Math.max(a.length, b.length);
  const tol = L <= 4 ? 1 : 2;            // tolerancia adaptativa
  return editDistance(a, b) <= tol;
}

// -------- Intención: SALUDO --------
const saludoLex = [
  "hola","buenas","buenos","buenas tardes","buenas noches","buenos dias",
  "qué tal","que tal","saludos","hey","epa","ole","buenas rayna","hola rayna",
  "holaaa","holi","holis"
];

const saludosRespuestas = [
  "¡Hola! Soy **Rayna**, tu transportista virtual. ¿En qué te ayudo hoy?",
  "¡Buenas! Aquí Rayna — listas las rutas, listo el plan. ¿Qué necesitas?",
  "¡Hola! Soy Rayna (Rutas • IA • Navegar • Asistente). Dime y lo movemos.",
  "¡Ey! Soy Rayna. Formal cuando toca, rápida siempre 😉. ¿Qué hacemos?"
];

// detecta si el mensaje es un saludo (tolerante a errores)
function esSaludo(text) {
  const t = norm(text);
  const tokens = t.split(" ");
  for (const lex of saludoLex) {
    // coincidencia directa o fuzzy por palabra
    if (t.includes(norm(lex))) return true;
    if (tokens.some((w) => fuzzyEq(w, lex))) return true;
  }
  return false;
}

// -------- Generador de respuesta base (solo SALUDO por ahora) --------
function generarRespuesta(userText) {
  // Siempre responder en español
  if (esSaludo(userText)) {
    const msg = saludosRespuestas[Math.floor(Math.random() * saludosRespuestas.length)];
    return {
      reply_text: msg,
      objects: [
        {
          type: "intro",
          id: "rayna_intro",
          title: "Rayna 2.0",
          subtitle: "Rutas • IA • Navegar • Asistente",
          actions: [
            { type: "navigate", label: "Ver camiones", route: "/depot" },
            { type: "navigate", label: "Ir al GPS", route: "/gps" }
          ]
        }
      ],
      suggested_buttons: [
        { label: "¿Mi camión?", intent: "get_truck_info" },
        { label: "Ir a un cliente", intent: "go_to_client" }
      ]
    };
  }

  // fallback inicial (hasta añadir más intenciones)
  return {
    reply_text:
      "Te escucho. Puedo saludarte, abrir el depósito o el GPS. En nada sabré también consultar camiones y clientes.",
    objects: [],
    suggested_buttons: [
      { label: "Abrir depósito", intent: "open_depot" },
      { label: "Abrir GPS", intent: "open_gps" }
    ]
  };
}

// -------- Render de objetos/acciones (botones y navegación) --------
function ActionsRenderer({ obj }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>{obj.title}</div>
      {obj.subtitle && <div className={styles.cardSubtitle}>{obj.subtitle}</div>}
      <div className={styles.cardActions}>
        {(obj.actions || []).map((a, i) => {
          if (a.type === "navigate" || a.type === "open") {
            return (
              <button key={i} className={styles.actionBtn}
                onClick={() => (window.location.href = a.route)}>
                {a.label}
              </button>
            );
          }
          return (
            <button key={i} className={styles.actionBtn}>{a.label}</button>
          );
        })}
      </div>
    </div>
  );
}

// -------- Componente principal: Chat --------
export default function RaynaHub() {
  const [messages, setMessages] = useState([
    {
      from: "bot",
      reply_text:
        "¡Hola! Soy **Rayna**, tu transportista virtual. ¿Listos para rodar?",
      objects: [
        {
          type: "intro",
          id: "start",
          title: "Rayna 2.0",
          subtitle: "Rutas • IA • Navegar • Asistente",
          actions: [
            { type: "navigate", label: "Abrir depósito", route: "/depot" },
            { type: "navigate", label: "Abrir GPS", route: "/gps" }
          ]
        }
      ],
      suggested_buttons: [
        { label: "¿Quién eres?", intent: "who_is_rayna" },
        { label: "Ver camiones", intent: "open_depot" }
      ]
    }
  ]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setMessages((m) => [...m, { from: "user", text: t }]);
    setText("");
    setTyping(true);

    // Simula “escribiendo…”
    setTimeout(() => {
      const reply = generarRespuesta(t);
      setMessages((m) => [...m, { from: "bot", ...reply }]);
      setTyping(false);
    }, 300);
  };

  const handleQuick = (label) => {
    setText(label);
    setTimeout(send, 0);
  };

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.logoDot} />
        <div>
          <div className={styles.brand}>Rayna 2.0</div>
          <div className={styles.tagline}>Tu transportista virtual</div>
        </div>
      </header>

      <main className={styles.chat}>
        {messages.map((m, i) =>
          m.from === "user" ? (
            <div key={i} className={`${styles.bubble} ${styles.me}`}>{m.text}</div>
          ) : (
            <div key={i} className={`${styles.bubble} ${styles.bot}`}>
              <div
                className={styles.botText}
                dangerouslySetInnerHTML={{ __html: m.reply_text?.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }}
              />
              {(m.objects || []).map((o, j) => <ActionsRenderer key={j} obj={o} />)}
              {(m.suggested_buttons || []).length > 0 && (
                <div className={styles.suggested}>
                  {m.suggested_buttons.map((b, k) => (
                    <button key={k} className={styles.suggestedBtn} onClick={() => handleQuick(b.label)}>
                      {b.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        )}
        {typing && <div className={`${styles.bubble} ${styles.bot}`}>Escribiendo…</div>}
        <div ref={endRef} />
      </main>

      <footer className={styles.inputBar}>
        <input
          className={styles.input}
          placeholder="Escribe aquí… (ej.: Hola Rayna)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e)=> e.key === "Enter" ? send() : null}
        />
        <button className={styles.sendBtn} onClick={send}>Enviar</button>
      </footer>
    </div>
  );
}
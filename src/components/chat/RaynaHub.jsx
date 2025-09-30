import React, { useEffect, useRef, useState } from "react";
import styles from "./Chatbot.module.css";

// din src/
import { useAuth } from "../../AuthContext";
import intentsData from "../../rayna.intents.json";
import { detectIntent } from "../../nluEngine";

// barrels locale
import { BotBubble } from "./ui";
import { scrollToBottom, tpl } from "./helpers";
import {
  handleStatic,
  handleDialog,
  handleOpenCamera,
  handleShowAnnouncement,
  handleGpsNavigate,
  handleGpsInfo,
  handleGpsLists,
} from "./actions";

export default function RaynaHub() {
  const { profile, loading } = useAuth(); // <— folosim și loading din context
  const role = profile?.role || "driver";

  // pornim fără mesaje; adăugăm salutul când profilul e gata
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [awaiting, setAwaiting] = useState(null);
  const [saving, setSaving] = useState(false);
  const endRef = useRef(null);

  useEffect(() => scrollToBottom(endRef), [messages]);

  // ——— Salut personalizat din profil (o singură dată, când se termină loading-ul)
  useEffect(() => {
    if (messages.length > 0) return;    // nu rescrie conversația dacă a început
    if (loading) return;                 // așteptăm să se încarce contextul

    const saludo =
      intentsData.find((i) => i.id === "saludo")?.response?.text || "¡Hola!";

    // prenume din nombre_completo, altfel username
    const firstName = (() => {
      const n = (profile?.nombre_completo || "").trim();
      if (n) return n.split(/\s+/)[0];
      return profile?.username || "";
    })();

    // suportă și template-uri din JSON: {{name}}, {{profile.nombre_completo}} etc.
    const reply =
      tpl(saludo, { name: firstName, user: profile, profile }) ||
      (firstName ? `Hola, ${firstName}. ¿En qué te puedo ayudar hoy?` : saludo);

    setMessages([{ from: "bot", reply_text: reply }]);
  }, [loading, profile, messages.length]);

  const send = async () => {
    const userText = text.trim();
    if (!userText) return;

    setMessages((m) => [...m, { from: "user", text: userText }]);
    setText("");

    // pași de dialog care așteaptă input (ex: anuncio)
    if (awaiting === "anuncio_text") {
      await handleDialog.stepAnuncio({
        userText,
        role,
        setMessages,
        setAwaiting,
        saving,
        setSaving,
        intentsData,
      });
      return;
    }

    // detectează intenția + sloturile
    const { intent, slots } = detectIntent(userText, intentsData);

    // dispecer
    if (intent.type === "static") {
      await handleStatic({ intent, setMessages });
      return;
    }

    if (intent.type === "dialog") {
      const handled = await handleDialog.entry({
        intent,
        role,
        setMessages,
        setAwaiting,
        saving,
        setSaving,
      });
      if (handled) return;
    }

    if (intent.type === "action") {
      if (intent.action === "open_camera") {
        await handleOpenCamera({ intent, slots, setMessages });
        return;
      }
      if (intent.action === "show_announcement") {
        await handleShowAnnouncement({ intent, setMessages });
        return;
      }
      if (intent.id === "gps_navegar_a" || intent.action === "gps_route_preview") {
        await handleGpsNavigate({ intent, slots, setMessages });
        return;
      }
      if (intent.id === "gps_info_de") {
        await handleGpsInfo({ intent, slots, setMessages });
        return;
      }
      if (intent.action === "gps_list") {
        await handleGpsLists({ intent, setMessages });
        return;
      }
    }

    // fallback
    setMessages((m) => [
      ...m,
      {
        from: "bot",
        reply_text:
          intentsData.find((i) => i.id === "fallback")?.response?.text ||
          "No te he entendido.",
      },
    ]);
  };

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        {/* avatar Rayna din profil (cu fallback local) */}
        <img
          src={profile?.avatar_url || "/avatar-fallback.png"}
          alt={profile?.nombre_completo || "Rayna"}
          className={styles.avatar}
          onError={(e) => { e.currentTarget.src = "/avatar-fallback.png"; }}
        />

        <div className={styles.headerTitleWrap}>
          <div className={styles.brand}>Rayna 2.0</div>
          <div className={styles.tagline}>
            {profile?.nombre_completo || "Tu transportista virtual"}
          </div>
        </div>

        <button className={styles.closeBtn} onClick={() => window.history.back()}>
          ×
        </button>
      </header>

      <main className={styles.chat}>
        {messages.map((m, i) =>
          m.from === "user" ? (
            <div key={i} className={`${styles.bubble} ${styles.me}`}>
              {m.text}
            </div>
          ) : (
            <BotBubble key={i} reply_text={m.reply_text}>
              {m.render ? m.render() : null}
            </BotBubble>
          )
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
        <button className={styles.sendBtn} onClick={send}>
          Enviar
        </button>
      </footer>
    </div>
  );
}
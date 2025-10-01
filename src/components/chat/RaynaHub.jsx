// src/components/chat/RaynaHub.jsx
import React, { useEffect, useRef, useState } from "react";
import styles from "./Chatbot.module.css";

// din src/
import { useAuth } from "../../AuthContext";
import intentsData from "../../rayna.intents.json";
import { detectIntent } from "../../nluEngine";

// hooks
import useIOSNoInputZoom from "../../hooks/useIOSNoInputZoom";

// barrels locale
import { BotBubble } from "./ui";
import { scrollToBottom } from "./helpers";
import {
  handleStatic,
  handleDialog,
  handleOpenCamera,
  handleShowAnnouncement,
  handleGpsNavigate,
  handleGpsInfo,
  handleGpsLists,
  handleProfileStiff.jsx,
} from "./actions";

// ✅ avatar Rayna din /public
const RAYNA_AVATAR = "/AvatarRayna.PNG";

export default function RaynaHub() {
  useIOSNoInputZoom();

  const { profile, loading } = useAuth();
  const role = profile?.role || "driver";

  // pornim fără mesaje; adăugăm salutul când e gata profilul
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [awaiting, setAwaiting] = useState(null);
  const [saving, setSaving] = useState(false);
  const endRef = useRef(null);

  useEffect(() => scrollToBottom(endRef), [messages]);

  // ——— Salut personalizat imediat ce avem profilul
  useEffect(() => {
    if (loading) return;
    if (messages.length > 0) return;

    const saludoDefault =
      intentsData.find((i) => i.id === "saludo")?.response?.text ||
      "¡Hola! ¿En qué te puedo ayudar hoy?";

    const firstName = (() => {
      const n = (profile?.nombre_completo || "").trim();
      if (n) return n.split(/\s+/)[0];
      return profile?.username || "";
    })();

    const saludo = firstName
      ? `Hola, ${firstName}. ¿En qué te puedo ayudar hoy?`
      : saludoDefault;

    setMessages([{ from: "bot", reply_text: saludo }]);
  }, [loading, profile]); // nu include messages.length aici ca să nu retragă salutul

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

    // detectare intenție
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
      if (intent.action === "open_camera")
        return await handleOpenCamera({ intent, slots, setMessages });

      if (intent.action === "show_announcement")
        return await handleShowAnnouncement({ intent, setMessages });

      if (intent.id === "gps_navegar_a" || intent.action === "gps_route_preview")
        return await handleGpsNavigate({ intent, slots, setMessages });

      if (intent.id === "gps_info_de")
        return await handleGpsInfo({ intent, slots, setMessages });

      if (intent.action === "gps_list")
        return await handleGpsLists({ intent, setMessages });
    }

        if (intent.type === "action") {
      if (intent.action === "open_camera") {
        return await handleOpenCamera({ intent, slots, setMessages });
      }
      if (intent.action === "show_announcement") {
        return await handleShowAnnouncement({ intent, setMessages });
      }
      if (intent.id === "gps_navegar_a" || intent.action === "gps_route_preview") {
        return await handleGpsNavigate({ intent, slots, setMessages });
      }
      if (intent.id === "gps_info_de") {
        return await handleGpsInfo({ intent, slots, setMessages });
      }
      if (intent.action === "gps_list") {
        return await handleGpsLists({ intent, setMessages });
      }

      // 🔹 NOILE ACȚIUNI
      if (intent.action === "open_my_truck") {
        return await handleOpenMyTruck({ profile, setMessages });
      }
      if (intent.action === "who_am_i") {
        return await handleWhoAmI({ profile, setMessages });
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
        {/* ✅ Avatar Rayna din /public */}
        <img
          src={RAYNA_AVATAR}
          alt="Rayna"
          className={styles.avatar}
          onError={(e) => {
            // fallback simplu dacă fișierul lipsește
            e.currentTarget.style.visibility = "hidden";
          }}
        />
        <div className={styles.headerTitleWrap}>
          <div className={styles.brand}>Rayna 2.0</div>
          <div className={styles.tagline}>Tu transportista virtual</div>
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
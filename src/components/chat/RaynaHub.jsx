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
  // noile acțiuni (named)
  handleOpenMyTruck,
  handleWhoAmI,
  handleParkingNearStart,
  handleParkingNext,
} from "./actions";

// ✅ avatar Rayna din /public
const RAYNA_AVATAR = "/AvatarRayna.PNG";

export default function RaynaHub() {
  useIOSNoInputZoom();

  const { profile, loading } = useAuth();
  const role = profile?.role || "driver";

  // stare chat
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [awaiting, setAwaiting] = useState(null);
  const [saving, setSaving] = useState(false);

  // context „parking” (lista de sugestii & cursorul curent)
  const [parkingCtx, setParkingCtx] = useState(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, profile]);

  // geoloc opțională (folosită pentru „parking por el camino”)
  async function tryGetUserPos() {
    if (!("geolocation" in navigator)) return null;
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => resolve({ lat: coords.latitude, lon: coords.longitude }),
          () => resolve(null), // nu stricăm fluxul dacă userul refuză
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );
      });
      return pos;
    } catch {
      return null;
    }
  }

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
      // acțiuni existente
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

      // 🔹 NOU: profil
      if (intent.action === "open_my_truck") {
        await handleOpenMyTruck({ profile, setMessages });
        return;
      }
      if (intent.action === "who_am_i") {
        await handleWhoAmI({ profile, setMessages });
        return;
      }

      // 🔹 NOU: parking „cerca de … / por el camino”
      if (intent.action === "gps_find_parking_near" || intent.id === "gps_buscar_parking_cerca_de") {
        const userPos = await tryGetUserPos(); // e ok și dacă e null
        await handleParkingNearStart({
          slots,
          setMessages,
          setParkingCtx,
          userPos,
        });
        return;
      }

      // 🔹 NOU: „otro / algo más / no me queda disco …”
      if (intent.action === "gps_parking_next_suggestion" || intent.id === "gps_otro_parking") {
        await handleParkingNext({ parkingCtx, setMessages });
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
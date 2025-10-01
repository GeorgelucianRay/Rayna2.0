// src/components/chat/RaynaHub.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./Chatbot.module.css";

// —— auth & NLU
import { useAuth } from "../../AuthContext";
import { detectIntent } from "../../nlu";

// —— hooks
import useIOSNoInputZoom from "../../hooks/useIOSNoInputZoom";

// —— UI locale
import { BotBubble } from "./ui";
import { scrollToBottom } from "./helpers";

// —— handlers (actions) — existente în proiectul tău
import {
  handleStatic,
  handleDialog,
  handleOpenCamera,
  handleShowAnnouncement,
  handleGpsNavigate,
  handleGpsInfo,
  handleGpsLists,
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

  // —— chat state
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [awaiting, setAwaiting] = useState(null);
  const [saving, setSaving] = useState(false);

  // —— context „parking” (lista de sugestii & cursorul curent)
  const [parkingCtx, setParkingCtx] = useState(null);

  // —— AUTO-LOAD: toate fișierele de intents din /intents
  // Ex: rayna.intents.saludos.json, rayna.intents.anuncios.json,
  //     rayna.intents.gps.json, rayna.intents.camaras.json,
  //     rayna.intents.perfil.json, rayna.intents.vehiculo.json, etc.
  const intentsData = useMemo(() => {
    // Vite: importă toate fișierele JSON care respectă tiparul
    const modules = import.meta.glob("../../intents/rayna.intents.*.json", { eager: true });
    const all = Object.values(modules)
      .map((m) => (m && m.default ? m.default : m)) // fiecare modul exportă default-ul JSON
      .flat()
      .filter(Boolean);
    // sortăm o singură dată după priority desc (optimizare mică)
    return all.sort((a, b) => (b?.priority || 0) - (a?.priority || 0));
  }, []);

  const endRef = useRef(null);
  useEffect(() => scrollToBottom(endRef), [messages]);

  // —— salut personalizat când avem profilul
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
  }, [loading, profile, intentsData]);

  // —— geolocație (pentru „parking por el camino”); best-effort
  async function tryGetUserPos() {
    if (!("geolocation" in navigator)) return null;
    try {
      const pos = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => resolve({ lat: coords.latitude, lon: coords.longitude }),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );
      });
      return pos;
    } catch {
      return null;
    }
  }

  // —— dispecer pentru acțiuni (map clar ⇢ handler)
  async function dispatchAction(intent, slots) {
    const actionKey = intent.action || intent.id;

    const table = {
      // camere / anunț
      open_camera: () => handleOpenCamera({ intent, slots, setMessages }),
      show_announcement: () => handleShowAnnouncement({ intent, setMessages }),

      // GPS
      gps_route_preview: () => handleGpsNavigate({ intent, slots, setMessages }),
      gps_place_info: () => handleGpsInfo({ intent, slots, setMessages }),
      gps_list: () => handleGpsLists({ intent, setMessages }),

      // profil (din rayna.intents.perfil.json)
      open_my_truck: () => handleOpenMyTruck({ profile, setMessages }),
      who_am_i: () => handleWhoAmI({ profile, setMessages }),

      // parking „cerca de / por el camino” (din rayna.intents.gps.json sau parking.json dacă ai separat)
      gps_find_parking_near: async () => {
        const userPos = await tryGetUserPos(); // poate fi null, handlerul se descurcă
        return handleParkingNearStart({ slots, setMessages, setParkingCtx, userPos });
      },
      gps_parking_next_suggestion: () => handleParkingNext({ parkingCtx, setMessages }),

      // ——— Dacă ai (sau vei avea) handler-e pentru vehicul, mapează-le aici, ex.:
      // veh_itv_truck:    () => handleVehItvTruck({ profile, setMessages }),
      // veh_oil_status:   () => handleVehOilStatus({ profile, setMessages }),
      // veh_adblue_filter_status: () => handleVehAdblueFilterStatus({ profile, setMessages }),
      // etc.
    };

    if (table[actionKey]) {
      return table[actionKey]();
    }

    // fallback dacă nu avem handler mapat
    setMessages((m) => [
      ...m,
      { from: "bot", reply_text: "Tengo la intención, pero aún no tengo handler para esta acción." },
    ]);
  }

  // —— trimitere mesaje
  const send = async () => {
    const userText = text.trim();
    if (!userText) return;

    setMessages((m) => [...m, { from: "user", text: userText }]);
    setText("");

    // 1) pași de dialog blocați (ex: anuncio)
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

    // 2) detectare intent
    const { intent, slots } = detectIntent(userText, intentsData);

    // 3) dispecer pe tip
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
      await dispatchAction(intent, slots);
      return;
    }

    // 4) fallback
    const fb =
      intentsData.find((i) => i.id === "fallback")?.response?.text ||
      "No te he entendido.";
    setMessages((m) => [...m, { from: "bot", reply_text: fb }]);
  };

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <img
          src={RAYNA_AVATAR}
          alt="Rayna"
          className={styles.avatar}
          onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
        />
        <div className={styles.headerTitleWrap}>
          <div className={styles.brand}>Rayna 2.0</div>
          <div className={styles.tagline}>Tu transportista virtual</div>
        </div>
        <button className={styles.closeBtn} onClick={() => window.history.back()}>×</button>
      </header>

      <main className={styles.chat}>
        {messages.map((m, i) =>
          m.from === "user" ? (
            <div key={i} className={`${styles.bubble} ${styles.me}`}>{m.text}</div>
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
        <button className={styles.sendBtn} onClick={send}>Enviar</button>
      </footer>
    </div>
  );
}
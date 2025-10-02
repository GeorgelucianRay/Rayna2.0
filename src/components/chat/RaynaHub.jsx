// src/components/chat/RaynaHub.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./Chatbot.module.css";

// —— auth & NLU
import { useAuth } from "../../AuthContext";
import { detectIntent, normalize } from "../../nlu";

// —— hooks
import useIOSNoInputZoom from "../../hooks/useIOSNoInputZoom";

// —— UI locale
import { BotBubble } from "./ui";
import { scrollToBottom } from "./helpers";

// —— handlers (actions)
import {
  handleStatic,
  handleDialog,
  handleOpenCamera,
  handleShowAnnouncement,
  handleGpsNavigate,
  handleGpsInfo,
  handleGpsLists,

  // profil
  handleWhoAmI,
  handleOpenMyTruck,
  handleDriverSelfInfo,
  handleProfileCompletionStart,
  handleWhatDoYouKnowAboutMe,
  handleShowAprenderPerfil,
  handleProfileCompletionStart,
  handleProfileAdvantagesVideo,

  // vehicul
  handleVehItvTruck,
  handleVehItvTrailer,
  handleVehOilStatus,
  handleVehAdblueFilterStatus,

  // parking
  handleParkingNearStart,
  handleParkingNext,
} from "./actions";

// —— agregatorul de intenții (src/intents/index.js export default all)
import ALL_INTENTS from "../../intents";

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

  // —— memorăm intențiile (agregate + eventual validate în /intents/index.js)
  const intentsData = useMemo(() => ALL_INTENTS || [], []);

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
  }, [loading, profile]);

  // —— geolocație (best-effort pentru „parking por el camino”)
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
    const actionKey = (intent?.action || intent?.id || "").trim();

    const table = {
      // camere / anunț
      open_camera: () => handleOpenCamera({ intent, slots, setMessages }),
      show_announcement: () => handleShowAnnouncement({ intent, setMessages }),

      // GPS
      gps_route_preview: () => handleGpsNavigate({ intent, slots, setMessages }),
      gps_place_info: () => handleGpsInfo({ intent, slots, setMessages }),
      gps_list: () => handleGpsLists({ intent, setMessages }),

      // profil
      who_am_i: () => handleWhoAmI({ profile, setMessages, setAwaiting }), // ← PASĂM setAwaiting!
      open_my_truck: () => handleOpenMyTruck({ profile, setMessages }),
      profile_start_completion: () => handleProfileCompletionStart({ setMessages }),
      profile_advantages_video: () => handleProfileAdvantagesVideo({ setMessages }), // ⬅️ ADĂUGAT
      
      // 🔹 „¿qué sabes de mí?”
    profile_what_you_know: () =>
      handleWhatDoYouKnowAboutMe({ profile, setMessages, setAwaiting }),

    // 🔹 deschide „Aprender” pe tema „perfil completado”
    profile_show_advantages_video: () =>
      handleShowAprenderPerfil({ setMessages }),

      // self-info generic pe meta.topic (din me_* intents)
      driver_self_info: () => handleDriverSelfInfo({ profile, intent, setMessages }),

      // vehicul
      veh_itv_truck: () => handleVehItvTruck({ profile, setMessages }),
      veh_itv_trailer: () => handleVehItvTrailer({ profile, setMessages }),
      veh_oil_status: () => handleVehOilStatus({ profile, setMessages }),
      veh_adblue_filter_status: () => handleVehAdblueFilterStatus({ profile, setMessages }),

      // parking
      gps_find_parking_near: async () => {
        const userPos = await tryGetUserPos();
        return handleParkingNearStart({ slots, setMessages, setParkingCtx, userPos });
      },
      gps_parking_next_suggestion: () => handleParkingNext({ parkingCtx, setMessages }),
    };

    console.debug("[RaynaHub] dispatchAction →", {
      id: intent?.id,
      action: intent?.action,
      actionKey,
      hasHandler: !!table[actionKey],
      slots,
    });

    try {
      if (table[actionKey]) {
        return await table[actionKey]();
      }
      setMessages((m) => [
        ...m,
        { from: "bot", reply_text: `Tengo la intención (“${actionKey}”), pero aún no tengo handler para esta acción.` },
      ]);
    } catch (err) {
      console.error("[RaynaHub] Handler error:", err);
      setMessages((m) => [
        ...m,
        { from: "bot", reply_text: "Ups, algo ha fallado al ejecutar la acción. Intenta de nuevo." },
      ]);
    }
  }

  // —— trimitere mesaje
  const send = async () => {
    const userText = text.trim();
    if (!userText) return;

    setMessages((m) => [...m, { from: "user", text: userText }]);
    setText("");

    // 0) confirmarea la "¿Quieres ver tu perfil?"
    if (awaiting === "confirm_view_profile") {
      const n = normalize(userText);
      setAwaiting(null);

      const YES = ["si","sí","da","yes","ok","vale","hai","sure","claro","correcto"];
      const NO  = ["no","nop","nu","nope"];

      if (YES.includes(n)) {
        setMessages((m) => [
          ...m,
          { from: "bot", reply_text: "Perfecto, aquí lo tienes:" },
          {
            from: "bot",
            reply_text: "Pulsa el botón para abrir tu perfil.",
            render: () => (
              <div className={styles.card}>
                <div className={styles.cardTitle}>Perfil</div>
                <div className={styles.cardActions}>
                  <a className={styles.actionBtn} data-variant="primary" href="/mi-perfil">
                    Ver perfil
                  </a>
                </div>
              </div>
            ),
          },
        ]);
        return;
      }

      if (NO.includes(n)) {
        setMessages((m) => [...m, { from: "bot", reply_text: "¡Entendido! ¿En qué más te puedo ayudar?" }]);
        return;
      }

      // răspuns ambiguu -> mai întrebăm o dată
      setAwaiting("confirm_view_profile");
      setMessages((m) => [...m, { from: "bot", reply_text: "¿Sí o no?" }]);
      return;
    }

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
    const { intent, slots, lang } = detectIntent(userText, intentsData);
    console.debug("[RaynaHub] detectIntent →", { intent, slots, lang });

    if (!intent || !intent.type) {
      setMessages((m) => [...m, { from: "bot", reply_text: "No te he entendido." }]);
      return;
    }

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
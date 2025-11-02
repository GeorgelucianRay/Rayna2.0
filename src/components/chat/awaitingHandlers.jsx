// src/components/chat/awaitingHandlers.jsx
import { normalize } from "../../nlu";
import { supabase } from "../../supabaseClient";
import { handleDialog } from "./actions";
import {
  handleProfileWizardStart,
  handleProfileWizardStep,
  handleParkingRecomputeByTime,
  parseTimeToMinutes,
} from "./actions";
import { parseSizeFromAnswer, runDepotListFromCtx, clearDepotCtx } from "./actions/handleDepotList.jsx";

// 🔗 Integrare wizard GPS
import { handleAwaitingGpsWizard } from "./ui/handleAwaiting.jsx";

export async function handleAwaiting({
  awaiting,
  setAwaiting,
  userText,
  profile,
  role,
  setMessages,
  setSaving,
  saving,
  intentsData,
  parkingCtx,
  setParkingCtx,
}) {
  if (!awaiting) return false;

  // 🧭 Wizard pentru adăugare locație GPS
  const gpsHandled = await handleAwaitingGpsWizard({
    awaiting,
    setAwaiting,
    userText,
    profile,
    role,
    setMessages,
    setSaving,
    saving,
    intentsData,
    parkingCtx,
    setParkingCtx,
  });

  if (gpsHandled) return true;

  /* ──────────────── REPORTARE PROBLEMĂ ──────────────── */
  if (awaiting === "report_error_text") {
    const trimmed = userText.trim();
    if (!trimmed) {
      setMessages((m) => [
        ...m,
        { from: "bot", reply_text: "Necesito que me escribas el problema para poder reportarlo." },
      ]);
      return true;
    }
    try {
      const { error } = await supabase.from("feedback_utilizatori").insert({
        continut: trimmed,
        origen: "chat",
        categoria: "reclamo",
        severidad: "media",
        contexto: { ruta: window.location?.pathname || null },
      });
      if (error) throw error;
      setMessages((m) => [...m, { from: "bot", reply_text: "Gracias. He registrado el reporte." }]);
    } catch (e) {
      console.error("[report_error_text] insert error:", e);
      setMessages((m) => [
        ...m,
        { from: "bot", reply_text: "Lo siento, no he podido registrar el reporte ahora mismo." },
      ]);
    } finally {
      setAwaiting(null);
    }
    return true;
  }

  /* ──────────────── CONFIRMĂ VEDERE PROFIL ──────────────── */
  if (awaiting === "confirm_view_profile") {
    const n = normalize(userText);
    setAwaiting(null);
    const YES = ["si", "sí", "da", "yes", "ok", "vale", "claro", "correcto"];
    const NO = ["no", "nop", "nu", "nope"];

    if (YES.includes(n)) {
      setMessages((m) => [
        ...m,
        {
          from: "bot",
          reply_text: "Perfecto, aquí lo tienes:",
          render: () => (
            <div className="card">
              <div className="cardTitle">Perfil</div>
              <div className="cardActions">
                <a className="actionBtn" href="/mi-perfil">
                  Ver perfil
                </a>
              </div>
            </div>
          ),
        },
      ]);
      return true;
    }
    if (NO.includes(n)) {
      setMessages((m) => [...m, { from: "bot", reply_text: "¡Entendido! ¿En qué más te puedo ayudar?" }]);
      return true;
    }
    setAwaiting("confirm_view_profile");
    setMessages((m) => [...m, { from: "bot", reply_text: "¿Sí o no?" }]);
    return true;
  }

  /* ──────────────── CONFIRMĂ WIZARD PROFIL ──────────────── */
  if (awaiting === "confirm_complete_profile") {
    const n = normalize(userText);
    const YES = ["si", "sí", "da", "yes", "ok", "vale", "claro", "correcto"];
    const NO = ["no", "nop", "nu", "nope"];

    if (YES.includes(n)) {
      setAwaiting(null);
      await handleProfileWizardStart({ setMessages, setAwaiting });
      return true;
    }
    if (NO.includes(n)) {
      setAwaiting(null);
      setMessages((m) => [
        ...m,
        {
          from: "bot",
          reply_text: "¡Entendido! Si cambias de idea, dime «quiero completar mi perfil».",
        },
      ]);
      return true;
    }
    setMessages((m) => [
      ...m,
      { from: "bot", reply_text: "¿Sí o no? (para empezar a completarlo aquí mismo)" },
    ]);
    return true;
  }

  /* ──────────────── PAȘII PF_* (profil wizard) ──────────────── */
  if (awaiting && awaiting.startsWith("pf_")) {
    await handleProfileWizardStep({ awaiting, userText, profile, setMessages, setAwaiting });
    return true;
  }

  /* ──────────────── ANUNȚURI (dialog) ──────────────── */
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
    return true;
  }

  /* ──────────────── PARKING TIME ──────────────── */
  if (awaiting === "parking_time_left") {
    setAwaiting(null);
    const mins = parseTimeToMinutes(userText);
    if (!mins) {
      setMessages((m) => [...m, { from: "bot", reply_text: "No te he entendido. Dime 1:25 o 45 min." }]);
      setAwaiting("parking_time_left");
      return true;
    }
    await handleParkingRecomputeByTime({ parkingCtx, minutes: mins, setMessages, setParkingCtx });
    return true;
  }

  /* ──────────────── DEPOT LIST – PAS INTERACTIV ──────────────── */
  if (awaiting === "depot_list_size") {
    const size = parseSizeFromAnswer(userText);
    if (size === null && !/igual|cualquiera|ninguno/.test(userText.toLowerCase())) {
      setMessages((m) => [...m, { from: "bot", reply_text: "No te he entendido. ¿20 o 40?" }]);
      return true;
    }
    // salvăm alegerea și continuăm
    const ctx = JSON.parse(sessionStorage.getItem("depot_list_ctx") || "{}");
    ctx.size = size;
    ctx.awaiting = null;
    sessionStorage.setItem("depot_list_ctx", JSON.stringify(ctx));
    setAwaiting(null);
    await runDepotListFromCtx({ setMessages });
    return true;
  }

  if (awaiting === "depot_list_excel") {
    const ans = userText.trim().toLowerCase();
    const YES = ["si", "sí", "da", "yes", "ok", "vale", "claro", "correcto"];
    const NO = ["no", "nop", "nu", "nope"];
    if (YES.some((x) => ans.includes(x))) {
      const ctx = JSON.parse(sessionStorage.getItem("depot_list_ctx") || "{}");
      setAwaiting(null);
      await runDepotListFromCtx({ setMessages });
      clearDepotCtx();
      return true;
    } else if (NO.some((x) => ans.includes(x))) {
      setMessages((m) => [...m, { from: "bot", reply_text: "Perfecto. ¿Algo más?" }]);
      setAwaiting(null);
      clearDepotCtx();
      return true;
    } else {
      setMessages((m) => [...m, { from: "bot", reply_text: "¿Sí o no?" }]);
      return true;
    }
  }

  return false;
}
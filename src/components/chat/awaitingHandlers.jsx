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

// ⬇️ Importuri din handleDepotList.jsx — AVEAI lipsă getCtx/saveCtx și altele
import {
  getCtx, saveCtx, clearDepotCtx,              // context interactiv depot
  qContenedores, qProgramados, qRotos,          // interogări SQL
  TableList,                                    // UI pentru listă + Excel
  parseSizeFromAnswer,                           // parse dimensiune (20/40/40HC)
  parseNavieraFromAnswer,                        // parse naviera din răspuns
  // (compatibilitate cu vechiul tău flux)
  runDepotListFromCtx
} from "./actions/handleDepotList.jsx";

// 🔗 Wizard GPS (al tău existent)
import { handleAwaitingGpsWizard } from "./ui/handleAwaiting.jsx";
import { handleAwaitingPickForLoad, handlePickConfirm } from "./actions/handlePickContainerForLoad.jsx";

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

  // 🧭 Wizard pentru adăugare locație GPS (al tău)
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

// ───────── PICK FOR LOAD: colectare filtre + feedback (size/naviera/feedback)
if (
  awaiting === "pick_load_filters" ||
  awaiting === "pick_load_naviera" ||
  awaiting === "pick_load_feedback"
) {
  const handled = await handleAwaitingPickForLoad({
    awaiting,
    userText,
    setMessages,
    setAwaiting,
  });
  return handled;
}


  // ───────── PICK FOR LOAD: confirmare / „¿por qué?” / alternativă #2 / terminare
  if (awaiting === "pick_load_confirm") {
    const handled = handlePickConfirm({
      userText,
      setMessages,
      setAwaiting,
    });
    return handled; // true dacă a consumat mesajul
  }

  /* ───────────────── REPORTARE PROBLEMĂ ───────────────── */
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

  /* ───────────────── CONFIRMĂ VEDERE PROFIL ───────────────── */
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
                <a className="actionBtn" href="/mi-perfil">Ver perfil</a>
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

  /* ───────────────── CONFIRMĂ WIZARD PROFIL ───────────────── */
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
        { from: "bot", reply_text: "¡Entendido! Si cambias de idea, dime «quiero completar mi perfil»." },
      ]);
      return true;
    }
    setMessages((m) => [
      ...m,
      { from: "bot", reply_text: "¿Sí o no? (para empezar a completarlo aquí mismo)" },
    ]);
    return true;
  }

  /* ───────────────── PAȘII PF_* (profil wizard) ───────────────── */
  if (awaiting && awaiting.startsWith("pf_")) {
    await handleProfileWizardStep({ awaiting, userText, profile, setMessages, setAwaiting });
    return true;
  }

  /* ───────────────── ANUNȚURI (dialog) ───────────────── */
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

  /* ───────────────── PARKING TIME ───────────────── */
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

  /* ───────────────── DEPOT (flux NOU interactiv) ───────────────── */

  // Pas 1: cerem explicit ESTADO (vacíos/llenos/rotos/programados)
  if (awaiting === "depot_ask_estado") {
    const t = (userText || "").toLowerCase();
    let estado = null;
    if (/\bvacio|vacío|vacios|vacia/.test(t)) estado = "vacio";
    else if (/\blleno|llenos|llena/.test(t))  estado = "lleno";
    else if (/\broto|rotos|rota|defect/.test(t)) estado = "roto";
    else if (/programad/.test(t)) estado = "programado";

    if (!estado) {
      setMessages((m) => [
        ...m,
        { from: "bot", reply_text: "No te he entendido. ¿Vacíos, llenos, rotos o programados?" },
      ]);
      return true;
    }

    const ctx = getCtx();
    saveCtx({ lastQuery: { ...(ctx.lastQuery || {}), estado } });

    setMessages((m) => [
      ...m,
      { from: "bot",
        reply_text: "Perfecto. ¿Alguna preferencia de tamaño (20/40/40HC) o naviera? (puedes decir «sin preferencia»)" }
    ]);
    setAwaiting("depot_ask_filtros");
    saveCtx({ awaiting: "depot_ask_filtros" });
    return true;
  }

  // Pas 2: colectăm TAMAÑO și/sau NAVIERA; apoi interogăm și afișăm
  if (awaiting === "depot_ask_filtros") {
    const size = parseSizeFromAnswer(userText);
    const nav  = parseNavieraFromAnswer(userText); // null=fără preferință; string=naviera; undefined=nu am înțeles
    const ctx  = getCtx();
    const prev = ctx.lastQuery || {};

    const next = {
      estado: prev.estado ?? null,
      size:   (size === undefined) ? prev.size ?? null : size,
      naviera:(nav  === undefined) ? prev.naviera ?? null : nav,
    };
    saveCtx({ lastQuery: next });

    if (size === undefined && nav === undefined) {
      setMessages((m) => [
        ...m,
        { from: "bot", reply_text: "¿Tamaño (20/40/40HC) o naviera? Si no, di «sin preferencia» y te doy todos." },
      ]);
      return true;
    }

    setAwaiting(null);
    saveCtx({ awaiting: null });

    try {
      let rows = [];
      if (next.estado === "programado") rows = await qProgramados({ size: next.size, naviera: next.naviera });
      else if (next.estado === "roto")  rows = await qRotos({ size: next.size, naviera: next.naviera });
      else                              rows = await qContenedores({ estado: next.estado, size: next.size, naviera: next.naviera });

      const subtitle = [
        next.estado || "todos",
        next.size || "all-sizes",
        next.naviera || "todas navieras",
        new Date().toLocaleDateString()
      ].join(" · ");

      if (!rows.length) {
        setMessages((m) => [...m, { from: "bot", reply_text: `No hay resultados para: ${subtitle}.` }]);
        return true;
      }

      const excelTitle =
        `Lista contenedores – ${next.estado || "todos"} – ${next.size || "all"} – ${next.naviera || "todas"} – ${new Date().toLocaleDateString()}`;
      saveCtx({ _lastRows: rows, _excelTitle: excelTitle });

      setMessages((m) => [
        ...m,
        {
          from: "bot",
          reply_text: "Vale, aquí tienes la lista.",
          render: () => <TableList rows={rows} subtitle={subtitle} excelTitle={excelTitle} />,
        },
        { from: "bot", reply_text: "¿Quieres que te lo dé en Excel? (sí/no)" },
      ]);

      // dacă vrei să captezi simplu „sí/no”, activează awaiting-ul:
      setAwaiting("depot_list_excel");
      saveCtx({ awaiting: "depot_list_excel" });

    } catch (e) {
      console.error("[depot list] query error:", e);
      setMessages((m) => [...m, { from: "bot", reply_text: "No he podido leer la lista ahora." }]);
    }
    return true;
  }

  /* ───────────────── DEPOT (flux VECHE compatibil) ───────────────── */
  // Dacă mai folosești încă vechiul pas „depot_list_size”, îl păstrăm:
  if (awaiting === "depot_list_size") {
    const size = parseSizeFromAnswer(userText);
    if (size === null && !/igual|cualquiera|ninguno/.test(userText.toLowerCase())) {
      setMessages((m) => [...m, { from: "bot", reply_text: "No te he entendido. ¿20 o 40?" }]);
      return true;
    }
    const ctx = getCtx();
    ctx.size = size;
    ctx.awaiting = null;
    saveCtx(ctx);
    setAwaiting(null);
    await runDepotListFromCtx({ setMessages });
    return true;
  }

  if (awaiting === "depot_list_excel") {
    const ans = userText.trim().toLowerCase();
    const YES = ["si", "sí", "da", "yes", "ok", "vale", "claro", "correcto"];
    const NO = ["no", "nop", "nu", "nope"];

    if (YES.some((x) => ans.includes(x))) {
      // în UI ai butonul „Descargar Excel” care folosește _lastRows din ctx;
      // aici doar confirmăm fluxul.
      setMessages((m) => [...m, { from: "bot", reply_text: "Perfecto. Pulsa el botón para descargar." }]);
      setAwaiting(null);
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
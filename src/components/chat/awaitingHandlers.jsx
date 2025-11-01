// src/components/chat/awaitingHandlers.js
import { normalize } from "../../nlu";
import { supabase } from "../../supabaseClient";
import { handleDialog } from "./actions";
import { handleProfileWizardStart, handleProfileWizardStep, handleParkingRecomputeByTime, parseTimeToMinutes } from "./actions";

export async function handleAwaiting({
  awaiting, setAwaiting,
  userText, profile, role,
  setMessages, setSaving, saving,
  intentsData,
  parkingCtx, setParkingCtx,
}) {
  if (!awaiting) return false;

  // 0.a) raportare
  if (awaiting === "report_error_text") {
    const trimmed = userText.trim();
    if (!trimmed) {
      setMessages(m => [...m, { from:"bot", reply_text:"Necesito que me escribas el problema para poder reportarlo." }]);
      return true;
    }
    try {
      const { error } = await supabase
        .from('feedback_utilizatori')
        .insert({
          continut: trimmed,
          origen: 'chat',
          categoria: 'reclamo',
          severidad: 'media',
          contexto: { ruta: window.location?.pathname || null }
        });
      if (error) throw error;
      setMessages(m => [...m, { from:"bot", reply_text:"Gracias. He registrado el reporte. Me encargo de revisarlo." }]);
    } catch (e) {
      console.error("[report_error_text] insert error:", e);
      setMessages(m => [...m, { from:"bot", reply_text:"Lo siento, no he podido registrar el reporte ahora mismo." }]);
    } finally {
      setAwaiting(null);
    }
    return true;
  }

  // 0.b) confirm view profile
  if (awaiting === "confirm_view_profile") {
    const n = normalize(userText);
    setAwaiting(null);
    const YES = ["si","sí","da","yes","ok","vale","hai","sure","claro","correcto"];
    const NO  = ["no","nop","nu","nope"];

    if (YES.includes(n)) {
      setMessages(m => [
        ...m,
        { from:"bot", reply_text:"Perfecto, aquí lo tienes:" },
        {
          from:"bot",
          reply_text:"Pulsa el botón para abrir tu perfil.",
          render: () => (
            <div className="card">
              <div className="cardTitle">Perfil</div>
              <div className="cardActions">
                <a className="actionBtn" data-variant="primary" href="/mi-perfil">Ver perfil</a>
              </div>
            </div>
          ),
        },
      ]);
      return true;
    }
    if (NO.includes(n)) {
      setMessages(m => [...m, { from:"bot", reply_text:"¡Entendido! ¿En qué más te puedo ayudar?" }]);
      return true;
    }
    setAwaiting("confirm_view_profile");
    setMessages(m => [...m, { from:"bot", reply_text:"¿Sí o no?" }]);
    return true;
  }

  // 0.c) confirm wizard profil
  if (awaiting === "confirm_complete_profile") {
    const n = normalize(userText);
    const YES = ["si","sí","da","yes","ok","vale","hai","sure","claro","correcto"];
    const NO  = ["no","nop","nu","nope"];

    if (YES.includes(n)) {
      setAwaiting(null);
      await handleProfileWizardStart({ setMessages, setAwaiting });
      return true;
    }
    if (NO.includes(n)) {
      setAwaiting(null);
      setMessages(m => [...m, { from:"bot", reply_text:"¡Entendido! Si cambias de idea, dime «quiero completar mi perfil»." }]);
      return true;
    }
    setMessages(m => [...m, { from:"bot", reply_text:"¿Sí o no? (para empezar a completarlo aquí mismo)" }]);
    return true;
  }

  // 0.d) pașii „pf_*”
  if (awaiting && awaiting.startsWith("pf_")) {
    await handleProfileWizardStep({ awaiting, userText, profile, setMessages, setAwaiting });
    return true;
  }

  // 1) dialog „anuncio”
  if (awaiting === "anuncio_text") {
    await handleDialog.stepAnuncio({
      userText, role, setMessages, setAwaiting, saving, setSaving, intentsData,
    });
    return true;
  }

  // 2) parking time
  if (awaiting === "parking_time_left") {
    setAwaiting(null);
    const mins = parseTimeToMinutes(userText);
    if (!mins) {
      setMessages(m => [...m, { from:"bot", reply_text:"No te he entendido. Dime 1:25 o 45 min." }]);
      setAwaiting("parking_time_left");
      return true;
    }
    await handleParkingRecomputeByTime({ parkingCtx, minutes: mins, setMessages, setParkingCtx });
    return true;
  }

  return false;
}

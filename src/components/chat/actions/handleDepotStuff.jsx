// src/components/chat/actions/handleDepotChat.js
import { supabase } from "../../../supabaseClient";
import styles from "../Chatbot.module.css";
import { showContainerCard } from "./uiHelpers"; // ai zis că există

// helper: push bot
function pushBot(setMessages, text) {
  setMessages((m) => [...m, { from: "bot", reply_text: text }]);
}

// ISO 6346: 4 litere + 7 cifre (accept și 6-7 pentru toleranță)
const CONT_REGEX = /([A-Z]{4}\d{6,7})/i;

export default async function handleDepotChat({ user, userText, setMessages }) {
  const lowerMsg = (userText || "").toLowerCase();
  const m = String(userText || "").match(CONT_REGEX);
  const containerCode = m ? m[1].toUpperCase() : null;

  // 1) validare cod
  if (!containerCode) {
    pushBot(setMessages, "No he encontrado ningún número de contenedor en tu mensaje.");
    return;
  }

  // 2) rol
  const role = (user?.role || "").toLowerCase();
  if (role === "sofer" || role === "șofer" || role === "şofer" || role === "driver") {
    pushBot(setMessages, "Lo siento, no tienes acceso al Depot. ¿Quieres que te ayude en algo más?");
    return;
  }

  // 3) căutare în tabele (în ordinea ta)
  const tables = [
    "contenedores",
    "contenedores_rotos",
    "contenedores_programados",
    "contenedores_salidos",
  ];

  let container = null;
  let origen = null;

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("num_contenedor", containerCode)
      .maybeSingle();

    if (error) {
      // nu blocăm fluxul; dar anunțăm
      console.warn("[Depot] error select", table, error);
    }

    if (data) {
      container = data;
      origen = table;
      break;
    }
  }

  if (!container) {
    pushBot(setMessages, `No he encontrado el contenedor **${containerCode}** en el depósito.`);
    return;
  }

  // 4) răspuns de bază
  const position =
    container.posicion ||
    container.posicio ||
    container.position ||
    "—";

  pushBot(setMessages, `El contenedor **${containerCode}** está en la posición **${position}**.`);

  // 5) „detalii” — dacă userul a cerut
  if (lowerMsg.includes("detalle") || lowerMsg.includes("detalles") || lowerMsg.includes("detall")) {
    pushBot(setMessages, `Claro, aquí tienes todos los datos del contenedor **${containerCode}** 👇`);
    try {
      await showContainerCard(container); // card-ul tău existent
    } catch (e) {
      console.warn("[Depot] showContainerCard error:", e);
    }
  }

  // 6) mesaj dinamic în funcție de rol/stare
  if (role === "mecanic" || role === "mecánico" || role === "mechanic") {
    if (origen === "contenedores_programados") {
      pushBot(setMessages, "Este contenedor está **programado**. ¿Quieres marcarlo como **Hecho**?");
    } else {
      pushBot(setMessages, "Si quieres le cambiamos el sitio.");
    }
  }

  if (role === "dispecer" || role === "dispatcher" || role === "admin") {
    if (origen === "contenedores_programados") {
      pushBot(setMessages, "Este contenedor está **programado**. ¿Quieres marcarlo como **Hecho** o cambiar su posición?");
    } else {
      pushBot(setMessages, "Si quieres, lo podemos **programar**, **cambiar posición** o **sacarlo del Depot**. Dime qué necesitas.");
    }
  }
}
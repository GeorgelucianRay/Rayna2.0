// src/components/chat/actions/handleDepotChat.js
import { supabase } from "../../../supabaseClient";

/** Extrage codul ISO al containerului (4 litere + 7 cifre),
 *  tolerând spații, liniuțe, punctuație, newline, etc. */
export function extractContainerCode(input = "") {
  const up = String(input).toUpperCase();
  // eliminăm tot ce nu e literă/cifră în spații, ca să putem potrivi "HLBU 219 6392", "HLBU-2196392", etc.
  const cleaned = up.replace(/[^A-Z0-9]+/g, " ").trim();
  // potrivim 4 litere + 7 cifre, permițând spații între ele
  const m = cleaned.match(/(?:^|\s)([A-Z]{4})\s*([0-9]{7})(?:\s|$)/);
  return m ? m[1] + m[2] : null;
}

export default async function handleDepotChat({ userText, profile, setMessages }) {
  const containerCode = extractContainerCode(userText);

  if (!containerCode) {
    setMessages(m => [
      ...m,
      { from: "bot", reply_text: "Necesito el número del contenedor (ej.: **HLBU1234567**)." }
    ]);
    return;
  }

  // verificăm rol
  const role = (profile?.role || "").toLowerCase();
  if (role === "sofer" || role === "șofer" || role === "driver") {
    setMessages(m => [
      ...m,
      { from: "bot", reply_text: "Lo siento, no tienes acceso al Depot. ¿Te ayudo con otra cosa?" }
    ]);
    return;
  }

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

    if (data && !error) { container = data; origen = table; break; }
  }

  if (!container) {
    setMessages(m => [
      ...m,
      { from: "bot", reply_text: `No he encontrado el contenedor **${containerCode}** en el depósito.` }
    ]);
    return;
  }

  const position = container.posicion || container.posicio || "—";
  let reply = `El contenedor **${containerCode}** está en la posición **${position}**.`;

  if (origen === "contenedores_programados") {
    if (role === "mecanic" || role === "mecánico") {
      reply += `\n\nEstá **programado**. ¿Quieres marcarlo como **Hecho**?`;
    } else {
      reply += `\n\nEstá **programado**. ¿Lo marcamos **Hecho** o cambiamos posición?`;
    }
  } else if (role === "dispecer" || role === "dispatcher" || role === "admin") {
    reply += `\n\nPuedo **programarlo**, **cambiar posición** o **sacarlo del Depot**.`;
  }

  setMessages(m => [...m, { from: "bot", reply_text: reply }]);
}
// src/components/chat/actions/handleDepotChat.js
import { supabase } from "../../../supabaseClient";

export default async function handleDepotChat({ userText, profile, setMessages }) {
  const lowerMsg = String(userText || "").toLowerCase();

  // cod container (4 litere + 6-7 cifre)
  const m = lowerMsg.match(/([a-z]{4}\d{6,7})/i);
  const containerCode = m ? m[1].toUpperCase() : null;

  if (!containerCode) {
    setMessages((mm) => [...mm, { from: "bot", reply_text: "Necesito el número del contenedor (ej.: HLBU1234567)." }]);
    return;
  }

  const role = (profile?.role || "").toLowerCase();
  if (role === "sofer" || role === "șofer" || role === "sofér" || role === "driver") {
    setMessages((mm) => [...mm, { from: "bot", reply_text: "No tienes acceso al Depot. ¿Algo más?" }]);
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
    const { data } = await supabase
      .from(table)
      .select("*")
      .eq("num_contenedor", containerCode)
      .maybeSingle();
    if (data) { container = data; origen = table; break; }
  }

  if (!container) {
    setMessages((mm) => [...mm, { from: "bot", reply_text: `No he encontrado el contenedor **${containerCode}** en el depósito.` }]);
    return;
  }

  const pos = container.posicion || "—";
  let reply = `El contenedor **${containerCode}** está en la posición **${pos}**.`;

  if (origen === "contenedores_programados") {
    reply += "\n\nEstá **programado**. ¿Lo marcamos como *Hecho* o cambiamos posición?";
  } else {
    reply += "\n\nPuedo **programarlo**, **cambiar posición** o **sacarlo del Depot**.";
  }

  setMessages((mm) => [...mm, { from: "bot", reply_text: reply }]);
}
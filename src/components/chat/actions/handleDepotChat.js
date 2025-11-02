import React from "react";
import styles from "../Chatbot.module.css";
import { supabase } from "../../../supabaseClient";

export default async function handleDepotChat({ userText, profile, setMessages }) {
  const msg = String(userText || "");
  const lowerMsg = msg.toLowerCase();

  // 1) extrage cod container (4 litere + 6-7 cifre)
  const contRegex = /([A-Z]{4}\d{6,7})/i;
  const match = msg.match(contRegex);
  const containerCode = match ? match[1].toUpperCase() : null;

  if (!containerCode) {
    setMessages(m => [
      ...m,
      { from: "user", text: userText },
      { from: "bot", reply_text: "No he encontrado ningún número de contenedor en tu mensaje." }
    ]);
    return;
  }

  // 2) rol – șoferii nu au acces
  const role = (profile?.role || "").toLowerCase();
  if (role === "sofer" || role === "șofer" || role === "driver") {
    setMessages(m => [
      ...m,
      { from: "bot", reply_text: "Lo siento, no tienes acceso al Depot. ¿Quieres que te ayude en algo más?" }
    ]);
    return;
  }

  // 3) caută în tabele
  const tables = [
    "contenedores",
    "contenedores_rotos",
    "contenedores_programados",
    "contenedores_salidos",
  ];

  let found = null;
  let origen = null;

  for (const t of tables) {
    const { data, error } = await supabase
      .from(t)
      .select("*")
      .eq("num_contenedor", containerCode)
      .maybeSingle();

    if (data && !error) {
      found = data;
      origen = t;
      break;
    }
  }

  if (!found) {
    setMessages(m => [
      ...m,
      { from: "bot", reply_text: `No he encontrado el contenedor ${containerCode} en el depósito.` }
    ]);
    return;
  }

  // 4) răspuns de bază
  const pos = found.posicion || "—";
  const base = `El contenedor **${containerCode}** está en la posición **${pos}**.`;

  const wantsDetails =
    lowerMsg.includes("detalle") || lowerMsg.includes("detalles") || lowerMsg.includes("detall");

  if (!wantsDetails) {
    setMessages(m => [...m, { from: "bot", reply_text: base }]);
    return;
  }

  // 5) card detalii — FĂRĂ JSX (folosim React.createElement)
  setMessages(m => [
    ...m,
    { from: "bot", reply_text: "Claro, aquí tienes los detalles:" },
    {
      from: "bot",
      reply_text: "",
      render: () => {
        const pre = React.createElement(
          "pre",
          { style: { margin: 0 } },
          JSON.stringify(found, null, 2)
        );

        const box = React.createElement(
          "div",
          {
            style: {
              marginTop: 10,
              borderRadius: 12,
              border: "1px solid #eee",
              background: "#fafafa",
              padding: 10,
              overflowX: "auto",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: 12,
              lineHeight: 1.4
            }
          },
          pre
        );

        const title = React.createElement(
          "div",
          { className: styles.cardTitle },
          `Contenedor ${containerCode}`
        );
        const subtitle = React.createElement(
          "div",
          { className: styles.cardSubtitle },
          `Origen: ${origen}`
        );

        return React.createElement(
          "div",
          { className: styles.card, style: { padding: 12 } },
          title,
          subtitle,
          box
        );
      }
    }
  ]);
}
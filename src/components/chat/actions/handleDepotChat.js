// src/components/chat/actions/handleDepotChat.js
import { supabase } from "../../../supabaseClient";

/**
 * Handler DEPOT (dispecer/admin/mecanic) – caută un container după cod (ex: MSCU1234567)
 * Se apelează din dispatch pe acțiunea "depot_lookup".
 */
export default async function handleDepotChat({ userText, profile, setMessages }) {
  const msg = String(userText || "").trim();
  const lowerMsg = msg.toLowerCase();

  // 1) Extrage codul containerului: 4 litere + 6-7 cifre (ex. MSCU1234567)
  const contRegex = /([A-Z]{4}\d{6,7})/i;
  const match = msg.match(contRegex);
  const containerCode = match ? match[1].toUpperCase() : null;

  if (!containerCode) {
    setMessages(m => [...m, { from: "bot", reply_text: "No he encontrado ningún número de contenedor en tu mensaje." }]);
    return;
  }

  // 2) Verifică rolul (șoferii nu au acces)
  const roleRaw = profile?.role || "unknown";
  const role = String(roleRaw).toLowerCase();
  if (role === "sofer" || role === "șofer" || role === "şofer" || role === "driver") {
    setMessages(m => [...m, { from: "bot", reply_text: "Lo siento, no tienes acceso al Depot. ¿Quieres que te ayude en algo más?" }]);
    return;
  }

  // 3) Caută în toate tabelele tale
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

    if (!error && data) {
      container = data;
      origen = table;
      break;
    }
  }

  if (!container) {
    setMessages(m => [...m, { from: "bot", reply_text: `No he encontrado el contenedor **${containerCode}** en el depósito.` }]);
    return;
  }

  // 4) Răspuns de bază
  const position = container.posicion || container.posicio || container.position || "—";
  let base = `El contenedor **${containerCode}** está en la posición **${position}**.`;

  // 5) Dacă userul cere detalii, adăugăm card
  const wantsDetails =
    lowerMsg.includes("detalle") ||
    lowerMsg.includes("detall") ||
    lowerMsg.includes("ficha") ||
    lowerMsg.includes("info") ||
    lowerMsg.includes("informa");

  const lines = [];
  const fields = [
    ["Estado", container.estado || container.state],
    ["Tipo", container.tipo || container.type],
    ["Peso", container.peso || container.weight],
    ["Cliente", container.cliente || container.client],
    ["Observaciones", container.observaciones || container.obs],
    ["Última actualización", container.updated_at],
  ];
  for (const [label, val] of fields) {
    if (val != null && String(val).trim() !== "") {
      lines.push(`• ${label}: **${val}**`);
    }
  }

  const originTxt = origen ? `\n(Registro en **${origen}**)` : "";

  if (!wantsDetails) {
    // mesaj scurt
    setMessages(m => [...m, { from: "bot", reply_text: base + originTxt }]);
  } else {
    // mesaj extins + card
    setMessages(m => [
      ...m,
      { from: "bot", reply_text: `Claro, aquí tienes todos los datos del contenedor **${containerCode}** 👇` },
      {
        from: "bot",
        reply_text: "",
        render: () => (
          <div style={{
            borderRadius: 12,
            border: "1px solid #eee",
            padding: 12,
            background: "#fff",
            boxShadow: "0 4px 14px rgba(0,0,0,0.06)"
          }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Contenedor {containerCode}</div>
            <div style={{ margin: "6px 0" }}>
              <div><strong>Posición:</strong> {position}</div>
              {lines.length ? (
                <div style={{ marginTop: 8, whiteSpace: "pre-wrap", lineHeight: 1.35 }}>
                  {lines.join("\n")}
                </div>
              ) : null}
              {origen ? <div style={{ marginTop: 8, color: "#666" }}>Origen de datos: {origen}</div> : null}
            </div>
          </div>
        )
      }
    ]);
  }

  // 6) Mesaje dinamice după rol & origine
  if (role === "mecanic") {
    if (origen === "contenedores_programados") {
      setMessages(m => [...m, { from: "bot", reply_text: "Este contenedor está programado, ¿quieres marcarlo como **Hecho**?" }]);
    } else {
      setMessages(m => [...m, { from: "bot", reply_text: "Si quieres le cambiamos el sitio." }]);
    }
  }

  if (role === "dispecer" || role === "dispatcher" || role === "admin") {
    if (origen === "contenedores_programados") {
      setMessages(m => [...m, { from: "bot", reply_text: "Está **programado**. ¿Marcamos como **Hecho** o cambiamos la posición?" }]);
    } else {
      setMessages(m => [...m, { from: "bot", reply_text: "Puedo **programarlo**, **cambiar posición** o **sacarlo del Depot**. Dime qué necesitas." }]);
    }
  }
}
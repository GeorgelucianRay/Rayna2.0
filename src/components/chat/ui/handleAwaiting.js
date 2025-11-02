// Helpers pentru GPS Add Wizard
const gpsCtxKey = "gpsAddCtx";

function getGpsAddCtx() {
  try {
    return JSON.parse(localStorage.getItem(gpsCtxKey) || "{}");
  } catch {
    return {};
  }
}

function saveGpsAddCtx(data) {
  localStorage.setItem(gpsCtxKey, JSON.stringify(data || {}));
}

// ——— 𝙂𝙋𝙎 𝘼𝙙𝙙 𝙒𝙞𝙯𝙖𝙧𝙙 ———
if (awaiting?.startsWith("gps_add_")) {
  const ctx = getGpsAddCtx();
  const n = normalize(userText);
  const YES = ["si","sí","da","yes","ok","vale","claro"];
  const NO = ["no","nop","nu","nope"];

  const next = {...ctx}; // începem cu contextul curent

  if (awaiting === "gps_add_type") {
    next.tipo = userText;
    saveGpsAddCtx(next);
    setAwaiting("gps_add_name");
    setMessages(m => [...m, { from:"bot", reply_text:"Perfecto. ¿Qué nombre tiene esta ubicación?" }]);
    return true;
  }

  if (awaiting === "gps_add_name") {
    next.nombre = userText;
    saveGpsAddCtx(next);
    setAwaiting("gps_add_address");
    setMessages(m => [...m, { from:"bot", reply_text:"Genial. ¿Sabes la dirección?" }]);
    return true;
  }

  if (awaiting === "gps_add_address") {
    if (n.includes("no") && !userText.includes(",")) {
      next.direccion = null;
    } else {
      next.direccion = userText;
    }
    saveGpsAddCtx(next);
    setAwaiting("gps_add_coords");
    setMessages(m => [...m, {
      from: "bot",
      reply_text: "¿Tienes coordenadas, un link de Google Maps o quieres usar tu ubicación?",
      render: () => (
        <div className="card" style={{ marginTop: 8 }}>
          <div className="cardActions">
            <button className="actionBtn" onClick={() => {
              const pos = navigator.geolocation;
              if (!pos) return alert("Geolocalización no disponible.");
              pos.getCurrentPosition(({ coords }) => {
                const c = `${coords.latitude},${coords.longitude}`;
                const u = getGpsAddCtx();
                u.coordenadas = c;
                u.link_maps = `https://maps.google.com/?q=${c}`;
                saveGpsAddCtx(u);
                setAwaiting("gps_add_photo");
                setMessages(mm => [...mm, { from:"me", text:c }, { from:"bot", reply_text:"Ubicación recibida. ¿Tienes una foto del lugar?" }]);
              }, () => alert("No se pudo obtener ubicación."));
            }}>Usar mi ubicación</button>
          </div>
        </div>
      )
    }]);
    return true;
  }

  if (awaiting === "gps_add_coords") {
    if (userText.includes("http")) {
      next.link_maps = userText;
    } else {
      next.coordenadas = userText;
      next.link_maps = `https://maps.google.com/?q=${userText}`;
    }
    saveGpsAddCtx(next);
    setAwaiting("gps_add_photo");
    setMessages(m => [...m, { from:"bot", reply_text:"Gracias. ¿Tienes una foto del lugar?" }]);
    return true;
  }

  if (awaiting === "gps_add_photo") {
    if (userText.toLowerCase().includes("no")) {
      next.link_foto = null;
    } else if (userText.startsWith("http")) {
      next.link_foto = userText;
    } else {
      // aici poți integra componenta PhotoUploadInline dacă e într-un render
    }
    saveGpsAddCtx(next);
    setAwaiting("gps_add_confirm");

    const summary = [
      `🟩 Tipo: ${next.tipo}`,
      `📍 Nombre: ${next.nombre}`,
      `🏠 Dirección: ${next.direccion || "-"}`,
      `🌍 Coordenadas: ${next.coordenadas || "-"}`,
      `🗺️ Link Maps: ${next.link_maps || "-"}`,
      `🖼️ Foto: ${next.link_foto ? "Sí" : "No"}`
    ].join("\n");

    setMessages(m => [...m, {
      from: "bot",
      reply_text: `Perfecto. Este es el resumen:\n\n${summary}\n\n¿Quieres guardarlo?`,
      render: () => (
        <div className="card" style={{ marginTop: 8 }}>
          <div className="cardActions">
            <button className="actionBtn" onClick={async () => {
              const payload = {...next};
              const tableMap = {
                "cliente": "gps_clientes",
                "terminal": "gps_terminale",
                "servicio": "gps_servicios",
                "parking": "gps_parkings",
              };
              const table = tableMap[next.tipo?.toLowerCase()];
              if (!table) {
                setMessages(mm => [...mm, { from:"bot", reply_text:"Error: tipo inválido." }]);
                return;
              }
              const { error } = await supabase.from(table).insert([payload]);
              if (error) {
                setMessages(mm => [...mm, { from:"bot", reply_text:"Error al guardar: " + error.message }]);
              } else {
                setMessages(mm => [...mm, { from:"bot", reply_text:"¡Ubicación guardada con éxito!" }]);
              }
              localStorage.removeItem(gpsCtxKey);
              setAwaiting(null);
            }}>Guardar</button>
            <button className="actionBtn" onClick={() => {
              setMessages(m => [...m, { from:"bot", reply_text:"He cancelado la operación." }]);
              setAwaiting(null);
              localStorage.removeItem(gpsCtxKey);
            }}>Cancelar</button>
          </div>
        </div>
      )
    }]);
    return true;
  }

  return false;
}

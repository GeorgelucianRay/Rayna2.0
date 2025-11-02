import React from "react";
import { supabase } from "../../../supabaseClient";
import GeoCaptureButton from "./GeoCaptureButton.jsx";
import PhotoUploadInline from "./PhotoUploadInline.jsx";

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

export async function handleAwaitingGpsWizard({
  awaiting, userText, setMessages, setAwaiting
}) {
  if (!awaiting?.startsWith("gps_add_")) return false;

  const ctx = getGpsAddCtx();
  const n = userText.trim().toLowerCase();
  const next = { ...ctx };

  if (awaiting === "gps_add_type") {
    const validTypes = ["cliente", "terminal", "servicio", "parking"];
    const tipo = n;
    if (!validTypes.includes(tipo)) {
      setMessages(m => [...m, { from:"bot", reply_text:"Tipo no válido. Por favor dime: cliente, terminal, servicio o parking." }]);
      return true;
    }
    next.tipo = tipo;
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
      from:"bot",
      reply_text:"¿Tienes coordenadas, un link de Google Maps o quieres usar tu ubicación?",
      render: () => (
        <div className="card" style={{ marginTop: 8 }}>
          <div className="cardActions">
            <GeoCaptureButton
              onGotCoords={(coords) => {
                const u = getGpsAddCtx();
                u.coordenadas = coords;
                u.link_maps = `https://maps.google.com/?q=${coords}`;
                saveGpsAddCtx(u);
                setAwaiting("gps_add_photo");
                setMessages(mm => [
                  ...mm,
                  { from:"me", text:coords },
                  { from:"bot", reply_text:"Ubicación recibida. ¿Tienes una foto del lugar?" }
                ]);
              }}
              onError={(msg) => {
                setMessages(mm => [...mm, { from:"bot", reply_text:"Error: " + msg }]);
              }}
            />
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
    setMessages(m => [...m, {
      from: "bot",
      reply_text: "Gracias. ¿Tienes una foto del lugar?",
      render: () => (
        <PhotoUploadInline
          onUploaded={(url) => {
            const updated = getGpsAddCtx();
            updated.link_foto = url;
            saveGpsAddCtx(updated);
            setAwaiting("gps_add_confirm");
            setMessages(mm => [
              ...mm,
              { from: "me", text: url },
              { from: "bot", reply_text: "Foto subida. ¿Quieres guardarlo?" }
            ]);
          }}
        />
      )
    }]);
    return true;
  }

  if (awaiting === "gps_add_photo") {
    if (n.includes("no")) {
      next.link_foto = null;
      saveGpsAddCtx(next);
      setAwaiting("gps_add_confirm");
      return true;
    }

    setMessages(m => [...m, {
      from: "bot",
      reply_text: "Puedes subir una foto o decir «no» si no tienes.",
      render: () => (
        <PhotoUploadInline
          onUploaded={(url) => {
            const u = getGpsAddCtx();
            u.link_foto = url;
            saveGpsAddCtx(u);
            setAwaiting("gps_add_confirm");
            setMessages((mm) => [
              ...mm,
              { from: "me", text: url },
              { from: "bot", reply_text: "Foto recibida." },
            ]);
          }}
        />
      )
    }]);

    return true;
  }

  if (awaiting === "gps_add_confirm") {
    const u = getGpsAddCtx();

    const summary = [
      `🟩 Tipo: ${u.tipo}`,
      `📍 Nombre: ${u.nombre}`,
      `🏠 Dirección: ${u.direccion || "-"}`,
      `🌍 Coordenadas: ${u.coordenadas || "-"}`,
      `🗺️ Link Maps: ${u.link_maps || "-"}`,
      `🖼️ Foto: ${u.link_foto ? "Sí" : "No"}`
    ].join("\n");

    setMessages(m => [...m, {
      from: "bot",
      reply_text: `Perfecto. Este es el resumen:\n\n${summary}\n\n¿Quieres guardarlo?`,
      render: () => (
        <div className="card" style={{ marginTop: 8 }}>
          <div className="cardActions">
            <button
              className="actionBtn"
              onClick={async () => {
                const payload = { ...u };
                delete payload.tipo;
                const tableMap = {
                  cliente: "gps_clientes",
                  terminal: "gps_terminale",
                  servicio: "gps_servicios",
                  parking: "gps_parkings",
                };
                const table = tableMap[u.tipo?.toLowerCase()];
                if (!table) {
                  setMessages(mm => [...mm, { from: "bot", reply_text: "Error: tipo inválido." }]);
                  return;
                }
                const { error } = await supabase.from(table).insert([payload]);
                if (error) {
                  setMessages(mm => [...mm, { from: "bot", reply_text: "Error al guardar: " + error.message }]);
                } else {
                  setMessages(mm => [...mm, { from: "bot", reply_text: "¡Ubicación guardada con éxito!" }]);
                }
                localStorage.removeItem(gpsCtxKey);
                setAwaiting(null);
              }}
            >Guardar</button>
            <button
              className="actionBtn"
              onClick={() => {
                setMessages(m => [...m, { from: "bot", reply_text: "He cancelado la operación." }]);
                setAwaiting(null);
                localStorage.removeItem(gpsCtxKey);
              }}
            >Cancelar</button>
          </div>
        </div>
      )
    }]);

    return true;
  }

  return false;
}
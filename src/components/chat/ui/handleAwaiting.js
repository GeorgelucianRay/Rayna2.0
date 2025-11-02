import { supabase } from "../../../supabaseClient";
import PhotoUploadInline from "./PhotoUploadInline.jsx";
import GeoCaptureCard from "./GeoCaptureCard";

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

export async function handleAwaiting({ awaiting, userText, setMessages, setAwaiting }) {
  if (!awaiting?.startsWith("gps_add_")) return false;

  const ctx = getGpsAddCtx();
  const next = { ...ctx };
  const n = userText.toLowerCase().trim();
  const YES = ["si", "sí", "da", "yes", "ok", "vale", "claro"];
  const NO = ["no", "nop", "nu", "nope"];

  if (awaiting === "gps_add_type") {
    const tipo = n;
    const validTypes = ["cliente", "terminal", "servicio", "parking"];
    if (!validTypes.includes(tipo)) {
      setMessages(m => [...m, { from: "bot", reply_text: "Tipo no válido. Por favor dime: cliente, terminal, servicio o parking." }]);
      return true;
    }
    next.tipo = tipo;
    saveGpsAddCtx(next);
    setAwaiting("gps_add_name");
    setMessages(m => [...m, { from: "bot", reply_text: "Perfecto. ¿Qué nombre tiene esta ubicación?" }]);
    return true;
  }

  if (awaiting === "gps_add_name") {
    next.nombre = userText;
    saveGpsAddCtx(next);
    setAwaiting("gps_add_address");
    setMessages(m => [...m, { from: "bot", reply_text: "Genial. ¿Sabes la dirección?" }]);
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
    <GeoCaptureCard onGotCoords={(coords) => {
      const u = getGpsAddCtx();
      u.coordenadas = coords;
      u.link_maps = `https://maps.google.com/?q=${coords}`;
      saveGpsAddCtx(u);
      setAwaiting("gps_add_photo");
      setMessages(mm => [
        ...mm,
        { from: "me", text: coords },
        { from: "bot", reply_text: "Ubicación recibida. ¿Tienes una foto del lugar?" }
      ]);
    }} />
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
    setMessages(m => [...m, { from: "bot", reply_text: "Gracias. ¿Tienes una foto del lugar?" }]);
    return true;
  }

  if (awaiting === "gps_add_photo") {
    setMessages(m => [...m, {
      from: "bot",
      reply_text: "Gracias. ¿Tienes una foto del lugar?",
      render: () => (
        <div className="card" style={{ marginTop: 8 }}>
          <PhotoUploadInline
            onUploaded={(url) => {
              const updated = getGpsAddCtx();
              updated.link_foto = url;
              saveGpsAddCtx(updated);
              setMessages(mm => [...mm, { from: "me", text: "(Foto subida)" }]);
              setAwaiting("gps_add_confirm");
            }}
          />
          <div className="cardActions" style={{ marginTop: 8 }}>
            <button className="actionBtn" onClick={() => {
              const updated = getGpsAddCtx();
              updated.link_foto = null;
              saveGpsAddCtx(updated);
              setMessages(mm => [...mm, { from: "me", text: "No tengo foto" }]);
              setAwaiting("gps_add_confirm");
            }}>
              Saltar
            </button>
          </div>
        </div>
      )
    }]);
    return true;
  }

  if (awaiting === "gps_add_confirm") {
    if (NO.includes(n)) {
      setMessages(m => [...m, { from: "bot", reply_text: "Operación cancelada." }]);
      setAwaiting(null);
      localStorage.removeItem(gpsCtxKey);
      return true;
    }

    const tableMap = {
      cliente: "gps_clientes",
      terminal: "gps_terminale",
      servicio: "gps_servicios",
      parking: "gps_parkings",
    };
    const table = tableMap[next.tipo?.toLowerCase()];
    if (!table) {
      setMessages(m => [...m, { from: "bot", reply_text: "Tipo inválido." }]);
      return true;
    }

    const payload = { ...next };
    delete payload.tipo;

    const { error } = await supabase.from(table).insert([payload]);
    if (error) {
      setMessages(m => [...m, { from: "bot", reply_text: "Error al guardar: " + error.message }]);
    } else {
      setMessages(m => [...m, { from: "bot", reply_text: "¡Ubicación guardada con éxito!" }]);
    }
    localStorage.removeItem(gpsCtxKey);
    setAwaiting(null);
    return true;
  }

  return false;
}
// În fişierul handleAwaiting.js (sau echivalent)  
import { normalize } from "../nlu/lang";  // adaptează ruta dacă e altă cale  
import { supabase } from "../../supabaseClient";  // adaptează ruta  
import PhotoUploadInline from "../ui/PhotoUploadInline";  // adaptează sala  
// ––– Helpers pentru GPS Add Wizard –––  
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

// În funcţia principală handleAwaiting  
if (awaiting?.startsWith("gps_add_")) {  
  const ctx = getGpsAddCtx();  
  const n = normalize(userText);  
  const YES = ["si","sí","da","yes","ok","vale","claro"];  
  const NO  = ["no","nop","nu","nope"];  
  const next = { ...ctx };  

  // —–– Pasul 1: tipul locaţiei —––
  if (awaiting === "gps_add_type") {  
    const tipo = userText.toLowerCase().trim();  
    const validTypes = ["cliente","terminal","servicio","parking"];  
    if (!validTypes.includes(tipo)) {  
      setMessages(m => [...m, { from:"bot", reply_text: "Tipo no válido. Por favor dime: cliente, terminal, servicio o parking." }]);  
      return true;  
    }  
    next.tipo = tipo;  
    saveGpsAddCtx(next);  
    setAwaiting("gps_add_name");  
    setMessages(m => [...m, { from:"bot", reply_text:"Perfecto. ¿Qué nombre tiene esta ubicación?" }]);  
    return true;  
  }

  // —–– Pasul 2: numele locaţiei —––
  if (awaiting === "gps_add_name") {  
    const nombre = userText.trim();  
    if (!nombre) {  
      setMessages(m => [...m, { from:"bot", reply_text:"No has dicho un nombre. ¿Cómo se llama esta ubicación?" }]);  
      return true;  
    }  
    next.nombre = nombre;  
    saveGpsAddCtx(next);  
    setAwaiting("gps_add_address");  
    setMessages(m => [...m, { from:"bot", reply_text:"Genial. ¿Sabes la dirección?" }]);  
    return true;  
  }

  // —–– Pasul 3: adresa —––
  if (awaiting === "gps_add_address") {  
    if (NO.includes(n)) {  
      next.direccion = null;  
    } else {  
      next.direccion = userText.trim() || null;  
    }  
    saveGpsAddCtx(next);  
    setAwaiting("gps_add_coords");  
    setMessages(m => [...m, {  
      from:"bot",  
      reply_text:"¿Tienes coordenadas, un link de Google Maps o quieres usar tu ubicación?",  
      render: () => (  
        <div className="card" style={{ marginTop: 8 }}>  
          <div className="cardActions">  
            <button className="actionBtn" onClick={() => {  
              navigator.geolocation.getCurrentPosition(({coords:{latitude,longitude}}) => {  
                const c = `${latitude},${longitude}`;  
                const u = getGpsAddCtx();  
                u.coordenadas = c;  
                u.link_maps = `https://maps.google.com/?q=${c}`;  
                saveGpsAddCtx(u);  
                setAwaiting("gps_add_photo");  
                setMessages(mm => [...mm, { from:"me", text:c }, { from:"bot", reply_text:"Ubicación recibida. ¿Tienes una foto del lugar?" }]);  
              }, () => {  
                setMessages(mm => [...mm, { from:"bot", reply_text:"No se pudo obtener la ubicación." }]);  
              });  
            }}>Usar mi ubicación</button>  
            <button className="actionBtn" onClick={() => {  
              setAwaiting("gps_add_coords");  
              setMessages(mm => [...mm, { from:"bot", reply_text:"Perfecto. Por favor escribe las coordenadas o el enlace de Google Maps." }]);  
            }}>Ingresar coordenadas/link</button>  
          </div>  
        </div>  
      )  
    }]);  
    return true;  
  }

  // —–– Pasul 4: coordonate/link —––
  if (awaiting === "gps_add_coords") {  
    const txt = userText.trim();  
    if (txt.toLowerCase().includes("http")) {  
      next.link_maps = txt;  
    } else if (txt.includes(",")) {  
      next.coordenadas = txt;  
      next.link_maps = `https://maps.google.com/?q=${txt}`;  
    } else {  
      setMessages(m => [...m, { from:"bot", reply_text:"No parece un enlace ni coordenadas válidas. Inténtalo de nuevo." }]);  
      return true;  
    }  
    saveGpsAddCtx(next);  
    setAwaiting("gps_add_photo");  
    setMessages(m => [...m, { from:"bot", reply_text:"Gracias. ¿Tienes una foto del lugar?" }]);  
    return true;  
  }

  // —–– Pasul 5: foto —––
  if (awaiting === "gps_add_photo") {  
    setAwaiting("gps_add_confirm");  
    saveGpsAddCtx(next);  
    const summary = [  
      `🟩 Tipo: ${next.tipo}`,  
      `📍 Nombre: ${next.nombre}`,  
      `🏠 Dirección: ${next.direccion || "-"}`,  
      `🌍 Coordenadas: ${next.coordenadas || "-"}`,  
      `🗺️ Link Maps: ${next.link_maps || "-"}`,  
      `🖼️ Foto: ${next.link_foto ? "Sí" : "No"}`  
    ].join("\n");  
    setMessages(m => [...m, {  
      from:"bot",  
      reply_text:`Perfecto. Este es el resumen:\n\n${summary}\n\n¿Quieres guardarlo?`,  
      render: () => (  
        <div className="card" style={{ marginTop: 8 }}>  
          <div className="cardActions">  
            <PhotoUploadInline  
              onUploaded={(url) => {  
                const u = getGpsAddCtx();  
                u.link_foto = url;  
                saveGpsAddCtx(u);  
                setMessages(mm => [...mm, { from:"me", text:"(Foto subida)" }]);  
                // după upload, generăm confirmarea  
                setMessages(mm => [...mm, { from:"bot", reply_text:"Gracias. Ahora puedes pulsar Guardar o Cancelar." }]);  
              }}  
            />  
            <button className="actionBtn" onClick={async () => {  
              const u = getGpsAddCtx();  
              const tableMap = { cliente:"gps_clientes", terminal:"gps_terminale", servicio:"gps_servicios", parking:"gps_parkings" };  
              const table = tableMap[u.tipo];  
              if (!table) {  
                setMessages(mm => [...mm, { from:"bot", reply_text:"Error: tipo inválido." }]);  
                return;  
              }  
              const { error } = await supabase.from(table).insert([{  
                tipo: u.tipo, nombre: u.nombre, direccion: u.direccion, coordenadas: u.coordenadas, link_maps: u.link_maps, link_foto: u.link_foto  
              }]);  
              if (error) {  
                setMessages(mm => [...mm, { from:"bot", reply_text:"Error al guardar: " + error.message }]);  
              } else {  
                setMessages(mm => [...mm, { from:"bot", reply_text:"¡Ubicación guardada con éxito!" }]);  
              }  
              localStorage.removeItem(gpsCtxKey);  
              setAwaiting(null);  
            }}>Guardar</button>  
            <button className="actionBtn" onClick={() => {  
              setMessages(mm => [...mm, { from:"bot", reply_text:"He cancelado la operación." }]);  
              localStorage.removeItem(gpsCtxKey);  
              setAwaiting(null);  
            }}>Cancelar</button>  
          </div>  
        </div>  
      )  
    }]);  
    return true;  
  }

  return false;  
}
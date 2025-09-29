// src/components/chat/ui/AddGpsWizard.jsx
import React, { useMemo, useState } from "react";
import { supabase } from "../../../supabaseClient";
import styles from "../Chatbot.module.css";

const IMGBB_KEY = import.meta.env.VITE_IMGBB_API_KEY;

// ——— utils mici
function cls(...a){ return a.filter(Boolean).join(" "); }

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("No se pudo leer el archivo."));
    r.onload = () => {
      const res = String(r.result || "");
      resolve(res.includes("base64,") ? res.split("base64,")[1] : res);
    };
    r.readAsDataURL(file);
  });
}
async function uploadToImgbb(file) {
  if (!IMGBB_KEY) throw new Error("Falta VITE_IMGBB_API_KEY.");
  const base64 = await fileToBase64(file);
  const form = new FormData();
  form.append("key", IMGBB_KEY);
  form.append("image", base64);
  const res = await fetch("https://api.imgbb.com/1/upload", { method: "POST", body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.success) {
    throw new Error(json?.error?.message || "La subida a imgbb ha fallado.");
  }
  return json?.data?.display_url || json?.data?.image?.url || json?.data?.url;
}

const TYPE_OPTIONS = [
  { key: "gps_clientes",  label: "Cliente" },
  { key: "gps_terminale", label: "Terminal" },
  { key: "gps_parkings",  label: "Parking" },
  { key: "gps_servicios", label: "Servicio" },
];

export default function AddGpsWizard({ onDone, onCancel }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [typeKey, setTypeKey] = useState(null);
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [coordenadas, setCoordenadas] = useState("");
  const [link_maps, setLinkMaps] = useState("");
  const [link_foto, setLinkFoto] = useState("");
  const [detalles, setDetalles] = useState("");
  const [tiempo_espera, setTiempoEspera] = useState("");

  const typeLabel = useMemo(
    () => TYPE_OPTIONS.find(t => t.key === typeKey)?.label || "",
    [typeKey]
  );

  // ——— helpers
  const canNext1 = !!typeKey;
  const canNext2 = nombre.trim().length >= 2;
  const canNext3 = Boolean(coordenadas || link_maps); // măcar una
  const tableName = typeKey || "gps_clientes";

  function mapsFromCoordsOrLink() {
    if (link_maps) return link_maps;
    if (coordenadas) return `https://maps.google.com/?q=${encodeURIComponent(coordenadas)}`;
    return "";
  }

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("La geolocalización no es compatible con este navegador.");
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude, longitude } }) => {
        setCoordenadas(`${latitude},${longitude}`);
        setGettingLocation(false);
      },
      (err) => {
        alert(`Error al obtener la ubicación: ${err.message}`);
        setGettingLocation(false);
      }
    );
  };

  const handleUpload = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      const url = await uploadToImgbb(file);
      setLinkFoto(url);
    } catch (err) {
      alert(`Error al subir la imagen: ${err.message}`);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  async function save() {
    try {
      setSaving(true);
      const payload = {
        nombre,
        direccion: direccion || null,
        link_maps: link_maps || mapsFromCoordsOrLink() || null,
        coordenadas: coordenadas || null,
        link_foto: link_foto || null,
        detalles: detalles || null,
      };
      if (tableName === "gps_clientes") payload.tiempo_espera = tiempo_espera || null;

      const { data, error } = await supabase.from(tableName).insert(payload).select().single();
      if (error) throw error;

      setSaving(false);
      onDone?.(data, true);
    } catch (err) {
      setSaving(false);
      alert(`Error al guardar: ${err.message}`);
    }
  }

  return (
    <div className={styles.card} style={{ marginTop: 10 }}>
      <div className={styles.cardTitle}>Añadir nueva ubicación</div>

      {/* STEP 1: tip */}
      {step === 1 && (
        <div style={{ marginTop: 8 }}>
          <div className={styles.cardSubtitle}>¿Qué tipo de ubicación es?</div>
          <div className={styles.cardActions} style={{ marginTop: 8 }}>
            {TYPE_OPTIONS.map(opt => (
              <button
                key={opt.key}
                className={cls(styles.actionBtn, typeKey === opt.key && styles.active)}
                onClick={() => setTypeKey(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className={styles.cardActions} style={{ marginTop: 12 }}>
            <button className={styles.actionBtn} disabled={!canNext1} onClick={() => setStep(2)}>Siguiente</button>
            <button className={styles.actionBtn} onClick={onCancel}>Cancelar</button>
          </div>
        </div>
      )}

      {/* STEP 2: nombre */}
      {step === 2 && (
        <div style={{ marginTop: 8 }}>
          <div className={styles.cardSubtitle}>¿Cómo se llama este {typeLabel.toLowerCase() || "lugar"}?</div>
          <input
            className={styles.input}
            style={{ marginTop: 8 }}
            placeholder="Ej.: Tercat"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
          />
          <div className={styles.cardActions} style={{ marginTop: 12 }}>
            <button className={styles.actionBtn} onClick={() => setStep(1)}>Atrás</button>
            <button className={styles.actionBtn} disabled={!canNext2} onClick={() => setStep(3)}>Siguiente</button>
            <button className={styles.actionBtn} onClick={onCancel}>Cancelar</button>
          </div>
        </div>
      )}

      {/* STEP 3: coords / link / geo */}
      {step === 3 && (
        <div style={{ marginTop: 8 }}>
          <div className={styles.cardSubtitle}>
            Indícame la ubicación: usa el botón de geolocalización, o pega un enlace de Google Maps, o escribe coordenadas.
          </div>

          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            <div>
              <label style={{ fontSize: 12, opacity: .8 }}>Coordenadas</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  className={styles.input}
                  placeholder="41.15, 1.10"
                  value={coordenadas}
                  onChange={e => setCoordenadas(e.target.value)}
                />
                <button
                  className={styles.actionBtn}
                  title="Usar mi ubicación"
                  onClick={handleGetLocation}
                  disabled={gettingLocation}
                >
                  {gettingLocation ? "..." : "GPS"}
                </button>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, opacity: .8 }}>Link Google Maps</label>
              <input
                className={styles.input}
                placeholder="https://maps.google.com/?q=..."
                value={link_maps}
                onChange={e => setLinkMaps(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.cardActions} style={{ marginTop: 12 }}>
            <button className={styles.actionBtn} onClick={() => setStep(2)}>Atrás</button>
            <button className={styles.actionBtn} disabled={!canNext3} onClick={() => setStep(4)}>Siguiente</button>
            <button className={styles.actionBtn} onClick={onCancel}>Cancelar</button>
          </div>
        </div>
      )}

      {/* STEP 4: foto (opcional) */}
      {step === 4 && (
        <div style={{ marginTop: 8 }}>
          <div className={styles.cardSubtitle}>
            ¿Tienes alguna foto del lugar o quieres hacer una?
          </div>
          <div style={{ marginTop: 8 }}>
            <input type="text" className={styles.input} placeholder="Link foto (opcional)"
                   value={link_foto} onChange={e => setLinkFoto(e.target.value)} />
            <div style={{ fontSize: 12, opacity: .8, marginTop: 6 }}>
              o súbela ahora desde el teléfono:
            </div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleUpload}
              disabled={uploading}
              style={{ marginTop: 8 }}
            />
            {uploading && <div style={{ fontSize: 12, opacity: .8, marginTop: 4 }}>Subiendo imagen…</div>}
            {link_foto && (
              <img
                src={link_foto}
                alt="Vista previa"
                style={{ marginTop: 8, maxWidth: "100%", borderRadius: 6 }}
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            )}
          </div>

          <div className={styles.cardActions} style={{ marginTop: 12 }}>
            <button className={styles.actionBtn} onClick={() => setStep(3)}>Atrás</button>
            <button className={styles.actionBtn} onClick={() => setStep(5)}>Siguiente</button>
            <button className={styles.actionBtn} onClick={onCancel}>Cancelar</button>
          </div>
        </div>
      )}

      {/* STEP 5: detalles + (cliente) tiempo_espera */}
      {step === 5 && (
        <div style={{ marginTop: 8 }}>
          <div className={styles.cardSubtitle}>Detalles (opcional)</div>
          <textarea
            className={styles.input}
            rows="3"
            placeholder="Accesos, horarios, notas…"
            value={detalles}
            onChange={e => setDetalles(e.target.value)}
            style={{ resize: "vertical" }}
          />
          {tableName === "gps_clientes" && (
            <div style={{ marginTop: 8 }}>
              <label style={{ fontSize: 12, opacity: .8 }}>Tiempo de espera (opcional)</label>
              <input
                className={styles.input}
                placeholder="Ej.: 30-60 min"
                value={tiempo_espera}
                onChange={e => setTiempoEspera(e.target.value)}
              />
            </div>
          )}

          <div className={styles.cardActions} style={{ marginTop: 12 }}>
            <button className={styles.actionBtn} onClick={() => setStep(4)}>Atrás</button>
            <button className={styles.actionBtn} onClick={() => setStep(6)}>Revisar</button>
            <button className={styles.actionBtn} onClick={onCancel}>Cancelar</button>
          </div>
        </div>
      )}

      {/* STEP 6: review + guardar */}
      {step === 6 && (
        <div style={{ marginTop: 8 }}>
          <div className={styles.cardSubtitle}>Revisión</div>
          <div style={{ fontSize: 14, opacity: .9, marginTop: 8, lineHeight: 1.4 }}>
            <div><strong>Tipo:</strong> {typeLabel}</div>
            <div><strong>Nombre:</strong> {nombre}</div>
            {direccion && <div><strong>Dirección:</strong> {direccion}</div>}
            {coordenadas && <div><strong>Coordenadas:</strong> {coordenadas}</div>}
            {mapsFromCoordsOrLink() && <div><strong>Maps:</strong> {mapsFromCoordsOrLink()}</div>}
            {link_foto && <div><strong>Foto:</strong> {link_foto}</div>}
            {detalles && <div><strong>Detalles:</strong> {detalles}</div>}
            {tableName === "gps_clientes" && tiempo_espera && <div><strong>Tiempo de espera:</strong> {tiempo_espera}</div>}
          </div>

          <div className={styles.cardActions} style={{ marginTop: 12 }}>
            <button className={styles.actionBtn} onClick={() => setStep(5)}>Atrás</button>
            <button className={styles.actionBtn} onClick={save} disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </button>
            <button className={styles.actionBtn} onClick={onCancel}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
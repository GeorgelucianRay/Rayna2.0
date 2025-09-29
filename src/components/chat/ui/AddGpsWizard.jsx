import React, { useMemo, useState } from "react";
import styles from "../Chatbot.module.css";
import { supabase } from "../../../supabaseClient";
import PhotoUploadInline from "./PhotoUploadInline";
import GeoCaptureButton from "./GeoCaptureButton";

const TYPES = [
  { id: "gps_clientes",  label: "Cliente"   },
  { id: "gps_parkings",  label: "Parking"   },
  { id: "gps_servicios", label: "Servicio"  },
  { id: "gps_terminale", label: "Terminal"  },
];

export default function AddGpsWizard({ onDone, onCancel }) {
  const [step, setStep] = useState(1);
  const [table, setTable] = useState("gps_clientes");
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [linkMaps, setLinkMaps] = useState("");
  const [coords, setCoords] = useState("");
  const [tiempoEspera, setTiempoEspera] = useState("");
  const [detalles, setDetalles] = useState("");
  const [foto, setFoto] = useState("");
  const [saving, setSaving] = useState(false);

  const isCliente = table === "gps_clientes";
  const canNext1 = Boolean(table);
  const canNext2 = nombre.trim().length >= 2;
  const canNext3 = Boolean(coords || linkMaps); // minim una metodă de localizare

  const payload = useMemo(() => ({
    nombre: nombre || null,
    direccion: direccion || null,
    link_maps: linkMaps || null,
    coordenadas: coords || null,
    detalles: detalles || null,
    link_foto: foto || null,
    ...(isCliente ? { tiempo_espera: tiempoEspera || null } : {}),
  }), [nombre, direccion, linkMaps, coords, detalles, foto, tiempoEspera, isCliente]);

  async function save() {
    try {
      setSaving(true);
      const { error, data } = await supabase.from(table).insert(payload).select().single();
      if (error) throw error;
      onDone?.(data);
    } catch (err) {
      alert(err.message || String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>Añadir ubicación</div>

      {/* STEP 1: tipo */}
      {step === 1 && (
        <>
          <div style={{ marginTop: 8 }}>¿Qué tipo de ubicación es?</div>
          <div className={styles.cardActions} style={{ marginTop: 8 }}>
            {TYPES.map(t => (
              <button
                key={t.id}
                className={styles.actionBtn}
                onClick={() => setTable(t.id)}
                style={{ opacity: table === t.id ? 1 : 0.9 }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className={styles.cardActions} style={{ marginTop: 12 }}>
            <button className={styles.actionBtn} disabled={!canNext1} onClick={() => setStep(2)}>Siguiente</button>
            <button className={styles.actionBtn} onClick={onCancel}>Cancelar</button>
          </div>
        </>
      )}

      {/* STEP 2: nombre */}
      {step === 2 && (
        <>
          <div style={{ marginTop: 8 }}>¿Cómo se llama?</div>
          <input
            className={styles.input}
            placeholder="Ej.: Tercat"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            style={{ marginTop: 8 }}
          />
          <div className={styles.cardActions} style={{ marginTop: 12 }}>
            <button className={styles.actionBtn} onClick={() => setStep(1)}>Atrás</button>
            <button className={styles.actionBtn} disabled={!canNext2} onClick={() => setStep(3)}>Siguiente</button>
            <button className={styles.actionBtn} onClick={onCancel}>Cancelar</button>
          </div>
        </>
      )}

      {/* STEP 3: localización (coords / link) */}
      {step === 3 && (
        <>
          <div style={{ marginTop: 8 }}>Ubicación: pulsa el botón para usar tu ubicación, o pega un enlace de Maps, o escribe coordenadas.</div>
          <div className={styles.cardActions} style={{ marginTop: 8 }}>
            <GeoCaptureButton onCoords={setCoords} />
          </div>
          <input
            className={styles.input}
            placeholder="Coordenadas (lat,lon)"
            value={coords}
            onChange={(e) => setCoords(e.target.value)}
            style={{ marginTop: 8 }}
          />
          <input
            className={styles.input}
            placeholder="Link Google Maps (opcional)"
            value={linkMaps}
            onChange={(e) => setLinkMaps(e.target.value)}
            style={{ marginTop: 8 }}
          />
          <div className={styles.cardActions} style={{ marginTop: 12 }}>
            <button className={styles.actionBtn} onClick={() => setStep(2)}>Atrás</button>
            <button className={styles.actionBtn} disabled={!canNext3} onClick={() => setStep(4)}>Siguiente</button>
            <button className={styles.actionBtn} onClick={onCancel}>Cancelar</button>
          </div>
        </>
      )}

      {/* STEP 4: detalles + (opțional) tiempo_espera + foto */}
      {step === 4 && (
        <>
          {isCliente && (
            <>
              <div style={{ marginTop: 8 }}>Tiempo de espera (opcional)</div>
              <input
                className={styles.input}
                placeholder="Ej.: 30-60 min"
                value={tiempoEspera}
                onChange={(e) => setTiempoEspera(e.target.value)}
                style={{ marginTop: 6 }}
              />
            </>
          )}

          <div style={{ marginTop: 8 }}>Dirección (opcional)</div>
          <input
            className={styles.input}
            placeholder="Calle / número / etc."
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            style={{ marginTop: 6 }}
          />

          <div style={{ marginTop: 8 }}>Detalles (opcional)</div>
          <textarea
            className={styles.input}
            rows={3}
            placeholder="Notas útiles del lugar…"
            value={detalles}
            onChange={(e) => setDetalles(e.target.value)}
            style={{ marginTop: 6 }}
          />

          <div style={{ marginTop: 10 }}>Foto (opcional): sube una o haz una ahora</div>
          <PhotoUploadInline onUploaded={setFoto} />
          {foto && (
            <img
              src={foto}
              alt="preview"
              style={{ marginTop: 8, maxWidth: "100%", borderRadius: 8 }}
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          )}

          <div className={styles.cardActions} style={{ marginTop: 12 }}>
            <button className={styles.actionBtn} onClick={() => setStep(3)}>Atrás</button>
            <button className={styles.actionBtn} onClick={save} disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </button>
            <button className={styles.actionBtn} onClick={onCancel}>Cancelar</button>
          </div>
        </>
      )}
    </div>
  );
}
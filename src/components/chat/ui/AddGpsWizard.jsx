// src/components/chat/wizards/AddGpsModalWizard.jsx
import React, { useEffect, useRef, useState } from "react";
import styles from "../Chatbot.module.css"; // folosim aceleași bubbles/carduri ca Rayna
import { supabase } from "../../../supabaseClient";

// 🔹 UI inline deja create de tine
import GeoCaptureButton from "../ui/GeoCaptureButton";
import PhotoUploadInline from "../ui/PhotoUploadInline";

// ——— Utils mici
const TYPE_OPTIONS = [
  { key: "cliente",   label: "Cliente",   table: "gps_clientes"   },
  { key: "parking",   label: "Parking",   table: "gps_parkings"   },
  { key: "servicio",  label: "Servicio",  table: "gps_servicios"  },
  { key: "terminal",  label: "Terminal",  table: "gps_terminale"  },
];

const getTableByType = (tkey) => TYPE_OPTIONS.find(t => t.key === tkey)?.table || null;

// ——— Un „bubble” de bot reutilizabil
function BotBubble({ children }) {
  return <div className={`${styles.bubble} ${styles.bot}`}>{children}</div>;
}
function MeBubble({ children }) {
  return <div className={`${styles.bubble} ${styles.me}`}>{children}</div>;
}

export default function AddGpsModalWizard({ onDone, onCancel }) {
  // starea „chat”
  const [flow, setFlow] = useState([
    { role: "bot", text: "Quiero añadir nueva ubicación.\n¡Claro! ¿Qué tipo de ubicación es?" }
  ]);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [flow]);

  // formularul „invizibil” care se umple pas cu pas
  const [form, setForm] = useState({
    tipo: "",            // cliente/parking/servicio/terminal
    nombre: "",
    direccion: "",
    link_maps: "",
    coordenadas: "",
    tiempo_espera: "",   // doar pentru clientes
    detalles: "",
    link_foto: "",
  });
  const [stage, setStage] = useState("type");   // type -> name -> location_method -> location_fill -> optional_extras -> photo -> details -> confirm -> saving -> done
  const [saving, setSaving] = useState(false);

  // helpers pt. push mesaje
  const pushBot  = (text, render) => setFlow(f => [...f, { role: "bot", text, render }]);
  const pushUser = (text) => setFlow(f => [...f, { role: "me",  text }]);

  // ——— 1) ALEGERE TIP
  const TypeSelector = () => (
    <div className={styles.card} style={{ marginTop: 8 }}>
      <div className={styles.cardTitle}>Elige el tipo:</div>
      <div className={styles.cardActions}>
        {TYPE_OPTIONS.map(opt => (
          <button
            key={opt.key}
            className={styles.actionBtn}
            onClick={() => {
              pushUser(opt.label);
              setForm(v => ({ ...v, tipo: opt.key }));
              setStage("name");
              pushBot("¿Cómo se llama esta ubicación?");
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  // ——— 2) NUME
  const NameInput = () => {
    const [value, setValue] = useState("");
    return (
      <div className={styles.card} style={{ marginTop: 8 }}>
        <div className={styles.cardTitle}>Nombre</div>
        <div className={styles.cardActions}>
          <input
            className={styles.input}
            placeholder="Ej.: Tercat"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={(e)=>{ if(e.key==="Enter") submit(); }}
          />
          <button className={styles.actionBtn} onClick={submit}>Continuar</button>
        </div>
      </div>
    );
    function submit() {
      const v = value.trim();
      if (!v) return;
      pushUser(v);
      setForm(f => ({ ...f, nombre: v }));
      setStage("location_method");
      pushBot(
        "Ok. ¿Cómo nos das la ubicación?\n• Pulsa el botón para usar tu posición\n• Pega el enlace de Google Maps\n• Escribe las coordenadas (lat,lon)",
        () => (
          <div className={styles.card} style={{ marginTop: 8 }}>
            <div className={styles.cardActions}>
              <button className={styles.actionBtn} onClick={() => { pushUser("Usar mi ubicación"); setStage("location_fill_geo"); }}>
                Usar mi ubicación
              </button>
              <button className={styles.actionBtn} onClick={() => { pushUser("Te paso un enlace de Maps"); setStage("location_fill_link"); }}>
                Pegar enlace Maps
              </button>
              <button className={styles.actionBtn} onClick={() => { pushUser("Te doy coordenadas"); setStage("location_fill_coords"); }}>
                Escribir coordenadas
              </button>
            </div>
          </div>
        )
      );
    }
  };

  // ——— 3A) „GeoCapture” – luăm coordonate
  const LocationFillGeo = () => (
    <div className={styles.card} style={{ marginTop: 8 }}>
      <div className={styles.cardTitle}>Pulsa para capturar tu ubicación</div>
      <div className={styles.cardActions}>
        <GeoCaptureButton
          onGotCoords={(coords) => {
            pushUser(coords);
            setForm(f => ({ ...f, coordenadas: coords, link_maps: f.link_maps || `https://maps.google.com/?q=${coords}` }));
            askOptionalExtras();
          }}
          onError={(msg) => pushBot(`Error al obtener ubicación: ${msg}`)}
        />
      </div>
    </div>
  );

  // ——— 3B) Link Maps
  const LocationFillLink = () => {
    const [link, setLink] = useState("");
    return (
      <div className={styles.card} style={{ marginTop: 8 }}>
        <div className={styles.cardTitle}>Pega enlace de Google Maps</div>
        <div className={styles.cardActions}>
          <input
            className={styles.input}
            placeholder="https://maps.google.com/..."
            value={link}
            onChange={e => setLink(e.target.value)}
            onKeyDown={(e)=>{ if(e.key==="Enter") submit(); }}
          />
          <button className={styles.actionBtn} onClick={submit}>Continuar</button>
        </div>
      </div>
    );
    function submit(){
      const v = link.trim();
      if (!v) return;
      pushUser(v);
      setForm(f => ({ ...f, link_maps: v }));
      askOptionalExtras();
    }
  };

  // ——— 3C) Coordonate
  const LocationFillCoords = () => {
    const [coords, setCoords] = useState("");
    return (
      <div className={styles.card} style={{ marginTop: 8 }}>
        <div className={styles.cardTitle}>Escribe coordenadas</div>
        <div className={styles.cardActions}>
          <input
            className={styles.input}
            placeholder="Ej.: 41.15, 1.10"
            value={coords}
            onChange={e => setCoords(e.target.value)}
            onKeyDown={(e)=>{ if(e.key==="Enter") submit(); }}
          />
          <button className={styles.actionBtn} onClick={submit}>Continuar</button>
        </div>
      </div>
    );
    function submit(){
      const v = coords.trim();
      if (!v) return;
      pushUser(v);
      setForm(f => ({ ...f, coordenadas: v, link_maps: f.link_maps || `https://maps.google.com/?q=${v}` }));
      askOptionalExtras();
    }
  };

  function askOptionalExtras() {
    setStage("optional_extras");
    pushBot(
      "¿Quieres añadir dirección o tiempo de espera (si es Cliente)?",
      () => (
        <div className={styles.card} style={{ marginTop: 8 }}>
          <div className={styles.cardActions}>
            <button className={styles.actionBtn} onClick={() => { pushUser("Añadir dirección"); setStage("ask_address"); }}>
              Añadir dirección
            </button>
            {form.tipo === "cliente" && (
              <button className={styles.actionBtn} onClick={() => { pushUser("Añadir tiempo de espera"); setStage("ask_wait"); }}>
                Tiempo de espera
              </button>
            )}
            <button className={styles.actionBtn} onClick={() => { pushUser("Saltar"); setStage("photo"); askPhoto(); }}>
              Saltar
            </button>
          </div>
        </div>
      )
    );
  }

  const AskAddress = () => {
    const [v, setV] = useState("");
    return (
      <div className={styles.card} style={{ marginTop: 8 }}>
        <div className={styles.cardTitle}>Dirección</div>
        <div className={styles.cardActions}>
          <input className={styles.input} value={v} onChange={e=>setV(e.target.value)} placeholder="Calle…" onKeyDown={(e)=>{ if(e.key==="Enter") submit(); }} />
          <button className={styles.actionBtn} onClick={submit}>OK</button>
        </div>
      </div>
    );
    function submit(){
      pushUser(v || "(vacío)");
      setForm(f => ({ ...f, direccion: v }));
      setStage("optional_extras");
      askOptionalExtras();
    }
  };

  const AskWait = () => {
    const [v, setV] = useState("");
    return (
      <div className={styles.card} style={{ marginTop: 8 }}>
        <div className={styles.cardTitle}>Tiempo de espera</div>
        <div className={styles.cardActions}>
          <input className={styles.input} value={v} onChange={e=>setV(e.target.value)} placeholder="Ej.: 30-45 min" onKeyDown={(e)=>{ if(e.key==="Enter") submit(); }} />
          <button className={styles.actionBtn} onClick={submit}>OK</button>
        </div>
      </div>
    );
    function submit(){
      pushUser(v || "(vacío)");
      setForm(f => ({ ...f, tiempo_espera: v }));
      setStage("optional_extras");
      askOptionalExtras();
    }
  };

  function askPhoto() {
    pushBot(
      "¿Tienes alguna foto del lugar? Súbela o haz una ahora:",
      () => (
        <div className={styles.card} style={{ marginTop: 8 }}>
          <PhotoUploadInline
            value={form.link_foto}
            onUploaded={(url) => {
              pushUser("(Foto subida)");
              setForm(f => ({ ...f, link_foto: url }));
            }}
          />
          <div className={styles.cardActions} style={{ marginTop: 8 }}>
            <button className={styles.actionBtn} onClick={() => { pushUser("No tengo foto"); setStage("details"); askDetails(); }}>
              Saltar
            </button>
            <button className={styles.actionBtn} onClick={() => { pushUser("Listo"); setStage("details"); askDetails(); }}>
              Continuar
            </button>
          </div>
        </div>
      )
    );
  }

  function askDetails() {
    pushBot("¿Algún detalle que debamos saber?");
  }

  const DetailsInput = () => {
    const [v, setV] = useState("");
    return (
      <div className={styles.card} style={{ marginTop: 8 }}>
        <textarea
          className={styles.input}
          rows={3}
          placeholder="Horarios, puertas, notas…"
          value={v}
          onChange={e=>setV(e.target.value)}
          onKeyDown={(e)=>{ if(e.key==="Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
        />
        <div className={styles.cardActions} style={{ marginTop: 8 }}>
          <button className={styles.actionBtn} onClick={submit}>Continuar</button>
        </div>
      </div>
    );
    function submit(){
      pushUser(v || "(sin detalles)");
      setForm(f => ({ ...f, detalles: v }));
      setStage("confirm");
      confirmStep();
    }
  };

  function confirmStep() {
    const tbl = getTableByType(form.tipo);
    const summary = [
      `Tipo: ${TYPE_OPTIONS.find(t=>t.key===form.tipo)?.label || "-"}`,
      `Nombre: ${form.nombre || "-"}`,
      `Dirección: ${form.direccion || "-"}`,
      `Coordenadas: ${form.coordenadas || "-"}`,
      `Link Maps: ${form.link_maps || "-"}`,
      ...(tbl === "gps_clientes" ? [`Tiempo de espera: ${form.tiempo_espera || "-"}`] : []),
      `Foto: ${form.link_foto ? "Sí" : "No"}`
    ].join("\n");

    pushBot(
      `Revisa y confirma:\n\n${summary}`,
      () => (
        <div className={styles.card} style={{ marginTop: 8 }}>
          <div className={styles.cardActions}>
            <button className={styles.actionBtn} onClick={handleSave} disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </button>
            <button className={styles.actionBtn} onClick={() => { pushUser("Cancelar"); onCancel?.(); }}>
              Cancelar
            </button>
          </div>
        </div>
      )
    );
  }

  async function handleSave() {
    const table = getTableByType(form.tipo);
    if (!table) {
      pushBot("Tipo inválido. Cancelo.");
      return onCancel?.();
    }
    if (!form.nombre) {
      pushBot("Falta el nombre.");
      return;
    }
    if (!form.coordenadas && !form.link_maps) {
      pushBot("Faltan coordenadas o enlace de Maps.");
      return;
    }

    setSaving(true);
    // construim payload; câmpurile goale devin null
    const payload = {};
    Object.entries(form).forEach(([k, v]) => {
      if (k === "tipo") return;
      payload[k] = v === "" ? null : v;
    });

    const { error } = await supabase.from(table).insert([payload]);
    setSaving(false);

    if (error) {
      pushBot(`Error al guardar: ${error.message}`);
      return;
    }

    pushBot("¡Perfecto! La ubicación ha sido guardada con éxito. ¿Quieres verla ahora?", () => (
      <div className={styles.card} style={{ marginTop: 8 }}>
        <div className={styles.cardActions}>
          <button
            className={styles.actionBtn}
            onClick={() => {
              pushUser("Sí");
              onDone?.({ openPreviewOf: form.nombre });
            }}
          >
            Sí
          </button>
          <button
            className={styles.actionBtn}
            onClick={() => {
              pushUser("No");
              // rămânem în chat
              pushBot("¿En qué te puedo ayudar más?");
              onDone?.({ openPreviewOf: null });
            }}
          >
            No
          </button>
        </div>
      </div>
    ));

    setStage("done");
  }

  // ——— Render „conversație” (bubbles + mini-inputuri pe etape)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {flow.map((m, i) =>
        m.role === "bot" ? (
          <BotBubble key={i}>
            <div className={styles.botText}>{m.text}</div>
            {m.render ? <div style={{ marginTop: 8 }}>{m.render()}</div> : null}
          </BotBubble>
        ) : (
          <MeBubble key={i}>{m.text}</MeBubble>
        )
      )}

      {/* Etapele active afișează „bula” cu UI */}
      {stage === "type" && <BotBubble><TypeSelector /></BotBubble>}
      {stage === "name" && <BotBubble><NameInput /></BotBubble>}
      {stage === "location_method" && null /* butoanele sunt împinse în flux în NameInput */}
      {stage === "location_fill_geo" && <BotBubble><LocationFillGeo /></BotBubble>}
      {stage === "location_fill_link" && <BotBubble><LocationFillLink /></BotBubble>}
      {stage === "location_fill_coords" && <BotBubble><LocationFillCoords /></BotBubble>}
      {stage === "ask_address" && <BotBubble><AskAddress /></BotBubble>}
      {stage === "ask_wait" && <BotBubble><AskWait /></BotBubble>}
      {stage === "photo" && null /* askPhoto împinge UI în flux */}
      {stage === "details" && <BotBubble><DetailsInput /></BotBubble>}
      {/* confirm pasul injectează card cu butoane în flux */}

      <div ref={endRef} />
    </div>
  );
}
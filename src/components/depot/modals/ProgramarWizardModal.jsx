// src/components/depot/modals/ProgramarWizardModal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import Modal from "../../ui/Modal";
import shell from "../../ui/Modal.module.css";
import hud from "./WizardHud.module.css";

function norm(s = "") {
  return String(s || "").trim().toUpperCase();
}

export default function ProgramarWizardModal({
  isOpen,
  onClose,
  container,     // record selectat
  onProgramar,   // async (payload) => ...
}) {
  const [empresa, setEmpresa] = useState("");
  const [fecha, setFecha] = useState(""); // yyyy-mm-dd
  const [hora, setHora] = useState("");   // hh:mm
  const [pos, setPos] = useState("");
  const [truck, setTruck] = useState("");

  const inEmpresaRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    setEmpresa(container?.empresa_descarga || "");
    setFecha(container?.fecha ? String(container.fecha) : "");
    setHora(container?.hora ? String(container.hora).slice(0, 5) : "");
    setPos(container?.posicion || container?.pos || "");
    setTruck(container?.matricula_camion || "");

    setTimeout(() => inEmpresaRef.current?.focus?.(), 80);
  }, [isOpen, container]);

  const canSave = useMemo(() => !!fecha && !!hora, [fecha, hora]);

  const submit = async () => {
    const mat = norm(container?.matricula_contenedor || container?.matricula);
    if (!mat) return alert("Nu există matrícula de container.");

    const payload = {
      matricula_contenedor: mat,
      naviera: container?.naviera || null,
      tipo: container?.tipo || null,
      posicion: pos ? String(pos).trim() : null,
      empresa_descarga: empresa ? String(empresa).trim() : null,
      fecha: fecha || null,
      hora: hora || null,
      matricula_camion: truck ? norm(truck) : null,
      detalles: container?.detalles || null,
      estado: "programado",
    };

    try {
      await onProgramar?.(payload);
      onClose?.();
    } catch (e) {
      console.error(e);
      alert("Eroare la PROGRAMAR.");
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Programar contenedor" fillOnMobile>
      <div className={shell.slotHeader}>
        <h3 style={{ margin: 0, fontWeight: 900, color: "#00e5ff", textTransform: "uppercase", letterSpacing: ".05em" }}>
          Programar
        </h3>
      </div>

      <div className={shell.slotContent}>
        <div className={hud.ios}>
          <div className={hud.card}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Contenedor</div>
            <div className={`${hud.mono}`} style={{ fontWeight: 900 }}>
              {norm(container?.matricula_contenedor || container?.matricula || "—")}
            </div>
            <div style={{ opacity: 0.85, fontSize: 12 }}>
              {norm(container?.posicion || container?.pos || "—")} • {String(container?.tipo || "—")}
              {container?.naviera ? ` • ${container.naviera}` : ""}
            </div>
          </div>

          <div>
            <span className={hud.label}>Cliente / Empresa descarga</span>
            <input
              ref={inEmpresaRef}
              className={hud.input}
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              placeholder="Ej: XPO / AP Moller / …"
              spellCheck={false}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <span className={hud.label}>Fecha *</span>
              <input className={hud.input} type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div>
              <span className={hud.label}>Hora *</span>
              <input className={hud.input} type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
            </div>
          </div>

          <div>
            <span className={hud.label}>Posición (opcional)</span>
            <input
              className={`${hud.input} ${hud.mono}`}
              value={pos}
              onChange={(e) => setPos(e.target.value)}
              placeholder="Ej: A-12 / Rampa 3"
              spellCheck={false}
            />
          </div>

          <div>
            <span className={hud.label}>Matrícula camión (opcional)</span>
            <input
              className={`${hud.input} ${hud.mono}`}
              value={truck}
              onChange={(e) => setTruck(e.target.value.toUpperCase())}
              placeholder="Ej: 1710KKY"
              autoCapitalize="characters"
              spellCheck={false}
            />
          </div>

          <div className={hud.actions}>
            <button type="button" className={hud.btn} onClick={onClose}>Cancelar</button>
            <button type="button" className={`${hud.btn} ${hud.primary}`} onClick={submit} disabled={!canSave}>
              Guardar
            </button>
          </div>
        </div>
      </div>

      <div className={shell.slotFooter} />
    </Modal>
  );
}
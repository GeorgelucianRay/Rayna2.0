import React, { useEffect, useMemo, useRef, useState } from "react";
import Modal from "../../ui/Modal";
import shell from "../../ui/Modal.module.css";
import hud from "./WizardHud.module.css";

function norm(s = "") {
  return String(s || "").trim().toUpperCase();
}

export default function AssignProgramadoModal({
  isOpen,
  onClose,
  container,        // recordul selectat din hartă
  onAssign,         // async (payload) => ...
}) {
  const [truck, setTruck] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [fecha, setFecha] = useState(""); // yyyy-mm-dd
  // ✅ scos: hora

  const inTruckRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setTruck("");
    setEmpresa(container?.empresa_descarga || "");
    setFecha(container?.fecha ? String(container.fecha) : "");
    // ✅ scos: setHora(...)
    setTimeout(() => inTruckRef.current?.focus?.(), 80);
  }, [isOpen, container]);

  const canSave = useMemo(() => norm(truck).length >= 4, [truck]);

  const submit = async () => {
    const mat = norm(container?.matricula_contenedor || container?.matricula);
    if (!mat) return alert("Nu există matrícula de container.");
    const cam = norm(truck);
    if (cam.length < 4) return alert("Introduce matrícula camion válida.");

    const payload = {
      matricula_contenedor: mat,
      matricula_camion: cam,

      // opționale (există în tabelul tău)
      empresa_descarga: empresa ? String(empresa) : null,
      fecha: fecha || null,
      // ✅ scos: hora

      // dacă vrei să copiezi și astea în programados (există coloane)
      naviera: container?.naviera || null,
      tipo: container?.tipo || null,
      posicion: container?.posicion || container?.pos || null,
      detalles: container?.detalles || null,

      // IMPORTANT:
      // în schema ta "estado" e enum prog_estado default 'programado'
      // dacă enum-ul tău are și 'asignado', schimbă linia asta în 'asignado'
      estado: "programado",
    };

    try {
      await onAssign?.(payload);
      onClose?.();
    } catch (e) {
      console.error(e);
      alert("Eroare la ASIGNAR.");
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Asignar a camión" fillOnMobile>
      <div className={shell.slotHeader}>
        <h3 style={{ margin: 0, fontWeight: 900, color: "#00e5ff", textTransform: "uppercase", letterSpacing: ".05em" }}>
          Asignar • Programado
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
            <span className={hud.label}>Matrícula Camión</span>
            <input
              ref={inTruckRef}
              className={`${hud.input} ${hud.mono}`}
              value={truck}
              onChange={(e) => setTruck(e.target.value.toUpperCase())}
              placeholder="Ej: 1710KKY"
              autoCapitalize="characters"
              spellCheck={false}
            />
          </div>

          <div>
            <span className={hud.label}>Empresa descarga (opcional)</span>
            <input
              className={hud.input}
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              placeholder="Ej: AP Moller / XPO / …"
              spellCheck={false}
            />
          </div>

          {/* ✅ doar Fecha */}
          <div>
            <span className={hud.label}>Fecha (opcional)</span>
            <input
              className={hud.input}
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
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
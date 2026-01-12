// src/components/depot/map/Navbar3D.jsx
import React, { useMemo, useState } from "react";
import SearchBox from "./SearchBox";
import styles from "./Map3DStandalone.module.css";

function IconBtn({ title, onClick, className = "", children }) {
  return (
    <button
      className={`${styles.dockIconBtnPanel} ${className}`}
      title={title}
      onClick={onClick}
      type="button"
      aria-label={title}
    >
      {children}
    </button>
  );
}

function OverlayModal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className={styles.mapModalOverlay} role="dialog" aria-modal="true">
      <div className={styles.mapModalCard}>
        <div className={styles.mapModalHead}>
          <strong className={styles.mapModalTitle}>{title}</strong>
          <button className={styles.mapModalClose} onClick={onClose} type="button" aria-label="Close">
            ✕
          </button>
        </div>
        <div className={styles.mapModalBody}>{children}</div>
      </div>
    </div>
  );
}

function AddItemModal({ open, onClose, onSubmit, mode = "entrada" }) {
  const [form, setForm] = useState({ name: "" });
  if (!open) return null;

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true">
      <div className={styles.modalCard}>
        <div className={styles.modalHead}>
          <h3 className={styles.modalTitle}>{mode === "salida" ? "Salida" : "Entrada"} • Container</h3>
          <button className={styles.modalClose} onClick={onClose} type="button">✕</button>
        </div>

        <label className={styles.modalField}>
          <span>Container / Nume</span>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={styles.modalInput}
            placeholder="ex: MSCU1234567"
          />
        </label>

        <button
          onClick={() => onSubmit?.({ ...form, mode })}
          className={styles.modalPrimary}
          type="button"
        >
          {mode === "salida" ? "Confirmă salida" : "Confirmă entrada"}
        </button>
      </div>
    </div>
  );
}

export default function Navbar3D({
  containers = [],
  onSelectContainer,
  onToggleFP,
  onAdd,            // primește { name, mode: "entrada" | "salida" }
  onOpenBuild,
  onOpenWorldItems,
}) {
  const [panelOpen, setPanelOpen] = useState(false);

  const [listOpen, setListOpen] = useState(false);   // MODAL listă (programación)
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState("entrada"); // "entrada" | "salida"

  const listTitle = useMemo(() => "Programación • Containers", []);

  return (
    <>
      {/* Panelul top-down (burger) — aici pui dock-ul tău în interior */}
      <div className={`${styles.topMenu} ${panelOpen ? styles.topMenuOpen : ""}`} data-map-ui="1">
        <div className={`${styles.navPanel} ${styles.navPanelWithSearch}`}>
          <div className={styles.toolsDockPanel}>
            <IconBtn
              title="Programación"
              onClick={() => { setListOpen(true); setPanelOpen(false); }}
            >
              📅
            </IconBtn>

            <IconBtn
              title="Walk / FP"
              onClick={() => { onToggleFP?.(); setPanelOpen(false); }}
            >
              👤
            </IconBtn>

            <IconBtn
              title="Build"
              onClick={() => { onOpenBuild?.(); setPanelOpen(false); }}
            >
              🧱
            </IconBtn>

            <IconBtn
              title="Items"
              onClick={() => { onOpenWorldItems?.(); setPanelOpen(false); }}
            >
              📋
            </IconBtn>

            {/* + Entrada (verde) */}
            <IconBtn
              title="Entrada (+)"
              className={styles.iconSphereGreen}
              onClick={() => { setAddMode("entrada"); setAddOpen(true); setPanelOpen(false); }}
            >
              +
            </IconBtn>

            {/* - Salida (roșu) */}
            <IconBtn
              title="Salida (-)"
              className={styles.iconSphereRed}
              onClick={() => { setAddMode("salida"); setAddOpen(true); setPanelOpen(false); }}
            >
              −
            </IconBtn>
          </div>
        </div>
      </div>

      {/* MODAL LISTĂ (Programación) — în interiorul hărții */}
      <OverlayModal
        open={listOpen}
        title={listTitle}
        onClose={() => setListOpen(false)}
      >
        <SearchBox containers={containers} onContainerSelect={(c) => { onSelectContainer?.(c); setListOpen(false); }} />
      </OverlayModal>

      {/* MODAL + / - */}
      <AddItemModal
        open={addOpen}
        mode={addMode}
        onClose={() => setAddOpen(false)}
        onSubmit={(data) => { onAdd?.(data); setAddOpen(false); }}
      />
    </>
  );
}
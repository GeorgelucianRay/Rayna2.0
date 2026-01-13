import React from "react";
import styles from "./ContainerInfoCard.module.css";

export default function ContainerInfoCard({
  container,
  onClose,
  onAsignar,      // ✅ nou
  onProgramar,    // ✅ nou (placeholder)
}) {
  if (!container) return null;

  const {
    matricula_contenedor,
    naviera,
    tipo,
    posicion,
    __source, // 'enDeposito', 'programados', 'rotos'
  } = container;

  const statusClass = styles[__source] || styles.enDeposito;

  const canAsignar = __source !== "programados"; // (în programados deja e asignat/programat)

  return (
    <div className={styles.card}>
      <button className={styles.closeButton} onClick={onClose}>✕</button>

      <div className={styles.header}>
        <h3 className={styles.title}>{matricula_contenedor || "N/A"}</h3>
        <span className={`${styles.status} ${statusClass}`}>{__source}</span>
      </div>

      <div className={styles.details}>
        <p><strong>Naviera:</strong> {naviera || "N/A"}</p>
        <p><strong>Tip:</strong> {tipo || "N/A"}</p>
        <p><strong>Poziție:</strong> {posicion || "N/A"}</p>
      </div>

      {/* ✅ ACTIONS */}
      <div className={styles.actionsRow}>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={() => onAsignar?.(container)}
          disabled={!canAsignar}
          title={!canAsignar ? "Deja este în programados" : "Asignar a camión"}
        >
          Asignar
        </button>

        <button
          type="button"
          className={styles.btnGhost}
          onClick={() => onProgramar?.(container)}
          disabled
          title="Îl implementăm după"
        >
          Programar
        </button>
      </div>
    </div>
  );
}
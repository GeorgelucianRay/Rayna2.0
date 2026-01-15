// src/components/depot/map/ContainerInfoCard.jsx
import React, { useMemo } from "react";
import styles from "./ContainerInfoCard.module.css";

function pickStatus(container) {
  // sursa de pe hartă (depozit / rotos / programados etc.)
  const src = String(container?.__source || container?.__from || "").toLowerCase();

  // statusul din tabel (programados are de obicei estado: programado/asignado/pendiente)
  const estado = String(container?.estado || "").toLowerCase();

  // 1) dacă e în programados, culoarea trebuie să depindă de "estado"
  if (src === "programados" || src === "programado" || src === "contenedores_programados") {
    if (estado === "asignado") return { key: "asignado", label: "ASIGNADO" };
    if (estado === "pendiente") return { key: "pendiente", label: "PENDIENTE" };
    return { key: "programado", label: "PROGRAMADO" }; // default
  }

  // 2) dacă nu e programados, este în depozit (verde) - inclusiv rotos dacă vrei tot verde
  return { key: "depozit", label: "DEPÓSITO" };
}

export default function ContainerInfoCard({
  container,
  onClose,
  onAsignar,
  onProgramar,
}) {
  if (!container) return null;

  const status = useMemo(() => pickStatus(container), [container]);

  // butoane: în programados nu mai vrei asignar/programar (de regulă)
  const src = String(container?.__source || container?.__from || "").toLowerCase();
  const isInProgramados = src === "programados" || src === "contenedores_programados";
  const canAsignar = !isInProgramados;
  const canProgramar = !isInProgramados;

  return (
    <div className={styles.card}>
      <button className={styles.closeButton} onClick={onClose}>✕</button>

      <div className={styles.header}>
        <h3 className={styles.title}>{container?.matricula_contenedor || "N/A"}</h3>

        {/* ETICHETA COLORATĂ */}
        <span className={`${styles.badge} ${styles[status.key]}`}>
          {status.label}
        </span>
      </div>

      <div className={styles.details}>
        <p><strong>Naviera:</strong> {container?.naviera || "N/A"}</p>
        <p><strong>Tip:</strong> {container?.tipo || "N/A"}</p>
        <p><strong>Poziție:</strong> {container?.posicion || container?.pos || "N/A"}</p>
      </div>

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
          disabled={!canProgramar}
          title={!canProgramar ? "Deja este în programados" : "Programar"}
        >
          Programar
        </button>
      </div>
    </div>
  );
}
import React, { useMemo } from "react";
import styles from "./ContainerInfoCard.module.css";

function up(s = "") {
  return String(s || "").trim().toUpperCase();
}

export default function ContainerInfoCard({
  container,
  onClose,
  onAsignar,
  onProgramar,
}) {
  if (!container) return null;

  const {
    matricula_contenedor,
    naviera,
    tipo,
    posicion,
    __source, // 'enDeposito', 'programados', 'rotos'
    estado,   // 'programado' | 'asignado' | 'pendiente' (când e din programados)
  } = container;

  // ✅ decide ce badge folosim (clasele din CSS-ul nou)
  const badgeKey = useMemo(() => {
    if (__source === "rotos") return "rotos";
    if (__source === "enDeposito") return "depozit";

    // programados: folosim estado
    const est = String(estado || "").trim().toLowerCase();
    if (est === "asignado") return "asignado";
    if (est === "pendiente") return "pendiente";
    return "programado"; // default
  }, [__source, estado]);

  // ✅ text în badge (tu ai acum "PROGRAMADO" în UI)
  const badgeText = useMemo(() => {
    if (__source === "rotos") return "ROTOS";
    if (__source === "enDeposito") return "DEPOZIT";

    const est = String(estado || "").trim().toLowerCase();
    if (est === "asignado") return "ASIGNADO";
    if (est === "pendiente") return "PENDIENTE";
    return "PROGRAMADO";
  }, [__source, estado]);

  // ✅ reguli butoane (nu te bloca singur)
  // - "Asignar" doar dacă NU e deja asignado (și nu e rotos)
  // - "Programar" doar dacă e din depozit și nu e rotos (tu poți ajusta)
  const canAsignar = __source !== "rotos" && !(__source === "programados" && badgeKey === "asignado");
  const canProgramar = __source !== "rotos" && __source !== "programados";

  return (
    <div className={styles.card}>
      <button className={styles.closeButton} onClick={onClose}>✕</button>

      <div className={styles.header}>
        <h3 className={styles.title}>{up(matricula_contenedor) || "N/A"}</h3>

        {/* ✅ AICI e fixul: styles[badgeKey] -> depozit/programado/asignado/pendiente/rotos */}
        <span className={`${styles.status} ${styles[badgeKey] || ""}`}>
          {badgeText}
        </span>
      </div>

      <div className={styles.details}>
        <p><strong>Naviera:</strong> {naviera || "N/A"}</p>
        <p><strong>Tip:</strong> {tipo || "N/A"}</p>
        <p><strong>Poziție:</strong> {posicion || "N/A"}</p>
      </div>

      <div className={styles.actionsRow}>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={() => onAsignar?.(container)}
          disabled={!canAsignar}
          title={!canAsignar ? "Deja asignado" : "Asignar a camión"}
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
// src/components/depot/components/DepotTabs.jsx
import styles from "../DepotPage.module.css";

export default function DepotTabs({ active, onChange }) {
  return (
    <div className={styles.depotHeader}>
      {["contenedores", "contenedores_rotos", "contenedores_salidos"].map((t) => (
        <button
          key={t}
          className={`${styles.depotTabButton} ${active === t ? styles.active : ""}`}
          onClick={() => onChange(t)}
        >
          {t === "contenedores"
            ? "En Depósito"
            : t === "contenedores_rotos"
            ? "Defectos"
            : "Salidos"}
        </button>
      ))}
    </div>
  );
}
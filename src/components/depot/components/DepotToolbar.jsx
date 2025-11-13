// src/components/depot/components/DepotToolbar.jsx
import styles from "../DepotPage.module.css";

export default function DepotToolbar({ activeTab, search, setSearch, onAddClick }) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="Buscar por matrícula, naviera, posición, camión, empresa…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {activeTab === "contenedores" && (
        <button className={styles.addButton} onClick={onAddClick}>
          + Añadir contenedor
        </button>
      )}
    </div>
  );
}
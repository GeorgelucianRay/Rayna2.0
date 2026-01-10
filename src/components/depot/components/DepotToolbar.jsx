import styles from "../DepotPage.module.css";

export default function DepotToolbar({ activeTab, search, setSearch, onAddClick }) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.searchBar}>
        <span className={styles.searchIcon} aria-hidden="true">🔎</span>
        <input
          type="text"
          placeholder="Buscar por matrícula, naviera, posición, camión, empresa…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoComplete="off"
          inputMode="search"
        />
      </div>

      {activeTab === "contenedores" && (
        <button type="button" className={styles.addButton} onClick={onAddClick}>
          + Añadir contenedor
        </button>
      )}
    </div>
  );
}
// src/components/GpsPro/ui/Toolbar.jsx
import React from 'react';
import styles from '../GpsPro.module.css';

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" className={styles.icon}>
    <path fill="currentColor" d="M10 18a8 8 0 1 1 5.293-14.293L21 9.414l-1.414 1.414l-1.9-1.9l-1.415 1.414l1.9 1.9L16 13.9L14.6 12.5A7.96 7.96 0 0 1 10 18m0-2a6 6 0 1 0-6-6a6.006 6.006 0 0 0 6 6Z"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" className={styles.icon}>
    <path fill="currentColor" d="M11 11V6h2v5h5v2h-5v5h-2v-5H6v-2z"/>
  </svg>
);

export default function Toolbar({ canEdit, searchTerm, onSearch, onAdd, onPlan, title }) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.actions}>
        <div className={styles.search}>
          <SearchIcon />
          <input
            type="text"
            placeholder="Buscar por nombre…"
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
        {canEdit && (
          <>
            <button className={styles.primary} onClick={onAdd}>
              <PlusIcon /> Añadir {title}
            </button>
            <button
              className={styles.primary}
              onClick={onPlan}
              title="Pedir ruta por API (camión)"
            >
              🚚 Planificar ruta
            </button>
          </>
        )}
      </div>
    </div>
  );
}
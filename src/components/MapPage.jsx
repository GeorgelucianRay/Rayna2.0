import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './MapStandalone.module.css';

const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);

export default function MapPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.pageWrap}>
      <div className={styles.bg} />
      <div className={styles.vignette} />

      {/* top bar */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate('/depot')}>
          <BackIcon /> Depot
        </button>
        <h1 className={styles.title}>Mapa 3D</h1>
        <span className={styles.rightSpacer} />
      </div>

      {/* content */}
      <div className={styles.centerWrap}>
        <div className={styles.card}>
          <div className={styles.iconCircle}>🗺️</div>
          <h2 className={styles.heading}>Estamos trabajando en ello…</h2>
          <p className={styles.sub}>
            La vista de mapa estará disponible pronto. Aquí podrás ver la
            distribución 3D de contenedores en el depósito, filtros por estado,
            y búsqueda rápida.
          </p>

          <div className={styles.actions}>
            <button className={styles.primary} onClick={() => navigate('/depot')}>
              Volver a Depot
            </button>
            <button className={styles.ghost} disabled>
              Vista previa (pronto)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
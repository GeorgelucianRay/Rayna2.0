// src/components/GpsPro/map/MapControls.jsx
import React from 'react';
import styles from '../GpsPro.module.css';

export default function MapControls({
  baseName, setBaseName,
  active, onStartStop,
  precision, setPrecision,
  onSave, saving, pointsCount, distanceM,
}) {
  return (
    <div className={styles.mapToolbar}>
      {/* rând 1: bazemap tabs, centrate */}
      <div className={styles.baseRow}>
        <div className={styles.segmentedWrap}>
          <button
            className={`${styles.segBtn} ${baseName==='normal'?styles.segActive:''}`}
            onClick={()=> setBaseName('normal')}
          >
            Normal
          </button>
          <button
            className={`${styles.segBtn} ${baseName==='satelite'?styles.segActive:''}`}
            onClick={()=> setBaseName('satelite')}
          >
            Satélite
          </button>
          <button
            className={`${styles.segBtn} ${baseName==='black'?styles.segActive:''}`}
            onClick={()=> setBaseName('black')}
          >
            Black
          </button>
        </div>
      </div>

      {/* rând 2: switch + start/stop */}
      <div className={styles.ctrlRow}>
        <label className={styles.switch}>
          <input
            type="checkbox"
            checked={precision}
            onChange={(e)=> setPrecision(e.target.checked)}
          />
          <span /> Precisión (100 m)
        </label>

        <button
          className={`${styles.btn} ${active?styles.btnDanger:styles.btnPrimary}`}
          onClick={onStartStop}
        >
          {active ? 'Detener' : 'Iniciar'}
        </button>
      </div>

      {/* rând 3: guardar ruta — lat & centrat */}
      <div className={styles.saveRow}>
        <button
          className={`${styles.btn} ${styles.btnWide}`}
          onClick={onSave}
          disabled={active || saving || pointsCount < 2}
        >
          {saving ? 'Guardando…' : 'Guardar ruta'}
        </button>
      </div>

      {/* rând 4: KPI-uri */}
      <div className={styles.kpisRow}>
        <span className={styles.kpi}><strong>Puntos:</strong> {pointsCount}</span>
        <span className={styles.kpi}>
          <strong>Distancia:</strong> {Math.round((distanceM||0)/100)/10} km
        </span>
      </div>
    </div>
  );
}
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
      <div className={styles.segmented}>
        <button className={`${styles.segBtn} ${baseName==='normal'?styles.segActive:''}`} onClick={()=> setBaseName('normal')}>Normal</button>
        <button className={`${styles.segBtn} ${baseName==='satelite'?styles.segActive:''}`} onClick={()=> setBaseName('satelite')}>Satélite</button>
        <button className={`${styles.segBtn} ${baseName==='black'?styles.segActive:''}`} onClick={()=> setBaseName('black')}>Black</button>
      </div>

      <div className={styles.controls}>
        <label className={styles.switch}>
          <input type="checkbox" checked={precision} onChange={(e)=> setPrecision(e.target.checked)} />
          <span /> Precisión (100 m)
        </label>

        <button className={`${styles.btn} ${active?styles.btnDanger:styles.btnPrimary}`} onClick={onStartStop}>
          {active ? 'Detener' : 'Iniciar'}
        </button>

        <button className={styles.btn} onClick={onSave} disabled={active || saving || pointsCount < 2}>
          {saving ? 'Guardando…' : 'Guardar ruta'}
        </button>

        <div className={styles.kpis}>
          <span className={styles.kpi}><strong>Puntos:</strong> {pointsCount}</span>
          <span className={styles.kpi}><strong>Distancia:</strong> {Math.round(distanceM/100)/10} km</span>
        </div>
      </div>
    </div>
  );
}
import React, { useEffect, useState } from 'react';
import styles from './SchedulerStandalone.module.css';

export default function SchedulerDetailModal({
  open,
  row,
  role,
  onClose,
  onEliminar,
  onHecho,
  onEditar
}) {
  const [posicion, setPosicion] = useState(row?.posicion || '');

  useEffect(() => {
    setPosicion(row?.posicion || '');
  }, [row]);

  if (!open || !row) return null;

  const isProgramado = row?.source === 'programados' && (row?.estado || 'programado') !== 'pendiente';
  const canEliminar  = (role === 'dispecer' || role === 'admin') && (row?.source === 'programados');
  const canHecho     = (role === 'dispecer' || role === 'admin' || role === 'mecanic') && isProgramado;
  const canEditar    = (role === 'dispecer' || role === 'admin' || role === 'mecanic') && (row?.source === 'programados');

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{row.matricula_contenedor || 'Contenedor'}</h3>
          <button className={styles.closeIcon} onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.inputGroup}>
            <label>Cliente / Naviera</label>
            <div>{row.empresa_descarga || row.naviera || '—'}</div>
          </div>

          <div className={styles.inputGrid}>
            <div className={styles.inputGroup}>
              <label>Fecha</label>
              <div>{row.fecha || '—'}</div>
            </div>
            <div className={styles.inputGroup}>
              <label>Hora</label>
              <div>{row.hora || '—'}</div>
            </div>
          </div>

          {canEditar && (
            <div className={styles.inputGroup}>
              <label>Posición</label>
              <input
                value={posicion}
                onChange={(e) => setPosicion(e.target.value)}
                placeholder="Ej. A-12 / Rampa 3"
              />
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          {canEliminar && (
            <button className={styles.actionGhost} onClick={() => onEliminar(row)}>
              Eliminar
            </button>
          )}
          {canEditar && (
            <button className={styles.actionMini} onClick={() => onEditar(row, posicion)}>
              Editar
            </button>
          )}
          {canHecho && (
            <button className={styles.actionOk} onClick={() => onHecho(row)}>
              Hecho
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
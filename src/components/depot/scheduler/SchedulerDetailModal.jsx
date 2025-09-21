import React, { useEffect, useState } from 'react';
import styles from './SchedulerStandalone.module.css';

export default function SchedulerDetailModal({
  open, row, role, onClose,
  onEliminar, onHecho,
  onEditar,          // (pendiente) – update complet
  onEditarPosicion,  // (programado) – doar poziție
}) {
  const [form, setForm] = useState({
    empresa_descarga: '',
    naviera: '',
    fecha: '',
    hora: '',
    posicion: '',
  });

  useEffect(() => {
    if (!row) return;
    setForm({
      empresa_descarga: row.empresa_descarga || '',
      naviera: row.naviera || '',
      fecha: row.fecha || '',
      hora: row.hora || '',
      posicion: row.posicion || '',
    });
  }, [row]);

  if (!open || !row) return null;

  const isProgramado = row?.source === 'programados' && (row?.estado || 'programado') !== 'pendiente';
  const isPendiente  = row?.source === 'programados' && row?.estado === 'pendiente';

  const canEliminar = (role === 'dispecer' || role === 'admin') && (row?.source === 'programados');
  const canHecho    = (role === 'dispecer' || role === 'admin' || role === 'mecanic') && isProgramado;
  const canEditar   = (role === 'dispecer' || role === 'admin' || role === 'mecanic') && (row?.source === 'programados');

  const handleChange = (k) => (e) => setForm(s => ({ ...s, [k]: e.target.value }));

  const handleSave = async () => {
    if (isPendiente) {
      await onEditar?.(row, {
        empresa_descarga: form.empresa_descarga || null,
        naviera: form.naviera || null,
        fecha: form.fecha || null,
        hora: form.hora || null,
        posicion: form.posicion || null,
      });
    } else {
      await onEditarPosicion?.(row, form.posicion || null);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{row.matricula_contenedor || 'Contenedor'}</h3>
          <button className={styles.closeIcon} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          {isPendiente ? (
            <>
              <div className={styles.inputGroup}>
                <label>Cliente</label>
                <input value={form.empresa_descarga} onChange={handleChange('empresa_descarga')} placeholder="Cliente…" />
              </div>
              <div className={styles.inputGroup}>
                <label>Naviera</label>
                <input value={form.naviera} onChange={handleChange('naviera')} placeholder="Naviera…" />
              </div>
              <div className={styles.inputGrid}>
                <div className={styles.inputGroup}>
                  <label>Fecha</label>
                  <input type="date" value={form.fecha} onChange={handleChange('fecha')} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Hora</label>
                  <input type="time" value={form.hora} onChange={handleChange('hora')} />
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label>Posición</label>
                <input value={form.posicion} onChange={handleChange('posicion')} placeholder="Ej. A-12 / Rampa 3" />
              </div>
            </>
          ) : (
            <div className={styles.inputGroup}>
              <label>Posición</label>
              <input value={form.posicion} onChange={handleChange('posicion')} placeholder="Ej. A-12 / Rampa 3" />
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          {canEliminar && (
            <button className={styles.actionGhost} onClick={() => onEliminar(row)}>Eliminar</button>
          )}
          {canEditar && (
            <button className={styles.actionMini} onClick={handleSave}>Guardar</button>
          )}
          {canHecho && (
            <button className={styles.actionOk} onClick={() => onHecho(row)}>Hecho</button>
          )}
        </div>
      </div>
    </div>
  );
}
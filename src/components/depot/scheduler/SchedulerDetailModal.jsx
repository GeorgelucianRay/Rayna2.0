// src/components/Depot/scheduler/SchedulerDetailModal.jsx
import React, { useEffect, useState } from 'react';
import styles from './SchedulerStandalone.module.css';

/**
 * mode:
 *  - 'en_deposito'  → programar
 *  - 'programado'   → editar (posición/matrícula camión) + Hecho
 *  - 'pendiente'    → completar (empresa/fecha/hora/posición/matrícula)
 */
export default function SchedulerDetailModal({
  open, row, mode, role,
  onClose,
  onProgramarDesdeDeposito,
  onActualizarProgramado,
  onEditarPosicion,
  onHecho,
  onEliminar,
}) {
  const [form, setForm] = useState({
    empresa_descarga: '',
    naviera: '',
    fecha: '',
    hora: '',
    posicion: '',
    matricula_camion: '',
    detalles: '',
  });

  useEffect(() => {
    if (!row) return;
    setForm({
      empresa_descarga: row.empresa_descarga || '',
      naviera: row.naviera || '',
      fecha: row.fecha || '',
      hora: row.hora || '',
      posicion: row.posicion || '',
      matricula_camion: row.matricula_camion || '',
      detalles: row.detalles || '',
    });
  }, [row]);

  if (!open || !row) return null;

  const isProgramado = mode === 'programado';
  const isPendiente  = mode === 'pendiente';
  const isEnDeposito = mode === 'en_deposito';

  const canEliminar = (role === 'dispecer' || role === 'admin') && (row?.source === 'programados');
  const canHecho    = (role === 'dispecer' || role === 'admin' || role === 'mecanic') && isProgramado;
  const canEditar   = (role === 'dispecer' || role === 'admin' || role === 'mecanic');

  // helpers uppercase (NU pentru empresa/detalles)
  const up = (v) => (v || '').toUpperCase();

  const handleChange = (k, uppercase=false) => (e) => {
    const val = e.target.value;
    setForm(s => ({ ...s, [k]: uppercase ? up(val) : val }));
  };

  const handleGuardar = async () => {
    if (isEnDeposito) {
      // programar
      await onProgramarDesdeDeposito?.(row, {
        empresa_descarga: form.empresa_descarga || null,
        fecha: form.fecha || null,
        hora: form.hora || null,
        posicion: form.posicion || null,
        matricula_camion: form.matricula_camion || null,
      });
    } else if (isPendiente) {
      // completar programare (devine programado)
      await onActualizarProgramado?.(row, {
        empresa_descarga: form.empresa_descarga || null,
        fecha: form.fecha || null,
        hora: form.hora || null,
        posicion: form.posicion || null,
        matricula_camion: form.matricula_camion || null,
        estado: 'programado',
      });
    } else if (isProgramado) {
      // editare rapidă (poziție / matricula_camion)
      // dacă vrei update complet, folosește onActualizarProgramado; aici păstrăm editarea poziției drept minim
      await onActualizarProgramado?.(row, {
        posicion: form.posicion || null,
        matricula_camion: form.matricula_camion || null,
      });
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            {isEnDeposito && 'Programar contenedor'}
            {isPendiente  && 'Completar programación'}
            {isProgramado && 'Editar programación'}
          </h3>
          <button className={styles.closeIcon} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          {/* Info de cabecera */}
          <div className={styles.inputGroup}>
            <label>Contenedor</label>
            <input value={row.matricula_contenedor || ''} disabled />
          </div>

          {/* En depósito & Pendiente → câmpuri complete */}
          {(isEnDeposito || isPendiente) && (
            <>
              <div className={styles.inputGroup}>
                <label>Cliente / Empresa</label>
                <input
                  value={form.empresa_descarga}
                  onChange={handleChange('empresa_descarga', false)}
                  placeholder="Cliente…"
                />
              </div>

              <div className={styles.inputGrid}>
                <div className={styles.inputGroup}>
                  <label>Fecha</label>
                  <input type="date" value={form.fecha} onChange={handleChange('fecha', false)} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Hora</label>
                  <input type="time" value={form.hora} onChange={handleChange('hora', false)} />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label>Posición</label>
                <input
                  value={form.posicion}
                  onChange={handleChange('posicion', true)}  // UPPERCASE
                  placeholder="Ej. A-12 / Rampa 3"
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Matrícula camión (opcional)</label>
                <input
                  value={form.matricula_camion}
                  onChange={handleChange('matricula_camion', true)} // UPPERCASE
                  placeholder="Ej. B-1234-XYZ"
                />
              </div>
            </>
          )}

          {/* Programado → edit rapid (poziție + matrícula camión) */}
          {isProgramado && (
            <>
              <div className={styles.inputGroup}>
                <label>Posición</label>
                <input
                  value={form.posicion}
                  onChange={handleChange('posicion', true)} // UPPERCASE
                  placeholder="Ej. A-12 / Rampa 3"
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Matrícula camión (opcional)</label>
                <input
                  value={form.matricula_camion}
                  onChange={handleChange('matricula_camion', true)} // UPPERCASE
                  placeholder="Ej. B-1234-XYZ"
                />
              </div>
            </>
          )}
        </div>

        <div className={styles.modalFooter}>
          {canEliminar && (
            <button className={styles.actionGhost} onClick={() => onEliminar?.(row)}>
              Eliminar
            </button>
          )}

          {canEditar && (
            <button className={styles.actionMini} onClick={handleGuardar}>
              Guardar
            </button>
          )}

          {canHecho && (
            <button className={styles.actionOk} onClick={() => onHecho?.(row)}>
              Hecho
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
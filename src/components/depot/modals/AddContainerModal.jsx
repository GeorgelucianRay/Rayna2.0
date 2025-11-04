// src/components/depot/modals/AddContainerModal.jsx
import React, { useState, useMemo } from 'react';
import Modal from '../../ui/Modal';
import shell from '../../ui/Modal.module.css';
import styles from './AddContainerModal.module.css';

/* ========= Helperi pentru poziție ========= */
function parsePos(s) {
  const t = String(s || '').trim().toUpperCase();
  if (!t) return null;
  if (t === 'PENDIENTE') return { pending: true };
  const m = /^([A-F])(10|[1-9])([A-E])$/.exec(t);
  if (!m) return null;
  const fila = m[1];
  const num = Number(m[2]);
  const nivel = m[3];
  const max = ['A','B','C'].includes(fila) ? 10 : 7;
  if (num < 1 || num > max) return null;
  return { fila, num, nivel };
}
const composePos = ({ fila, num, nivel, pending }) =>
  pending ? 'PENDIENTE' : (fila && num && nivel ? `${fila}${num}${nivel}` : '');
/* ========================================== */

export default function AddContainerModal({ isOpen, onClose, onAdd }) {
  // === Form fields ===
  const [matricula, setMatricula] = useState('');
  const [naviera, setNaviera] = useState('');
  const [tipo, setTipo] = useState('20');
  const [estado, setEstado] = useState('Lleno');
  const [detalles, setDetalles] = useState('');
  const [matCamion, setMatCamion] = useState('');

  // === Selector poziție ===
  const [pending, setPending] = useState(false);
  const [fila, setFila] = useState('A');
  const [num, setNum] = useState(1);
  const [nivel, setNivel] = useState('A');
  const [freeInput, setFreeInput] = useState('');
  const [mode, setMode] = useState('picker'); // 'picker' | 'manual'

  const filas = ['A','B','C','D','E','F'];
  const niveles = ['A','B','C','D','E'];
  const numerosDisponibles = useMemo(() => {
    const max = ['A','B','C'].includes(fila) ? 10 : 7;
    return Array.from({ length: max }, (_, i) => i + 1);
  }, [fila]);

  const composed = useMemo(() => {
    if (mode === 'manual') return (freeInput || '').toUpperCase();
    return composePos({ fila, num, nivel, pending });
  }, [mode, freeInput, fila, num, nivel, pending]);

  const validPos = useMemo(() => {
    const p = parsePos(composed);
    return !!p || composed === 'PENDIENTE';
  }, [composed]);

  // === Submit ===
  const handleAdd = (e) => {
    e?.preventDefault?.();
    if (!validPos) {
      alert('Posición inválida');
      return;
    }

    const nuevo = {
      matricula_contenedor: (matricula || '').toUpperCase(),
      naviera: naviera || null,
      tipo,
      estado,
      detalles: detalles || null,
      matricula_camion: matCamion || null,
      posicion: composed.toUpperCase(),
    };

    onAdd?.(nuevo);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Añadir Contenedor" fillOnMobile>
      {/* Header */}
      <div className={shell.slotHeader}>
        <h3 className={styles.title}>Añadir Contenedor</h3>
      </div>

      {/* Content */}
      <div className={shell.slotContent}>
        <div className={styles.ios}>
          {/* --- Form Fields --- */}
          <div className={styles.grid2}>
            <div className={styles.block}>
              <span className={styles.label}>Matrícula Contenedor</span>
              <input
                className={styles.input}
                value={matricula}
                onChange={(e)=>setMatricula(e.target.value.toUpperCase())}
                style={{ textTransform:'uppercase' }}
                autoCapitalize="characters"
                spellCheck={false}
              />
            </div>
            <div className={styles.block}>
              <span className={styles.label}>Naviera</span>
              <input
                className={styles.input}
                value={naviera}
                onChange={(e)=>setNaviera(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.grid2}>
            <div className={styles.block}>
              <span className={styles.label}>Tipo</span>
              <select className={styles.select} value={tipo} onChange={(e)=>setTipo(e.target.value)}>
                <option>20</option><option>40</option><option>45</option>
              </select>
            </div>
            <div className={styles.block}>
              <span className={styles.label}>Estado</span>
              <select className={styles.select} value={estado} onChange={(e)=>setEstado(e.target.value)}>
                <option>Lleno</option><option>Vacío</option>
              </select>
            </div>
          </div>

          {/* === Selector de posición === */}
          <div className={styles.segment}>
            <button
              type="button"
              className={`${styles.segmentBtn} ${mode==='picker' ? styles.active : ''}`}
              onClick={()=>setMode('picker')}
            >Selector</button>
            <button
              type="button"
              className={`${styles.segmentBtn} ${mode==='manual' ? styles.active : ''}`}
              onClick={()=>setMode('manual')}
            >Manual</button>
          </div>

          {mode === 'picker' ? (
            <>
              <label className={styles.switchRow}>
                <span className={styles.label}>Pendiente</span>
                <label className={styles.switch}>
                  <input type="checkbox" checked={pending} onChange={(e)=>setPending(e.target.checked)} />
                  <span className={styles.switchTrack}></span>
                  <span className={styles.switchThumb}></span>
                </label>
              </label>

              {!pending && (
                <>
                  <div className={styles.block}>
                    <span className={styles.label}>Fila</span>
                    <div className={styles.pills}>
                      {filas.map(f => (
                        <button
                          key={f}
                          type="button"
                          className={`${styles.pill} ${fila===f?styles.pillActive:''}`}
                          onClick={()=>setFila(f)}>{f}</button>
                      ))}
                    </div>
                  </div>

                  <div className={styles.grid2}>
                    <div className={styles.block}>
                      <span className={styles.label}>Número</span>
                      <select className={styles.select} value={num} onChange={(e)=>setNum(Number(e.target.value))}>
                        {numerosDisponibles.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div className={styles.block}>
                      <span className={styles.label}>Nivel</span>
                      <select className={styles.select} value={nivel} onChange={(e)=>setNivel(e.target.value)}>
                        {niveles.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div className={styles.preview}>
                Posición: <strong>{composed || '—'}</strong>
              </div>
            </>
          ) : (
            <div className={styles.block}>
              <span className={styles.label}>Posición (manual)</span>
              <input
                className={styles.input}
                value={freeInput}
                onChange={(e)=>setFreeInput(e.target.value.toUpperCase())}
                placeholder="Ej: A1A o PENDIENTE"
                style={{ textTransform:'uppercase' }}
              />
            </div>
          )}

          <div className={styles.block}>
            <span className={styles.label}>Detalles</span>
            <textarea
              className={styles.area}
              rows={3}
              value={detalles}
              onChange={(e)=>setDetalles(e.target.value)}
            />
          </div>

          <div className={styles.block}>
            <span className={styles.label}>Matrícula Camión (opcional)</span>
            <input
              className={styles.input}
              value={matCamion}
              onChange={(e)=>setMatCamion(e.target.value.toUpperCase())}
              style={{ textTransform:'uppercase' }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={shell.slotFooter}>
        <div className={styles.actions}>
          <button type="button" className={styles.btn} onClick={onClose}>Cancelar</button>
          <button
            type="button"
            className={`${styles.btn} ${styles.primary}`}
            onClick={handleAdd}
            disabled={!validPos}
          >Guardar</button>
        </div>
      </div>
    </Modal>
  );
}
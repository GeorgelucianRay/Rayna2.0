// src/components/depot/modals/AddContainerModal.jsx
import React, { useState, useMemo } from 'react';
import Modal from '../../ui/Modal';
import shell from '../../ui/Modal.module.css';
import styles from './AddContainerModal.module.css';

/* ===== Helpers pentru poziție ===== */
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
  pending ? 'PENDIENTE' : `${fila}${num}${nivel}`;
/* ================================= */

export default function AddContainerModal({
  isOpen,
  onClose,
  onAdd,
  validatePosition,   // <- primit din DepotPage
  slotMap,            // <- pentru viitor (minimap 3D)
}) {

  /* === FORM STATE === */
  const [matricula, setMatricula] = useState('');
  const [naviera, setNaviera] = useState('');
  const [tipo, setTipo] = useState('20');
  const [estado, setEstado] = useState('Lleno');
  const [detalles, setDetalles] = useState('');
  const [matCamion, setMatCamion] = useState('');

  const [isBroken, setIsBroken] = useState(false);

  /* === POSIȚIE === */
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
    if (mode === 'manual')
      return (freeInput || '').toUpperCase();
    return composePos({ fila, num, nivel, pending });
  }, [fila, num, nivel, pending, mode, freeInput]);

  const validPos = useMemo(() => {
    const p = parsePos(composed);
    return p || composed === 'PENDIENTE';
  }, [composed]);

  const canSave = useMemo(() => {
    const okMat = (matricula || '').trim().length >= 4;
    return okMat && validPos;
  }, [matricula, validPos]);

  /* === RESET FORM (după Guardar) === */
  const resetForm = () => {
    setMatricula('');
    setNaviera('');
    setTipo('20');
    setEstado('Lleno');
    setDetalles('');
    setMatCamion('');
    setIsBroken(false);

    setPending(false);
    setFila('A');
    setNum(1);
    setNivel('A');
    setFreeInput('');
    setMode('picker');
  };

  /* === SUBMIT === */
  const handleAdd = async () => {
    if (!canSave) {
      alert('Introduce la matrícula y una posición válida.');
      return;
    }

    const pos = (composed || '').toUpperCase();

    // 💥 verificare coliziune
    if (validatePosition && pos !== 'PENDIENTE') {
      const res = await validatePosition(pos, tipo, null);
      if (!res.ok) {
        const { matricula_contenedor, posicion } = res.conflict;
        alert(`Lo siento, la posición está ocupada por: ${matricula_contenedor} (${posicion})`);
        return; // ❌ nu închidem modalul
      }
    }

    /* payload real */
    const base = {
      matricula_contenedor: matricula.toUpperCase(),
      naviera: naviera || null,
      tipo,
      posicion: pos,
      matricula_camion: matCamion.toUpperCase() || null,
    };

    const data = isBroken
      ? { ...base, detalles: detalles || null }
      : { ...base, estado, detalles: null };

    try {
      await onAdd?.(data, isBroken);
      resetForm();
      onClose?.();
    } catch (err) {
      console.error(err);
      alert('Error al añadir contenedor.');
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Añadir Contenedor" fillOnMobile>
      {/* HEADER */}
      <div className={shell.slotHeader}>
        <h3 className={styles.title}>Añadir Contenedor</h3>
      </div>

      {/* BODY */}
      <div className={shell.slotContent}>
        <div className={styles.ios}>

          {/* TOT FORMULARUL TĂU EXACT (nicio modificare de UI) */}
          {/* --- MATRÍCULA + NAVIERA --- */}
          <div className={styles.grid2}>
            <div className={styles.block}>
              <span className={styles.label}>Matrícula Contenedor</span>
              <input className={styles.input} value={matricula}
                onChange={(e) => setMatricula(e.target.value.toUpperCase())}
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            <div className={styles.block}>
              <span className={styles.label}>Naviera</span>
              <input className={styles.input} value={naviera}
                onChange={(e) => setNaviera(e.target.value)}
              />
            </div>
          </div>

          {/* --- TIPO + ESTADO --- */}
          <div className={styles.grid2}>
            <div className={styles.block}>
              <span className={styles.label}>Tipo</span>
              <select className={styles.select} value={tipo}
                onChange={(e) => setTipo(e.target.value)}>
                <option>20</option>
                <option>40</option>
                <option>45</option>
              </select>
            </div>

            {!isBroken && (
              <div className={styles.block}>
                <span className={styles.label}>Estado</span>
                <select className={styles.select} value={estado}
                  onChange={(e) => setEstado(e.target.value)}>
                  <option>Lleno</option>
                  <option>Vacío</option>
                </select>
              </div>
            )}
          </div>

          {/* --- ROTO --- */}
          <label className={styles.switchRow}>
            <span className={styles.label}>Marcar como roto</span>
            <label className={styles.switch}>
              <input type="checkbox" checked={isBroken} onChange={(e)=> setIsBroken(e.target.checked)} />
              <span className={styles.switchTrack}></span>
              <span className={styles.switchThumb}></span>
            </label>
          </label>

          {/* --- SELECTOR POSICIÓN --- */}
          <div className={styles.segment}>
            <button type="button"
              className={`${styles.segmentBtn} ${mode === 'picker' ? styles.active : ''}`}
              onClick={() => setMode('picker')}>Selector</button>

            <button type="button"
              className={`${styles.segmentBtn} ${mode === 'manual' ? styles.active : ''}`}
              onClick={() => setMode('manual')}>Manual</button>
          </div>

          {/* Picker sau manual */}
          {mode === 'picker' ? (
            <>
              <label className={styles.switchRow}>
                <span className={styles.label}>Pendiente</span>
                <label className={styles.switch}>
                  <input type="checkbox" checked={pending}
                    onChange={(e)=> setPending(e.target.checked)}
                  />
                  <span className={styles.switchTrack}></span>
                  <span className={styles.switchThumb}></span>
                </label>
              </label>

              {!pending && (
                <>
                  <div className={styles.block}>
                    <span className={styles.label}>Fila</span>
                    <div className={styles.pills}>
                      {filas.map((f)=>(
                        <button key={f} type="button"
                          className={`${styles.pill} ${fila === f ? styles.pillActive : ''}`}
                          onClick={()=> setFila(f)}>
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={styles.grid2}>
                    <div className={styles.block}>
                      <span className={styles.label}>Número</span>
                      <select className={styles.select} value={num}
                        onChange={(e)=> setNum(Number(e.target.value))}>
                        {numerosDisponibles.map((n)=>(
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.block}>
                      <span className={styles.label}>Nivel</span>
                      <select className={styles.select} value={nivel}
                        onChange={(e)=> setNivel(e.target.value)}>
                        {niveles.map((n)=>(
                          <option key={n} value={n}>{n}</option>
                        ))}
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
              <input className={styles.input}
                value={freeInput}
                onChange={(e)=> setFreeInput(e.target.value.toUpperCase())}
                placeholder="Ej: A1A o PENDIENTE"
                style={{ textTransform: 'uppercase' }}
              />
            </div>
          )}

          {/* --- DETALLES --- */}
          {isBroken && (
            <div className={styles.block}>
              <span className={styles.label}>Detalles (defecto)</span>
              <textarea className={styles.area} rows={3}
                value={detalles}
                onChange={(e)=> setDetalles(e.target.value)}
              />
            </div>
          )}

          {/* --- MATRÍCULA CAMIÓN --- */}
          <div className={styles.block}>
            <span className={styles.label}>Matrícula Camión (opcional)</span>
            <input className={styles.input}
              value={matCamion}
              onChange={(e)=> setMatCamion(e.target.value.toUpperCase())}
              style={{ textTransform: 'uppercase' }}
            />
          </div>

        </div>
      </div>

      {/* FOOTER */}
      <div className={shell.slotFooter}>
        <div className={styles.actions}>
          <button type="button" className={styles.btn} onClick={() => { resetForm(); onClose(); }}>
            Cancelar
          </button>
          <button type="button"
            className={`${styles.btn} ${styles.primary}`}
            onClick={handleAdd}
            disabled={!canSave}>
            Guardar
          </button>
        </div>
      </div>
    </Modal>
  );
}
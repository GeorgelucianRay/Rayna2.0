// src/components/depot/modals/EditContainerModal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../../ui/Modal';
import shell from '../../ui/Modal.module.css';
import styles from './AddContainerModal.module.css'; // folosim același CSS
import { useAuth } from '../../../AuthContext';

/* ===== Helper poziție ===== */
function parsePos(s) {
  const t = String(s || '').trim().toUpperCase();
  if (!t) return null;
  if (t === 'PENDIENTE') return { pending: true };
  const m = /^([A-F])(10|[1-9])([A-E])$/.exec(t);
  if (!m) return null;
  const fila = m[1];
  const num = Number(m[2]);
  const nivel = m[3];
  const max = ['A', 'B', 'C'].includes(fila) ? 10 : 7;
  if (num < 1 || num > max) return null;
  return { fila, num, nivel };
}
const composePos = ({ fila, num, nivel, pending }) =>
  pending ? 'PENDIENTE' : `${fila}${num}${nivel}`;
/* ========================================== */

export default function EditContainerModal({
  isOpen,
  onClose,
  onSubmit,
  editPosicion,
  setEditPosicion,
  selectedContainer,
  validatePosition // 🔥 NOU
}) {
  const { profile } = useAuth();
  const role = profile?.role || 'guest';
  const isPrivileged =
    role === 'admin' || role === 'dispecer' || /dispatcher/i.test(role);
  const isMechanic = /mecanic|mecánico/i.test(role);

  // === Form fields ===
  const [matricula, setMatricula] = useState('');
  const [naviera, setNaviera] = useState('');
  const [tipo, setTipo] = useState('20');
  const [estado, setEstado] = useState('Lleno');
  const [detalles, setDetalles] = useState('');
  const [matCamion, setMatCamion] = useState('');
  const [isBroken, setIsBroken] = useState(false);

  // === Selector poziție ===
  const [pending, setPending] = useState(false);
  const [fila, setFila] = useState('A');
  const [num, setNum] = useState(1);
  const [nivel, setNivel] = useState('A');
  const [freeInput, setFreeInput] = useState('');
  const [mode, setMode] = useState('picker');

  const filas = ['A','B','C','D','E','F'];
  const niveles = ['A','B','C','D','E'];

  const numerosDisponibles = useMemo(() => {
    const max = ['A','B','C'].includes(fila) ? 10 : 7;
    return Array.from({ length: max }, (_, i) => i + 1);
  }, [fila]);

  const composed = useMemo(() => {
    if (mode === 'manual') return (freeInput || '').toUpperCase();
    return composePos({ fila, num, nivel, pending });
  }, [fila, num, nivel, pending, mode, freeInput]);

  const validPos = useMemo(() => {
    const p = parsePos(composed);
    return p || composed === 'PENDIENTE';
  }, [composed]);

  /* === initialize on open === */
  useEffect(() => {
    if (!isOpen || !selectedContainer) return;

    setMatricula(selectedContainer.matricula_contenedor || '');
    setNaviera(selectedContainer.naviera || '');
    setTipo(String(selectedContainer.tipo || '20'));
    setEstado(selectedContainer.estado || 'Lleno');
    setDetalles(selectedContainer.detalles || '');
    setMatCamion(selectedContainer.matricula_camion || '');
    setIsBroken(!!selectedContainer.detalles);

    const parsed = parsePos(editPosicion || selectedContainer.posicion || '');
    if (parsed?.pending) {
      setPending(true);
      setMode('picker');
      setFreeInput('PENDIENTE');
      setFila('A'); setNum(1); setNivel('A');
    } else if (parsed) {
      setPending(false);
      setFila(parsed.fila);
      setNum(parsed.num);
      setNivel(parsed.nivel);
      setFreeInput(composePos(parsed));
      setMode('picker');
    } else {
      const raw = (editPosicion || selectedContainer.posicion || '').toUpperCase();
      setPending(raw === 'PENDIENTE');
      setFreeInput(raw);
      setMode('manual');
    }

  }, [isOpen, selectedContainer, editPosicion]);

  /* === SAVE === */
  const handleSave = async (e) => {
    e.preventDefault();

    if (!validPos) {
      alert('Posición inválida');
      return;
    }

    const newPos = composed.toUpperCase();
    const oldPos = (selectedContainer.posicion || '').toUpperCase();
    const tipoContainer = selectedContainer.tipo || '20';
    const matriculaContainer = (selectedContainer.matricula_contenedor || '').toUpperCase();

    // 🔥 verificare coliziuni (dacă s-a schimbat poziția)
    if (newPos !== oldPos && validatePosition) {
      const res = await validatePosition(newPos, tipoContainer, matriculaContainer);
      if (!res.ok) {
        const { matricula_contenedor, posicion } = res.conflict;
        alert(`Lo siento, la posición está ocupada por ${matricula_contenedor} (${posicion})`);
        return; // NU închidem modalul
      }
    }

    const patch = {
      posicion: newPos,
      matricula_contenedor: matricula.toUpperCase(),
      naviera: naviera || null,
      tipo: tipo,
      matricula_camion: matCamion || null,
    };

    if (isBroken) {
      patch.detalles = detalles || null;
      patch.estado = null;
    } else {
      patch.estado = estado;
      patch.detalles = null;
    }

    setEditPosicion(newPos);
    onSubmit(e, patch);
  };

  if (!isOpen || !selectedContainer) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Editar Contenedor" fillOnMobile>
      {/* HEADER */}
      <div className={shell.slotHeader}>
        <h3 className={styles.title}>Editar Contenedor</h3>
        <p className={styles.subtitle}>
          {(selectedContainer.matricula_contenedor || '').toUpperCase()}
        </p>
      </div>

      {/* BODY */}
      <div className={shell.slotContent}>
        <div className={styles.ios}>

          {/* === Admin / Dispecer pot edita TOT === */}
          {isPrivileged && (
            <>
              <div className={styles.grid2}>
                <div className={styles.block}>
                  <span className={styles.label}>Matrícula</span>
                  <input className={styles.input}
                    value={matricula}
                    onChange={(e)=> setMatricula(e.target.value.toUpperCase())}
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>

                <div className={styles.block}>
                  <span className={styles.label}>Naviera</span>
                  <input className={styles.input}
                    value={naviera}
                    onChange={(e)=> setNaviera(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.grid2}>
                <div className={styles.block}>
                  <span className={styles.label}>Tipo</span>
                  <select className={styles.select}
                    value={tipo}
                    onChange={(e)=> setTipo(e.target.value)}>
                    <option>20</option>
                    <option>40</option>
                    <option>45</option>
                  </select>
                </div>

                {!isBroken && (
                  <div className={styles.block}>
                    <span className={styles.label}>Estado</span>
                    <select className={styles.select}
                      value={estado}
                      onChange={(e)=> setEstado(e.target.value)}>
                      <option>Lleno</option>
                      <option>Vacío</option>
                    </select>
                  </div>
                )}
              </div>

              <label className={styles.switchRow}>
                <span className={styles.label}>Marcar como roto</span>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={isBroken}
                    onChange={(e)=> setIsBroken(e.target.checked)}
                  />
                  <span className={styles.switchTrack}></span>
                  <span className={styles.switchThumb}></span>
                </label>
              </label>
            </>
          )}

          {/* === MECANICUL poate edita doar poziția === */}
          {isMechanic && (
            <div className={styles.blockInfo}>
              <p>Modo mecánico: solo puedes cambiar la posición.</p>
            </div>
          )}

          {/* === SELECTOR POZIȚIE === */}
          <div className={styles.segment}>
            <button type="button"
              className={`${styles.segmentBtn} ${mode === 'picker' ? styles.active : ''}`}
              onClick={()=> setMode('picker')}>
              Selector
            </button>

            <button type="button"
              className={`${styles.segmentBtn} ${mode === 'manual' ? styles.active : ''}`}
              onClick={()=> setMode('manual')}>
              Manual
            </button>
          </div>

          {/* PICKER */}
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
            /* MANUAL */
            <div className={styles.block}>
              <span className={styles.label}>Posición (manual)</span>
              <input className={styles.input}
                value={freeInput}
                onChange={(e)=> setFreeInput(e.target.value.toUpperCase())}
                style={{ textTransform:'uppercase' }}
                placeholder="Ej: A1A o PENDIENTE"
              />
            </div>
          )}

          {isBroken && (
            <div className={styles.block}>
              <span className={styles.label}>Detalles</span>
              <textarea className={styles.area}
                rows={3}
                value={detalles}
                onChange={(e)=> setDetalles(e.target.value)}
              />
            </div>
          )}

          {isPrivileged && (
            <div className={styles.block}>
              <span className={styles.label}>Matrícula Camión</span>
              <input className={styles.input}
                value={matCamion}
                onChange={(e)=> setMatCamion(e.target.value.toUpperCase())}
                style={{ textTransform:'uppercase' }}
              />
            </div>
          )}

        </div>
      </div>

      {/* FOOTER */}
      <div className={shell.slotFooter}>
        <div className={styles.actions}>
          <button className={styles.btn} onClick={onClose}>Cancelar</button>

          <button
            className={`${styles.btn} ${styles.primary}`}
            disabled={!validPos}
            onClick={handleSave}
          >
            Guardar
          </button>
        </div>
      </div>

    </Modal>
  );
}
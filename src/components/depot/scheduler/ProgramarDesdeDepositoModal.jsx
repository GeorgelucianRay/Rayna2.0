import React, { useEffect, useMemo, useState } from 'react';
import styles from './SchedulerStandalone.module.css';
import { supabase } from '../../../supabaseClient';

export default function ProgramarDesdeDepositoModal({
  open,
  onClose,
  onProgramar, // async (containerRow, payload) => void
}) {
  const [term, setTerm] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState(null);

  // form
  const [empresa_descarga, setEmpresa] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [posicion, setPosicion] = useState('');
  const [matricula_camion, setMatriculaCamion] = useState('');
  const [estado, setEstado] = useState('programado'); // programado | pendiente

  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      setLoading(true);
      let q = supabase
        .from('contenedores')
        .select('id, created_at, matricula_contenedor, naviera, tipo, posicion')
        .order('created_at', { ascending: false })
        .limit(100);
      if (term) q = q.ilike('matricula_contenedor', `%${term}%`);
      const { data, error } = await q;
      if (!alive) return;
      if (error) {
        console.error(error);
        setItems([]);
      } else {
        setItems(data || []);
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [open, term]);

  useEffect(() => {
    if (!open) {
      setTerm('');
      setItems([]);
      setPicked(null);
      setEmpresa('');
      setFecha('');
      setHora('');
      setPosicion('');
      setMatriculaCamion('');
      setEstado('programado');
    }
  }, [open]);

  const canSave = useMemo(() => {
    if (!picked) return false;
    if (estado === 'programado') {
      return !!empresa_descarga && !!fecha && !!hora;
    }
    return true; // pendiente permite parțial
  }, [picked, empresa_descarga, fecha, hora, estado]);

  const handleSave = async () => {
    if (!picked) return;
    await onProgramar?.(picked, {
      empresa_descarga: empresa_descarga || null,
      fecha: fecha || null,
      hora: hora || null,
      posicion: (posicion || '').toUpperCase() || null,
      matricula_camion: (matricula_camion || '').toUpperCase() || null,
      estado, // 'programado' | 'pendiente'
    });
  };

  if (!open) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e)=>e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Programar desde En Depósito</h3>
          <button className={styles.closeIcon} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          {!picked && (
            <>
              <div className={styles.inputGroup}>
                <label>Buscar por matrícula</label>
                <input
                  placeholder="Ej. MSKU1234567"
                  value={term}
                  onChange={(e)=> setTerm(e.target.value)}
                />
              </div>

              <div className={styles.card} style={{ maxHeight: 280, overflow: 'auto' }}>
                {loading ? (
                  <p style={{ margin:0, opacity:.85 }}>Cargando…</p>
                ) : items.length === 0 ? (
                  <p style={{ margin:0 }}>No hay contenedores en depósito (o no coinciden con la búsqueda).</p>
                ) : (
                  <ul className={styles.list}>
                    {items.map(it => (
                      <li
                        key={it.id}
                        className={styles.item}
                        style={{ cursor:'pointer' }}
                        onClick={()=> setPicked(it)}
                        title="Seleccionar contenedor"
                      >
                        <div className={styles.itemTop}>
                          <span className={styles.dot}/>
                          <span className={styles.cid}>{it.matricula_contenedor}</span>
                          <span className={`${styles.badge} ${styles.badgeWarn}`}>En depósito</span>
                        </div>
                        <div className={styles.meta}>
                          <span className={styles.cliente}>{it.naviera || '—'}</span>
                          {it.posicion && <span className={styles.fecha}>{it.posicion}</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {picked && (
            <>
              <div className={styles.inputGroup}>
                <label>Contenedor</label>
                <input value={(picked.matricula_contenedor || '').toUpperCase()} disabled />
              </div>

              <div className={styles.inputGroup}>
                <label>Estado de programación</label>
                <select value={estado} onChange={(e)=> setEstado(e.target.value)}>
                  <option value="programado">Programado</option>
                  <option value="pendiente">Pendiente</option>
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label>Cliente / Empresa</label>
                <input
                  value={empresa_descarga || ''}
                  onChange={(e)=> setEmpresa(e.target.value)} // fără uppercase
                  placeholder="Cliente…"
                />
              </div>

              <div className={styles.inputGrid}>
                <div className={styles.inputGroup}>
                  <label>Fecha</label>
                  <input type="date" value={fecha || ''} onChange={(e)=> setFecha(e.target.value)} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Hora</label>
                  <input type="time" value={hora || ''} onChange={(e)=> setHora(e.target.value)} />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label>Posición</label>
                <input
                  value={posicion}
                  onChange={(e)=> setPosicion((e.target.value || '').toUpperCase())}
                  placeholder="Ej. A-12 / Rampa 3"
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Matrícula camión (opcional)</label>
                <input
                  value={matricula_camion}
                  onChange={(e)=> setMatriculaCamion((e.target.value || '').toUpperCase())}
                  placeholder="Ej. B-1234-XYZ"
                />
              </div>
            </>
          )}
        </div>

        <div className={styles.modalFooter}>
          {picked ? (
            <>
              <button className={styles.actionGhost} onClick={()=> setPicked(null)}>Volver a la lista</button>
              <button className={styles.actionMini} onClick={handleSave} disabled={!canSave}>Guardar</button>
            </>
          ) : (
            <button className={styles.actionGhost} onClick={onClose}>Cerrar</button>
          )}
        </div>
      </div>
    </div>
  );
}
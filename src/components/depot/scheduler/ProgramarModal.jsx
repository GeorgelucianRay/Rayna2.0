import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import styles from './SchedulerStandalone.module.css';

export default function ProgramarPickerModal({ open, onClose, onPick }) {
  const [term, setTerm] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      setLoading(true);
      let q = supabase
        .from('contenedores')
        .select('id, created_at, matricula_contenedor, naviera, tipo, posicion, estado')
        .order('created_at', { ascending: false })
        .limit(100);
      if (term) q = q.ilike('matricula_contenedor', `%${term}%`);
      const { data, error } = await q;
      if (!alive) return;
      if (error) { console.error(error); setItems([]); } else { setItems(data || []); }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [open, term]);

  if (!open) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e)=>e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Elegir contenedor (En Depósito)</h3>
          <button className={styles.closeIcon} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.inputGroup}>
            <label>Buscar por matrícula</label>
            <div className={styles.search}>
              <input
                placeholder="Ej: MSKU1234567"
                value={term}
                onChange={(e)=> setTerm(e.target.value)}
              />
            </div>
          </div>

          <ul className={styles.list}>
            {loading && <li className={styles.muted}>Cargando…</li>}
            {!loading && items.length === 0 && <li className={styles.muted}>No hay resultados.</li>}
            {!loading && items.map(it => (
              <li key={it.id} className={styles.item} onClick={()=> onPick?.(it)} style={{cursor:'pointer'}}>
                <div className={styles.itemTop}>
                  <span className={styles.dot} />
                  <span className={styles.cid}>{it.matricula_contenedor}</span>
                  <span className={styles.badge}>{it.naviera || '—'}</span>
                </div>
                <div className={styles.meta}>
                  <span>Tipo: {it.tipo || '—'}</span>
                  {it.posicion && <span>Posición: {it.posicion}</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.actionGhost} onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
import React, { useEffect, useState } from 'react';
import styles from './GpsPro.module.css';
import { supabase } from '../../supabaseClient';

export default function DestinationPicker({ onClose, onPick }) {
  const [tab, setTab] = useState('parkings'); // parkings | servicios | terminale
  const [term, setTerm] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const tableFor = (t) => t === 'parkings' ? 'gps_parkings' :
                         t === 'servicios' ? 'gps_servicios' : 'gps_terminale';

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const table = tableFor(tab);
      const cols = 'id, nombre, coordenadas, direccion';
      let q = supabase.from(table).select(cols).order('created_at', { ascending: false }).limit(50);
      if (term) q = q.ilike('nombre', `%${term}%`);
      const { data, error } = await q;
      if (!alive) return;
      if (error) { console.error(error); setItems([]); }
      else setItems(data || []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [tab, term]);

  const pick = (it) => {
    if (!it?.coordenadas) { alert('Este destino no tiene coordenadas.'); return; }
    onPick({
      type: tab,
      id: it.id,
      label: `${it.nombre}`,
      coords: it.coordenadas, // "lat,lng"
    });
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e)=>e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Elegir destino</h3>
          <button className={styles.iconBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.destTabs}>
            <button className={`${styles.tab} ${tab==='parkings'?styles.tabActive:''}`} onClick={()=> setTab('parkings')}>Parkings</button>
            <button className={`${styles.tab} ${tab==='servicios'?styles.tabActive:''}`} onClick={()=> setTab('servicios')}>Servicios</button>
            <button className={`${styles.tab} ${tab==='terminale'?styles.tabActive:''}`} onClick={()=> setTab('terminale')}>Terminales</button>
          </div>

          <div className={styles.search} style={{marginTop:8}}>
            <input type="text" placeholder="Buscar por nombre…" value={term} onChange={(e)=> setTerm(e.target.value)} />
          </div>

          {loading ? (
            <div className={styles.loading}>Cargando…</div>
          ) : (
            <ul className={styles.destList}>
              {items.length === 0 && <li className={styles.muted}>No hay resultados.</li>}
              {items.map(it => (
                <li key={it.id}>
                  <button className={styles.destItem} onClick={()=> pick(it)}>
                    <div className={styles.destTitle}>{it.nombre}</div>
                    <div className={styles.destSub}>{it.direccion || it.coordenadas}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.btn} onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import styles from './GpsPro.module.css';

const TABS = ['clientes','parkings','servicios','terminale'];

function List({ table, term, onPick }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const run = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from(`gps_${table}`)
      .select('id,nombre,coordenadas,detalles')
      .ilike('nombre', term ? `%${term}%` : '%')
      .order('nombre', { ascending: true })
      .limit(300);
    setItems(error ? [] : (data || []));
    setLoading(false);
  }, [table, term]);

  useEffect(() => { run(); }, [run]);

  if (loading) return <div className={styles.loading}>Cargando…</div>;

  return (
    <ul className={styles.destList}>
      {items.map(it => (
        <li key={it.id}>
          <button
            className={styles.destItem}
            onClick={() => onPick({ type: table, id: it.id, label: it.nombre, coords: it.coordenadas })}
          >
            <div className={styles.destTitle}>{it.nombre}</div>
            {it.detalles && <div className={styles.destSub}>{it.detalles}</div>}
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function RouteWizard({ onClose, onDone }) {
  const [step, setStep] = useState(1); // 1=origen 2=destino
  const [tab, setTab] = useState('clientes');
  const [term, setTerm] = useState('');
  const [origin, setOrigin] = useState(null);
  const [dest, setDest] = useState(null);

  const title = step === 1 ? 'Elegir origen' : 'Elegir destino';

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e)=> e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{title}</h3>
          <button className={styles.iconBtn} onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.destTabs}>
            {TABS.map(t => (
              <button
                key={t}
                className={`${styles.navBtn} ${tab===t?styles.navBtnActive:''}`}
                onClick={()=> setTab(t)}
              >
                {t.charAt(0).toUpperCase()+t.slice(1)}
              </button>
            ))}
          </div>

          <div className={styles.search} style={{marginTop:8}}>
            <input placeholder="Buscar por nombre…" value={term} onChange={(e)=> setTerm(e.target.value)} />
          </div>

          <List table={tab} term={term} onPick={(val)=>{
            if (step===1) setOrigin(val); else setDest(val);
          }}/>
        </div>

        <div className={styles.modalFooter} style={{justifyContent:'space-between'}}>
          <div style={{color:'var(--muted)'}}>
            {origin ? <>Origen: <strong style={{color:'var(--text)'}}>{origin.label}</strong></> : '—'}
            {dest && <> · Destino: <strong style={{color:'var(--text)'}}>{dest.label}</strong></>}
          </div>
          <div style={{display:'flex', gap:8}}>
            {step===2 && <button className={styles.btn} onClick={()=> setStep(1)}>Atrás</button>}
            {step===1 && (
              <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={!origin} onClick={()=> setStep(2)}>
                Siguiente →
              </button>
            )}
            {step===2 && (
              <button className={`${styles.btn} ${styles.btnPrimary}`}
                disabled={!origin || !dest}
                onClick={()=> onDone(origin, dest)}
              >
                Crear ruta (API)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
// src/components/GpsPro/RouteWizard.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import styles from './GpsPro.module.css';

const TABS = ['clientes','parkings','servicios','terminale'];

function List({table, term, onPick}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const cols = 'id,nombre,coordenadas,detalles';
    const { data, error } = await supabase
      .from(table)
      .select(cols)
      .ilike('nombre', term ? `%${term}%` : '%')
      .order('nombre', { ascending: true })
      .limit(200);
    setItems(error ? [] : (data||[]));
    setLoading(false);
  }, [table, term]);

  useEffect(()=>{ fetch(); }, [fetch]);

  if (loading) return <div className={styles.loading}>Cargando…</div>;

  return (
    <ul className={styles.destList}>
      {items.map(it => (
        <li key={it.id}>
          <button className={styles.destItem}
            onClick={() => onPick({
              type: table.replace('gps_', ''), // 'clientes' etc
              id: it.id,
              label: it.nombre,
              coords: it.coordenadas,
            })}
          >
            <div className={styles.destTitle}>{it.nombre}</div>
            {it.detalles && <div className={styles.destSub}>{it.detalles}</div>}
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function RouteWizard({
  onClose,
  defaultOrigin,   // opțional: { type, id, label, coords } sau 'gps' pentru „mi ubicación”
  onDone           // (origin,destination) => void
}) {
  const [step, setStep] = useState(1); // 1=origen, 2=destino
  const [originMode, setOriginMode] = useState(defaultOrigin ? 'preset' : 'gps'); // 'gps' | 'preset' | 'manual'
  const [origin, setOrigin] = useState(defaultOrigin || null);
  const [tab, setTab] = useState('clientes');
  const [term, setTerm] = useState('');
  const [dest, setDest] = useState(null);

  useEffect(() => {
    if (originMode === 'gps') {
      setOrigin({ type:'gps', id:null, label:'Mi ubicación', coords:null });
    }
  }, [originMode]);

  const title = step===1 ? 'Elegir origen' : 'Elegir destino';

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e)=> e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{title}</h3>
          <button className={styles.iconBtn} onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className={styles.modalBody}>
          {step===1 && (
            <>
              <div className={styles.destTabs}>
                <button
                  className={`${styles.navBtn} ${originMode==='gps'?styles.navBtnActive:''}`}
                  onClick={()=>{ setOriginMode('gps'); setOrigin({ type:'gps', label:'Mi ubicación' }); }}
                >Mi ubicación</button>
                <button
                  className={`${styles.navBtn} ${originMode==='preset'?styles.navBtnActive:''}`}
                  onClick={()=> setOriginMode('preset')}
                >Elegir de listas</button>
              </div>

              {originMode==='preset' && (
                <>
                  <div className={styles.destTabs}>
                    {TABS.map(t => (
                      <button key={t}
                        className={`${styles.navBtn} ${tab===t?styles.navBtnActive:''}`}
                        onClick={()=> setTab(t)}
                      >
                        {t.charAt(0).toUpperCase()+t.slice(1)}
                      </button>
                    ))}
                  </div>

                  <div className={styles.search} style={{marginTop:8}}>
                    <input placeholder="Buscar por nombre…" value={term} onChange={e=> setTerm(e.target.value)} />
                  </div>

                  <List table={`gps_${tab}`} term={term} onPick={(o) => setOrigin(o)} />
                </>
              )}
            </>
          )}

          {step===2 && (
            <>
              <div className={styles.destTabs}>
                {TABS.map(t => (
                  <button key={t}
                    className={`${styles.navBtn} ${tab===t?styles.navBtnActive:''}`}
                    onClick={()=> setTab(t)}
                  >
                    {t.charAt(0).toUpperCase()+t.slice(1)}
                  </button>
                ))}
              </div>

              <div className={styles.search} style={{marginTop:8}}>
                <input placeholder="Buscar por nombre…" value={term} onChange={e=> setTerm(e.target.value)} />
              </div>

              <List table={`gps_${tab}`} term={term} onPick={(d) => setDest(d)} />
            </>
          )}
        </div>

        <div className={styles.modalFooter} style={{justifyContent:'space-between'}}>
          <div style={{color:'var(--muted)'}}>
            {origin && step===2 && (
              <>Origen: <strong style={{color:'var(--text)'}}>{origin.label}</strong></>
            )}
          </div>

          <div style={{display:'flex', gap:8}}>
            {step===2 ? (
              <>
                <button className={styles.btn} onClick={()=> setStep(1)}>Atrás</button>
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  disabled={!dest}
                  onClick={() => onDone(origin, dest)}
                >
                  Crear ruta
                </button>
              </>
            ) : (
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                disabled={!origin}
                onClick={()=> setStep(2)}
              >
                Siguiente →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import styles from './SchedulerStandalone.module.css';

export default function ProgramarModal({ open, onClose, onDone }) {
  const [term, setTerm] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState(null);

  const [form, setForm] = useState({
    empresa_descarga: '',
    naviera: '',
    fecha: '',
    hora: '',
    posicion: '',
    matricula_camion: '',
  });

  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      setLoading(true);
      let q = supabase.from('contenedores')
        .select('id, created_at, matricula_contenedor, naviera, tipo, posicion, estado')
        .order('created_at', { ascending: false })
        .limit(100);
      if (term) q = q.ilike('matricula_contenedor', `%${term}%`);
      const { data, error } = await q;
      if (!alive) return;
      if (error) { console.error(error); setItems([]); }
      else setItems(data || []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [open, term]);

  const disabled = useMemo(() => {
    if (!sel) return true;
    return !(form.fecha && form.hora);
  }, [sel, form]);

  const pick = (it) => {
    setSel(it);
    setForm(s => ({
      ...s,
      naviera: it.naviera || '',
      posicion: it.posicion || '',
    }));
  };

  const save = async () => {
    if (!sel) return;
    const payload = {
      matricula_contenedor: sel.matricula_contenedor,
      naviera: form.naviera || null,
      tipo: sel.tipo || null,
      posicion: form.posicion || null,
      empresa_descarga: form.empresa_descarga || null,
      fecha: form.fecha || null,
      hora: form.hora || null,
      matricula_camion: form.matricula_camion || null,
      estado: 'programado',
    };
    const { error } = await supabase.from('contenedores_programados').insert([payload]);
    if (error) return alert(`Error al programar: ${error.message}`);
    onDone?.(payload);
    onClose?.();
  };

  if (!open) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e)=>e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Programar contenedor</h3>
          <button className={styles.closeIcon} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          {/* Buscar contenedor */}
          <div className={styles.inputGroup}>
            <label>Buscar por matrícula</label>
            <div className={styles.search}>
              <input placeholder="Ej: MSKU1234567" value={term} onChange={(e)=> setTerm(e.target.value)} />
            </div>
          </div>

          {/* Lista */}
          <ul className={styles.list}>
            {loading && <li className={styles.muted}>Cargando…</li>}
            {!loading && items.length === 0 && <li className={styles.muted}>No hay resultados.</li>}
            {!loading && items.map(it => (
              <li key={it.id} className={styles.item} onClick={()=> pick(it)} style={{cursor:'pointer'}}>
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

          {/* Formulario */}
          <div className={styles.inputGroup}>
            <label>Cliente</label>
            <input value={form.empresa_descarga} onChange={(e)=> setForm({...form, empresa_descarga: e.target.value})} placeholder="Cliente…" />
          </div>
          <div className={styles.inputGroup}>
            <label>Naviera</label>
            <input value={form.naviera} onChange={(e)=> setForm({...form, naviera: e.target.value})} placeholder="Naviera…" />
          </div>
          <div className={styles.inputGrid}>
            <div className={styles.inputGroup}>
              <label>Fecha</label>
              <input type="date" value={form.fecha} onChange={(e)=> setForm({...form, fecha: e.target.value})} />
            </div>
            <div className={styles.inputGroup}>
              <label>Hora</label>
              <input type="time" value={form.hora} onChange={(e)=> setForm({...form, hora: e.target.value})} />
            </div>
          </div>
          <div className={styles.inputGroup}>
            <label>Posición</label>
            <input value={form.posicion} onChange={(e)=> setForm({...form, posicion: e.target.value})} placeholder="Ej. A-12 / Rampa 3" />
          </div>
          <div className={styles.inputGroup}>
            <label>Matrícula camión (opcional)</label>
            <input value={form.matricula_camion} onChange={(e)=> setForm({...form, matricula_camion: e.target.value})} placeholder="Ej. 0000-ABC" />
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.actionGhost} onClick={onClose}>Cancelar</button>
          <button className={styles.actionMini} disabled={!sel} onClick={()=> setSel(null)}>Quitar selección</button>
          <button className={styles.actionOk} disabled={disabled} onClick={save}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
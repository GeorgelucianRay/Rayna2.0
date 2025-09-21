import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import styles from './SchedulerStandalone.module.css';

export default function ProgramarFormModal({ open, onClose, contenedor, onSaved }) {
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
    setForm({
      empresa_descarga: '',
      naviera: contenedor?.naviera || '',
      fecha: '',
      hora: '',
      posicion: contenedor?.posicion || '',
      matricula_camion: '',
    });
  }, [open, contenedor]);

  const disabled = useMemo(() => !(form.fecha && form.hora), [form]);

  const save = async () => {
    if (!contenedor) return;
    const payload = {
      matricula_contenedor: contenedor.matricula_contenedor,
      naviera: form.naviera || null,
      tipo: contenedor.tipo || null,
      posicion: form.posicion || null,
      empresa_descarga: form.empresa_descarga || null,
      fecha: form.fecha || null,
      hora: form.hora || null,
      matricula_camion: form.matricula_camion || null,
      estado: 'programado',
    };
    const { error } = await supabase.from('contenedores_programados').insert([payload]);
    if (error) return alert(`Error al programar: ${error.message}`);
    onSaved?.(payload);
    onClose?.();
  };

  if (!open) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e)=>e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Programar contenedor · {contenedor?.matricula_contenedor || ''}</h3>
          <button className={styles.closeIcon} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.inputGroup}>
            <label>Cliente</label>
            <input
              value={form.empresa_descarga}
              onChange={(e)=> setForm({...form, empresa_descarga: e.target.value})}
              placeholder="Cliente…"
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Naviera</label>
            <input
              value={form.naviera}
              onChange={(e)=> setForm({...form, naviera: e.target.value})}
              placeholder="Naviera…"
            />
          </div>

          <div className={styles.inputGrid}>
            <div className={styles.inputGroup}>
              <label>Fecha</label>
              <input
                type="date"
                value={form.fecha}
                onChange={(e)=> setForm({...form, fecha: e.target.value})}
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Hora</label>
              <input
                type="time"
                value={form.hora}
                onChange={(e)=> setForm({...form, hora: e.target.value})}
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label>Posición</label>
            <input
              value={form.posicion}
              onChange={(e)=> setForm({...form, posicion: e.target.value})}
              placeholder="Ej. A-12 / Rampa 3"
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Matrícula camión (opcional)</label>
            <input
              value={form.matricula_camion}
              onChange={(e)=> setForm({...form, matricula_camion: e.target.value})}
              placeholder="Ej. 0000-ABC"
            />
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.actionGhost} onClick={onClose}>Cancelar</button>
          <button className={styles.actionOk} disabled={disabled} onClick={save}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
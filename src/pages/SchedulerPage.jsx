// src/pages/SchedulerPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useScheduler } from '../hooks/useScheduler'; // Noul nostru hook
import { supabase } from '../supabaseClient';
import styles from './SchedulerStandalone.module.css';

// Componentele noastre noi
import SchedulerToolbar from '../components/scheduler/SchedulerToolbar';
import SchedulerList from '../components/scheduler/SchedulerList';
// import CalendarWidget from '../components/scheduler/CalendarWidget';
// import ProgramarModal from '../components/scheduler/ProgramarModal';
// import { BackIcon } from '../components/ui/Icons';

export default function SchedulerPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const role = profile?.role?.toLowerCase() || '';

  // Folosim hook-ul pentru a prelua toată logica de date
  const { 
    tab, setTab, 
    query, setQuery, 
    date, setDate, 
    filtered, loading, 
    setItems // Trecem setItems la modal
  } = useScheduler();

  const [isProgramarOpen, setIsProgramarOpen] = useState(false);
  
  // Logica "Hecho" rămâne aici, deoarece modifică starea globală
  const handleHecho = async (row) => {
    if (!(role === 'mecanic' || role === 'dispecer' || role === 'admin')) return;
    
    const { data, error } = await supabase.rpc('finalizar_contenedor', {
        p_matricula: row.matricula_contenedor,
        p_programado_id: row.programado_id || row.id,
        p_matricula_camion: row.matricula_camion || null,
    });

    if (error || !data?.ok) {
        alert(data?.error || 'Nu s-a putut finaliza.');
    } else {
        // Actualizăm starea locală pentru a reflecta schimbarea instant
        setItems(prev => prev.filter(x => x.programado_id !== row.programado_id));
    }
  };

  return (
    <div className={styles.pageWrap}>
      <div className={styles.bg} />
      <div className={styles.vignette} />

      {/* Header-ul poate fi și el o componentă separată */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate('/depot')}>
          {/* <BackIcon /> */} Depot
        </button>
        <h1 className={styles.title}>Programar Contenedor</h1>
        {(role === 'dispecer' || role === 'admin') && (
          <button className={styles.newBtn} onClick={() => setIsProgramarOpen(true)}>Programar</button>
        )}
      </div>

      <SchedulerToolbar 
        tab={tab} setTab={setTab}
        query={query} setQuery={setQuery}
        date={date} setDate={setDate}
      />
      
      <div className={styles.grid}>
        <SchedulerList 
          items={filtered}
          tab={tab}
          loading={loading}
          role={role}
          onHecho={handleHecho}
        />
        {/* <CalendarWidget date={date} setDate={setDate} /> */}
      </div>

      {/* <ProgramarModal 
        isOpen={isProgramarOpen}
        onClose={() => setIsProgramarOpen(false)}
        onSuccess={() => {
            setIsProgramarOpen(false);
            // Aici am reîncărca datele
        }}
      /> 
      */}
    </div>
  );
}

// src/components/nomina/CalculadoraNomina.jsx

import React, { useMemo, useState, useEffect } from 'react';
import Layout from '../Layout';
import styles from './Nominas.module.css';
import NominaConfigCard from './NominaConfigCard';
import NominaCalendar from './NominaCalendar';
import ParteDiarioModal from './ParteDiarioModal';
import NominaResultCard from './NominaResultCard';
import SimpleSummaryModal from './SimpleSummaryModal';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../AuthContext';

export default function CalculadoraNomina() {
  const { profile } = useAuth();
  // Pentru a verifica în consolă ce date conține profilul
  console.log("Profilul utilizatorului încărcat:", profile);
  
  const monthNames = useMemo(
    () => ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"],
    []
  );

  const [currentDate, setCurrentDate] = useState(new Date());

  const defaultConfig = useMemo(() => ({
    salario_base: 1050,
    antiguedad: 0,
    precio_dia_trabajado: 20,
    precio_desayuno: 10,
    precio_cena: 15,
    precio_procena: 5,
    precio_km: 0.05,
    precio_contenedor: 6,
  }), []);
  
  const makePontajForMonth = (date) => {
    const y = date.getFullYear();
    const m = date.getMonth();
    const days = new Date(y, m + 1, 0).getDate();
    return Array.from({ length: days }, () => ({
      desayuno: false,
      cena: false,
      procena: false,
      km_iniciar: '',
      km_final: '',
      contenedores: 0,
      suma_festivo: 0,
      curse: [],
    }));
  };

  const [config, setConfig] = useState(defaultConfig);
  const [zilePontaj, setZilePontaj] = useState(makePontajForMonth(currentDate));

  const [showConfig, setShowConfig] = useState(false);
  const [isParteOpen, setIsParteOpen] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(null);
  const [summaryModalData, setSummaryModalData] = useState(null);

  // NOU: Stare pentru ziua selectată în noul selector de sumar
  const [selectedSummaryDay, setSelectedSummaryDay] = useState(new Date().getDate());

  // useEffect pentru încărcarea config - neschimbat
  useEffect(() => {
    const loadConfig = async () => {
      if (!profile?.id) return;
      const { data, error } = await supabase.from('config_nomina').select('*').eq('user_id', profile.id).single();
      if (data && !error) { setConfig({ /* ... date ... */ }); }
    };
    loadConfig();
  }, [profile?.id, defaultConfig]);

  // useEffect pentru încărcarea pontajului - neschimbat
  useEffect(() => {
    const loadPontaj = async () => {
      if (!profile?.id) return;
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const { data, error } = await supabase.from('pontaj_diario').select('*').eq('user_id', profile.id).eq('year', year).eq('month', month).order('day', { ascending: true });
      if (data && !error) {
        const newPontaj = makePontajForMonth(currentDate);
        data.forEach(item => {
          if (item.day >= 1 && item.day <= newPontaj.length) {
            newPontaj[item.day - 1] = { ...makePontajForMonth(new Date())[0], ...item };
          }
        });
        setZilePontaj(newPontaj);
      } else {
        setZilePontaj(makePontajForMonth(currentDate));
      }
    };
    loadPontaj();
  }, [currentDate, profile?.id]);
  
  // NOU: Sincronizează ziua selectată dacă se schimbă luna
  useEffect(() => {
    setSelectedSummaryDay(1);
  }, [currentDate]);

  const openParte = (idx) => { setSelectedDayIndex(idx); setIsParteOpen(true); };
  const closeParte = () => { setSelectedDayIndex(null); setIsParteOpen(false); };
  
  // MODIFICAT: Funcția de deschidere a sumarului, cu logica pentru numele șoferului îmbunătățită
  const openSummary = (dayIndex) => {
    if (dayIndex < 0 || dayIndex >= zilePontaj.length) return;
    const data = {
        ...zilePontaj[dayIndex],
        day: dayIndex + 1,
        monthName: monthNames[currentDate.getMonth()],
        year: currentDate.getFullYear(),
        chofer: profile?.full_name || profile?.username || 'Nume Indisponibil'
    };
    setSummaryModalData(data);
  };
  const closeSummary = () => setSummaryModalData(null);

  // Funcția de salvare - neschimbat
  const savePontajDay = async (dayIndex, dayData) => { /* ... cod neschimbat ... */ };
  
  // Handlerele pentru date - neschimbat
  const handleDayDataChange = (name, value) => { /* ... cod neschimbat ... */ };
  const handleToggleChange = (field) => { /* ... cod neschimbat ... */ };
  const updateCurse = (newCurse) => { handleDayDataChange('curse', newCurse); };

  const goPrevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goNextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const [result, setResult] = useState(null);
  
  // Funcția de calcul - neschimbat (folosim versiunea sigură)
  const calc = () => { /* ... cod neschimbat ... */ };

  // NOU: Calculăm numărul de zile din lună pentru a popula selectorul
  const daysInMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate(), [currentDate]);

  return (
    <Layout>
      <div className={styles.mainContainer}>
        <div className={styles.column}>
          <button className={styles.calculateButton} onClick={() => setShowConfig(true)}>Configurar contrato</button>
          {showConfig && (<NominaConfigCard config={config} onChange={setConfig} onSave={() => setShowConfig(false)} userId={profile?.id}/>)}
          <button className={styles.calculateButton} onClick={calc}>Calcular nómina</button>
        </div>
        <div className={styles.column}>
          <div className={styles.card}>
            <div className={styles.calendarHeader}>
              <button onClick={goPrevMonth}>&lt;</button>
              <h3>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
              <button onClick={goNextMonth}>&gt;</button>
            </div>
            {/* MODIFICAT: Textul de ajutor a fost actualizat */}
            <p className={styles.calendarHint}>Haz clic en un día para añadir / editar el parte diario.</p>
            
            {/* MODIFICAT: Calendarul nu mai are nevoie de onViewDay */}
            <NominaCalendar 
              date={currentDate} 
              zilePontaj={zilePontaj} 
              onPickDay={openParte}
            />
            
            {/* NOU: Bara de selecție pentru a vedea sumarul zilnic */}
            <div className={styles.summarySelectorBar}>
              <select 
                className={styles.summarySelector}
                value={selectedSummaryDay}
                onChange={(e) => setSelectedSummaryDay(Number(e.target.value))}
              >
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>
                    Ziua {day}
                  </option>
                ))}
              </select>
              <button 
                className={styles.summaryButton}
                onClick={() => openSummary(selectedSummaryDay - 1)}
              >
                Vezi Parte Diario
              </button>
            </div>
          </div>
          {result && <NominaResultCard result={result} />} 
        </div>
      </div>
      
      <ParteDiarioModal
        isOpen={isParteOpen}
        onClose={closeParte}
        data={selectedDayIndex !== null ? zilePontaj[selectedDayIndex] : {}}
        onDataChange={handleDayDataChange}
        onToggleChange={handleToggleChange}
        onCurseChange={updateCurse}
        day={selectedDayIndex !== null ? selectedDayIndex + 1 : ''}
        monthName={monthNames[currentDate.getMonth()]}
        year={currentDate.getFullYear()}
      />
      
      {summaryModalData && <SimpleSummaryModal data={summaryModalData} onClose={closeSummary} />}
    </Layout>
  );
}

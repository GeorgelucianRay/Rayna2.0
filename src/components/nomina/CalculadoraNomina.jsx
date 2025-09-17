// src/components/nomina/CalculadoraNomina.jsx

import React, { useMemo, useState, useEffect } from 'react';
import Layout from '../Layout'; // MODIFICAT: Urcăm un nivel pentru a găsi Layout
import styles from './Nominas.module.css'; // MODIFICAT: Acum este în același folder
import NominaConfigCard from './NominaConfigCard'; // MODIFICAT: Acum este în același folder
import NominaCalendar from './NominaCalendar'; // MODIFICAT: Acum este în același folder
import ParteDiarioModal from './ParteDiarioModal'; // MODIFICAT: Acum este în același folder
import NominaResultCard from './NominaResultCard'; // MODIFICAT: Acum este în același folder
import SimpleSummaryModal from './SimpleSummaryModal'; // MODIFICAT: Acum este în același folder
import { supabase } from '../../supabaseClient'; // MODIFICAT: Urcăm două niveluri pentru a găsi supabaseClient
import { useAuth } from '../../AuthContext'; // MODIFICAT: Urcăm două niveluri pentru a găsi AuthContext


export default function CalculadoraNomina() {
  const { profile } = useAuth();
  
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

  // NOU: Stare pentru modalul de sumar zilnic
  const [summaryModalData, setSummaryModalData] = useState(null);

  // useEffect pentru încărcarea config - Lăsat gol pentru a folosi codul tău existent
  useEffect(() => {
    const loadConfig = async () => {
      if (!profile?.id) return;
      
      const { data, error } = await supabase
        .from('config_nomina')
        .select('*')
        .eq('user_id', profile.id)
        .single();
      
      if (data && !error) {
        setConfig({
          salario_base: data.salario_base || defaultConfig.salario_base,
          antiguedad: data.antiguedad || defaultConfig.antiguedad,
          precio_dia_trabajado: data.precio_dia_trabajado || defaultConfig.precio_dia_trabajado,
          precio_desayuno: data.precio_desayuno || defaultConfig.precio_desayuno,
          precio_cena: data.cena || defaultConfig.cena,
          precio_procena: data.procena || defaultConfig.procena,
          precio_km: data.precio_km || defaultConfig.precio_km,
          precio_contenedor: data.precio_contenedor || defaultConfig.precio_contenedor,
        });
      }
    };
    loadConfig();
  }, [profile?.id, defaultConfig]);

  // useEffect pentru încărcarea pontajului - Codul tău e corect, nicio modificare
  useEffect(() => {
    const loadPontaj = async () => {
      if (!profile?.id) return;
      
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const { data, error } = await supabase
        .from('pontaj_diario')
        .select('*')
        .eq('user_id', profile.id)
        .eq('year', year)
        .eq('month', month)
        .order('day', { ascending: true });
      
      if (data && !error) {
        const newPontaj = makePontajForMonth(currentDate);
        data.forEach(item => {
          if (item.day >= 1 && item.day <= newPontaj.length) {
            newPontaj[item.day - 1] = {
              ...makePontajForMonth(new Date())[0], // Asigură că toate câmpurile default există
              ...item // Suprascrie cu datele din DB
            };
          }
        });
        setZilePontaj(newPontaj);
      } else {
        setZilePontaj(makePontajForMonth(currentDate));
      }
    };
    
    loadPontaj();
  }, [currentDate, profile?.id]);

  const openParte = (idx) => { 
    setSelectedDayIndex(idx); 
    setIsParteOpen(true); 
  };
  
  const closeParte = () => { 
    setSelectedDayIndex(null); 
    setIsParteOpen(false); 
  };
  
  // NOU: Funcții pentru a deschide și închide sumarul zilnic
  const openSummary = (idx) => {
    const data = {
        ...zilePontaj[idx],
        day: idx + 1,
        monthName: monthNames[currentDate.getMonth()],
        year: currentDate.getFullYear(),
        chofer: profile?.full_name || 'N/A'
    };
    setSummaryModalData(data);
  };
  const closeSummary = () => setSummaryModalData(null);


  // Funcția de salvare - Codul tău e corect, nicio modificare
  const savePontajDay = async (dayIndex, dayData) => {
    if (!profile?.id) return;
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const day = dayIndex + 1;
    
    const { error } = await supabase
      .from('pontaj_diario')
      .upsert({
        user_id: profile.id,
        year: year,
        month: month,
        day: day,
        desayuno: dayData.desayuno || false,
        cena: dayData.cena || false,
        procena: dayData.procena || false,
        km_iniciar: dayData.km_iniciar || null,
        km_final: dayData.km_final || null,
        contenedores: dayData.contenedores || 0,
        suma_festivo: dayData.suma_festivo || 0,
        curse: dayData.curse || [],
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,year,month,day'
      });
    
    if (error) {
      console.error('Error saving pontaj:', error);
    }
  };
  
  // Handlerele pentru date - Codul tău e corect, nicio modificare
  const handleDayDataChange = (name, value) => {
    setZilePontaj(prev => {
      const arr = [...prev];
      const newDayData = { ...arr[selectedDayIndex], [name]: value };
      arr[selectedDayIndex] = newDayData;
      savePontajDay(selectedDayIndex, newDayData);
      return arr;
    });
  };
  const handleToggleChange = (field) => {
    handleDayDataChange(field, !zilePontaj[selectedDayIndex][field]);
  };
  const updateCurse = (newCurse) => {
    handleDayDataChange('curse', newCurse);
  };

  const goPrevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goNextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const [result, setResult] = useState(null);
  
  // MODIFICAT: Funcția de calcul robustă care previne eroarea "Ecran Alb"
  const calc = () => {
    try {
      let d=0, c=0, p=0, km=0, cont=0, plus=0;
      const worked = new Set();

      zilePontaj.forEach((z, i) => {
        if (z.desayuno) d++;
        if (z.cena) c++;
        if (z.procena) p++;

        const ki = Number(z.km_iniciar) || 0;
        const kf = Number(z.km_final) || 0;
        const k = kf > ki ? kf - ki : 0;
        if (k > 0) km += k;

        cont += (Number(z.contenedores) || 0);
        plus += (Number(z.suma_festivo) || 0);

        if (z.desayuno || z.cena || z.procena || k > 0 || (z.contenedores||0)>0 || (z.suma_festivo||0)>0 || z.curse?.length > 0) {
          worked.add(i);
        }
      });

      const dz = worked.size;
      const toEuro = (num) => (Number(num) || 0).toFixed(2);

      const sDes = d * (Number(config.precio_desayuno) || 0);
      const sCen = c * (Number(config.precio_cena) || 0);
      const sPro = p * (Number(config.precio_procena) || 0);
      const sKm  = km * (Number(config.precio_km) || 0);
      const sCon = cont * (Number(config.precio_contenedor) || 0);
      const sDia = dz * (Number(config.precio_dia_trabajado) || 0);

      const total = (Number(config.salario_base) || 0)
        + (Number(config.antiguedad) || 0)
        + sDes + sCen + sPro + sKm + sCon + sDia + plus;

      setResult({
        totalBruto: toEuro(total),
        detalii_calcul: {
          'Salario Base': `${toEuro(config.salario_base)}€`,
          'Antigüedad': `${toEuro(config.antiguedad)}€`,
          'Total Días Trabajados': `${dz} días x ${toEuro(config.precio_dia_trabajado)}€ = ${toEuro(sDia)}€`,
          'Total Desayunos': `${d} x ${toEuro(config.precio_desayuno)}€ = ${toEuro(sDes)}€`,
          'Total Cenas': `${c} x ${toEuro(config.precio_cena)}€ = ${toEuro(sCen)}€`,
          'Total Procenas': `${p} x ${toEuro(config.precio_procena)}€ = ${toEuro(sPro)}€`,
          'Total Kilómetros': `${km.toFixed(2)} km x ${config.precio_km.toFixed(2)}€ = ${toEuro(sKm)}€`,
          'Total Contenedores': `${cont} x ${toEuro(config.precio_contenedor)}€ = ${toEuro(sCon)}€`,
          'Total Festivos/Plus': `${toEuro(plus)}€`,
        },
      });
    } catch (error) {
      console.error("A apărut o eroare la calculul salariului:", error);
      alert("A apărut o eroare la calcul. Verificați datele introduse sau consola pentru detalii.");
      setResult(null);
    }
  };

  return (
    <Layout backgroundClassName="calculadora-background">
      <div className={styles.header}>
        <h1>Calculadora de Nómina</h1>
      </div>
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
            <p className={styles.calendarHint}>Haz clic en un día para añadir el parte diario.</p>
            <NominaCalendar 
              date={currentDate} 
              zilePontaj={zilePontaj} 
              onPickDay={openParte} 
              onViewDay={openSummary} // MODIFICAT: Trimitem funcția către calendar
            />
          </div>
          {/* MODIFICAT: Asigură-te că calea către NominaResultCard este corectă */}
          {result && <NominaResultCard result={result} />} 
        </div>
      </div>
      
      {/* MODIFICAT: Asigură-te că calea către ParteDiarioModal este corectă */}
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
      
      {/* NOU: Randarea condiționată a noului modal de sumar */}
      {summaryModalData && <SimpleSummaryModal data={summaryModalData} onClose={closeSummary} />}
    </Layout>
  );
}

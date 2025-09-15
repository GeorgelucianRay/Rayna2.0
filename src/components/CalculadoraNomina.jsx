// src/components/CalculadoraNomina.jsx
import React, { useMemo, useState, useEffect } from 'react';
import Layout from './Layout';
import styles from './Nominas.module.css';
import NominaConfigCard from './NominaConfigCard';
import NominaCalendar from './NominaCalendar';
import ParteDiarioModal from './ParteDiarioModal';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

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
  
  // REINTRODUS: Adăugăm km_iniciar și km_final la structura zilnică
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

  // useEffect pentru încărcarea config - Nicio modificare
  useEffect(() => {
    // ... codul rămâne identic ...
  }, [profile?.id, defaultConfig]);

  // REINTRODUS: Adaptăm încărcarea pontajului
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
              desayuno: item.desayuno || false,
              cena: item.cena || false,
              procena: item.procena || false,
              km_iniciar: item.km_iniciar || '',
              km_final: item.km_final || '',
              contenedores: item.contenedores || 0,
              suma_festivo: item.suma_festivo || 0,
              curse: item.curse || []
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

  // REINTRODUS: Adaptăm funcția de salvare
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
  
  // REINTRODUS: Recalculăm kilometrii pe baza km_iniciar și km_final
  const calc = () => {
    let d=0, c=0, p=0, km=0, cont=0, plus=0;
    const worked = new Set();

    zilePontaj.forEach((z, i) => {
      if (z.desayuno) d++;
      if (z.cena) c++;
      if (z.procena) p++;

      const ki = +z.km_iniciar || 0;
      const kf = +z.km_final || 0;
      const k = kf > ki ? kf - ki : 0; // Calculul principal al kilometrilor
      if (k > 0) km += k;

      cont += (z.contenedores || 0);
      plus += (z.suma_festivo || 0);

      if (z.desayuno || z.cena || z.procena || k > 0 || (z.contenedores||0)>0 || (z.suma_festivo||0)>0) {
        worked.add(i);
      }
    });

    const dz = worked.size;

    const sDes = d * (Number(config.precio_desayuno) || 0);
    const sCen = c * (Number(config.precio_cena) || 0);
    const sPro = p * (Number(config.precio_procena) || 0);
    const sKm  = km * (Number(config.precio_km) || 0);
    const sCon = cont * (Number(config.precio_contenedor) || 0);
    const sDia = dz * (Number(config.precio_dia_trabajado) || 0);

    const total = (Number(config.salario_base) || 0)
      + (Number(config.antiguedad) || 0)
      + sDes + sCen + sPro + sKm + sCon + sDia + plus;

    // ... restul funcției `calc` și JSX-ul rămân neschimbate ...
    setResult({
        totalBruto: total.toFixed(2),
        detalii_calcul: {
          'Salario Base': `${(Number(config.salario_base) || 0).toFixed(2)}€`,
          'Antigüedad': `${(Number(config.antiguedad) || 0).toFixed(2)}€`,
          'Total Días Trabajados': `${dz} días x ${(Number(config.precio_dia_trabajado) || 0).toFixed(2)}€ = ${sDia.toFixed(2)}€`,
          'Total Desayunos': `${d} x ${(Number(config.precio_desayuno) || 0).toFixed(2)}€ = ${sDes.toFixed(2)}€`,
          'Total Cenas': `${c} x ${(Number(config.precio_cena) || 0).toFixed(2)}€ = ${sCen.toFixed(2)}€`,
          'Total Procenas': `${p} x ${(Number(config.precio_procena) || 0).toFixed(2)}€ = ${sPro.toFixed(2)}€`,
          'Total Kilómetros': `${km.toFixed(2)} km x ${(Number(config.precio_km) || 0).toFixed(2)}€ = ${sKm.toFixed(2)}€`,
          'Total Contenedores': `${cont} x ${(Number(config.precio_contenedor) || 0).toFixed(2)}€ = ${sCon.toFixed(2)}€`,
          'Total Festivos/Plus': `${plus.toFixed(2)}€`,
        },
        sumar_activitate: {
          'Días Trabajados': dz,
          'Total Desayunos': d,
          'Total Cenas': c,
          'Total Procenas': p,
          'Kilómetros Recorridos': km.toFixed(2),
          'Contenedores Barridos': cont,
          'Suma Festivos/Plus (€)': plus,
        }
      });
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
            <NominaCalendar date={currentDate} zilePontaj={zilePontaj} onPickDay={openParte}/>
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
    </Layout>
  );
}

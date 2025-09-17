// src/components/nomina/CalculadoraNomina.jsx
// VERSIUNE COMPLETĂ REPARATĂ

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
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

  // ȘABLON ZI – evită apeluri inutile și bug-uri de merge
  const DAY_TEMPLATE = useMemo(() => ({
    desayuno: false,
    cena: false,
    procena: false,
    km_iniciar: '',
    km_final: '',
    contenedores: 0,
    suma_festivo: 0,
    curse: [],
  }), []);

  const makePontajForMonth = useCallback((date) => {
    const y = date.getFullYear();
    const m = date.getMonth();
    const days = new Date(y, m + 1, 0).getDate();
    return Array.from({ length: days }, () => ({ ...DAY_TEMPLATE }));
  }, [DAY_TEMPLATE]);

  const [config, setConfig] = useState(defaultConfig);
  const [zilePontaj, setZilePontaj] = useState(makePontajForMonth(currentDate));

  // UI: toggle panou configurare + rezultat, plus hint scurt
  const [showConfig, setShowConfig] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [hint, setHint] = useState('');
  const hintTimerRef = useRef(null);
  const flashHint = useCallback((msg) => {
    setHint(msg);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setHint(''), 1200);
  }, []);

  const [isParteOpen, setIsParteOpen] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(null);
  const [summaryModalData, setSummaryModalData] = useState(null);

  // selector zi pentru sumar simplu
  const [selectedSummaryDay, setSelectedSummaryDay] = useState(new Date().getDate());

  // încarcă CONFIG cu operatorul nullish ?? (0 rămâne 0, nu cade pe default)
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
          salario_base: data.salario_base ?? defaultConfig.salario_base,
          antiguedad: data.antiguedad ?? defaultConfig.antiguedad,
          precio_dia_trabajado: data.precio_dia_trabajado ?? defaultConfig.precio_dia_trabajado,
          precio_desayuno: data.precio_desayuno ?? defaultConfig.precio_desayuno,
          precio_cena: data.precio_cena ?? defaultConfig.precio_cena,
          precio_procena: data.precio_procena ?? defaultConfig.precio_procena,
          precio_km: data.precio_km ?? defaultConfig.precio_km,
          precio_contenedor: data.precio_contenedor ?? defaultConfig.precio_contenedor,
        });
      }
    };
    loadConfig();
  }, [profile?.id, defaultConfig]);

  // încarcă PONTAJ – face merge corect cu DAY_TEMPLATE pentru luna afișată
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
            newPontaj[item.day - 1] = { ...DAY_TEMPLATE, ...item };
          }
        });
        setZilePontaj(newPontaj);
      } else {
        setZilePontaj(makePontajForMonth(currentDate));
      }
    };
    loadPontaj();
  }, [currentDate, profile?.id, makePontajForMonth, DAY_TEMPLATE]);

  // sincronizează ziua selectată la schimbare lună + închide modalele
  useEffect(() => {
    setSelectedSummaryDay(1);
    setIsParteOpen(false);
    setSelectedDayIndex(null);
  }, [currentDate]);

  const openParte = useCallback((idx) => {
    setSelectedDayIndex(idx);
    setIsParteOpen(true);
  }, []);

  const savePontajDay = useCallback(async (dayIndex, dayData) => {
    if (!profile?.id) return;
    const payload = {
      user_id: profile.id,
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
      day: dayIndex + 1,
      desayuno: !!dayData.desayuno,
      cena: !!dayData.cena,
      procena: !!dayData.procena,
      km_iniciar: dayData.km_iniciar ?? null,
      km_final: dayData.km_final ?? null,
      contenedores: dayData.contenedores ?? 0,
      suma_festivo: dayData.suma_festivo ?? 0,
      curse: Array.isArray(dayData.curse) ? dayData.curse : [],
    };

    const { error } = await supabase
      .from('pontaj_diario')
      .upsert(payload, { onConflict: 'user_id,year,month,day' });

    if (error) console.error('savePontajDay error:', error);
  }, [profile?.id, currentDate]);

  const closeParte = useCallback(() => {
    if (selectedDayIndex !== null) {
      // salvează când închizi modalul
      savePontajDay(selectedDayIndex, zilePontaj[selectedDayIndex]);
    }
    setSelectedDayIndex(null);
    setIsParteOpen(false);
  }, [selectedDayIndex, zilePontaj, savePontajDay]);

  const openSummary = useCallback((dayIndex) => {
    if (dayIndex < 0 || dayIndex >= zilePontaj.length) return;
    const data = {
      ...zilePontaj[dayIndex],
      day: dayIndex + 1,
      monthName: monthNames[currentDate.getMonth()],
      year: currentDate.getFullYear(),
      chofer: profile?.full_name || profile?.username || 'Nume Indisponibil'
    };
    setSummaryModalData(data);
  }, [zilePontaj, monthNames, currentDate, profile?.full_name, profile?.username]);

  const closeSummary = useCallback(() => setSummaryModalData(null), []);

  // normalizare numerică la input pentru câmpurile deseori numerice
  const numericFields = useMemo(() => new Set(['km_iniciar', 'km_final', 'contenedores', 'suma_festivo']), []);
  const handleDayDataChange = useCallback((name, value) => {
    const v = numericFields.has(name) && value !== '' ? Number(value) : value;
    setZilePontaj(prev => {
      const arr = [...prev];
      if (selectedDayIndex !== null) {
        const newDayData = { ...arr[selectedDayIndex], [name]: v };
        arr[selectedDayIndex] = newDayData;
        // dacă vrei debounce la scriere, aici poți înlocui cu o variantă debounced
        // în această versiune salvăm la închiderea modalului
      }
      return arr;
    });
  }, [numericFields, selectedDayIndex]);

  const handleToggleChange = useCallback((field) => {
    if (selectedDayIndex === null) return;
    const cur = zilePontaj[selectedDayIndex]?.[field];
    handleDayDataChange(field, !cur);
  }, [selectedDayIndex, zilePontaj, handleDayDataChange]);

  const updateCurse = useCallback((newCurse) => { handleDayDataChange('curse', newCurse); }, [handleDayDataChange]);

  const goPrevMonth = useCallback(() =>
    setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)), []);
  const goNextMonth = useCallback(() =>
    setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)), []);

  const [result, setResult] = useState(null);

  // calc robust – evită NaN și „nu afișează nimic”
  const calc = useCallback(() => {
    if (!zilePontaj?.length) {
      return {
        base: 0, antiguedad: 0, workedDays: 0,
        desayunos: 0, cenas: 0, procenas: 0,
        km: 0, contenedores: 0, festivo: 0,
        extras: 0, total: 0, breakdown: {}
      };
    }

    const toNum = (v) => (v === '' || v == null ? 0 : Number(v) || 0);

    let workedDays = 0;
    let desayunos = 0;
    let cenas = 0;
    let procenas = 0;
    let kmTotal = 0;
    let contTotal = 0;
    let festivoTotal = 0;

    zilePontaj.forEach(d => {
      const kmi = toNum(d.km_iniciar);
      const kmf = toNum(d.km_final);
      const km = Math.max(0, kmf - kmi);

      const ziLucrata =
        km > 0 ||
        toNum(d.contenedores) > 0 ||
        (Array.isArray(d.curse) && d.curse.length > 0) ||
        !!d.desayuno || !!d.cena || !!d.procena;

      if (ziLucrata) workedDays += 1;
      if (d.desayuno) desayunos += 1;
      if (d.cena) cenas += 1;
      if (d.procena) procenas += 1;

      kmTotal += km;
      contTotal += toNum(d.contenedores);
      festivoTotal += toNum(d.suma_festivo);
    });

    const base = toNum(config.salario_base);
    const antig = toNum(config.antiguedad);
    const ziPay = workedDays * toNum(config.precio_dia_trabajado);
    const mDes = desayunos * toNum(config.precio_desayuno);
    const mCen = cenas * toNum(config.precio_cena);
    const mPro = procenas * toNum(config.precio_procena);
    const kmPay = kmTotal * toNum(config.precio_km);
    const contPay = contTotal * toNum(config.precio_contenedor);
    const festPay = festivoTotal; // tratat ca sumă directă

    const gross = base + antig + ziPay + mDes + mCen + mPro + kmPay + contPay + festPay;

    return {
      base,
      antiguedad: antig,
      workedDays,
      desayunos, cenas, procenas,
      km: kmTotal,
      contenedores: contTotal,
      festivo: festivoTotal,
      extras: ziPay + mDes + mCen + mPro + kmPay + contPay + festPay,
      total: gross,
      breakdown: {
        'Zile lucrate': ziPay,
        'Mic dejun': mDes,
        'Cină': mCen,
        'Procină': mPro,
        'KM': kmPay,
        'Containere': contPay,
        'Sărbători': festPay,
      }
    };
  }, [zilePontaj, config]);

  const daysInMonth = useMemo(
    () => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate(),
    [currentDate]
  );

  return (
    <Layout>
      <div className={styles.mainContainer}>
        <div className={styles.column}>
          {/* Toolbar compactă cu emoji (toggle) */}
          <div className={styles.toolbar}>
            <button
              className={styles.iconBtn}
              onClick={() => { setShowConfig(v => !v); flashHint('Configurar contrato'); }}
              aria-label="Configurar contrato"
              aria-pressed={showConfig}
              title="Configurar contrato"
            >
              <button
  className={styles.iconBtn}
  onClick={() => { setShowConfig(v => !v); flashHint('Configurar contrato'); }}
  aria-label="Configurar contrato"
  aria-pressed={showConfig}
  title="Configurar contrato"
>
  <span className={styles.emoji}>⚙️</span>
</button>

<button
  className={styles.iconBtn}
  onClick={() => {
    const r = calc();
    setResult(r);
    setShowResult(v => !v);
    flashHint('Calcular nómina');
  }}
  aria-label="Calcular nómina"
  aria-pressed={showResult}
  title="Calcular nómina"
>
  <span className={styles.emoji}>🧮</span>
</button>

        <div className={styles.column}>
          <div className={styles.card}>
            <div className={styles.calendarHeader}>
              <button onClick={goPrevMonth}>&lt;</button>
              <h3>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
              <button onClick={goNextMonth}>&gt;</button>
            </div>
            <p className={styles.calendarHint}>Haz clic en un día para añadir / editar el parte diario.</p>

            <NominaCalendar
              date={currentDate}
              zilePontaj={zilePontaj}
              onPickDay={openParte}
            />

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

          {showResult && result && <NominaResultCard result={result} />}
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
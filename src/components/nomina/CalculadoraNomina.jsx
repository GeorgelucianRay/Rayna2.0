// src/components/nomina/CalculadoraNomina.jsx
// VERSIÓN COMPLETA REPARADA + PARTE SEMANAL (botones centrados, textos en español, resultado arriba)

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

// 🔹 NUEVO: Parte semanal
import WeeklySummaryModal, { buildWeekData } from './WeeklySummaryModal';

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

  // Plantilla de día (evita merges incorrectos)
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

  // UI: toggles + hint
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

  // 🔹 NUEVO: Parte semanal (modal + datos)
  const [isWeeklyOpen, setIsWeeklyOpen] = useState(false);
  const [weeklyData, setWeeklyData] = useState(null);

  // selector para el modal resumen simple
  const [selectedSummaryDay, setSelectedSummaryDay] = useState(new Date().getDate());

  // Cargar CONFIG con ?? (0 se mantiene 0)
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

  // Cargar PONTAJE del mes visible
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

  // Sincroniza cambios de mes
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
      chofer: profile?.full_name || profile?.username || 'Nombre no disponible'
    };
    setSummaryModalData(data);
  }, [zilePontaj, monthNames, currentDate, profile?.full_name, profile?.username]);

  const closeSummary = useCallback(() => setSummaryModalData(null), []);

  // Normalización numérica
  const numericFields = useMemo(() => new Set(['km_iniciar', 'km_final', 'contenedores', 'suma_festivo']), []);
  const handleDayDataChange = useCallback((name, value) => {
    const v = numericFields.has(name) && value !== '' ? Number(value) : value;
    setZilePontaj(prev => {
      const arr = [...prev];
      if (selectedDayIndex !== null) {
        const newDayData = { ...arr[selectedDayIndex], [name]: v };
        arr[selectedDayIndex] = newDayData;
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

  // Cálculo robusto
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

      const diaTrabajado =
        km > 0 ||
        toNum(d.contenedores) > 0 ||
        (Array.isArray(d.curse) && d.curse.length > 0) ||
        !!d.desayuno || !!d.cena || !!d.procena;

      if (diaTrabajado) workedDays += 1;
      if (d.desayuno) desayunos += 1;
      if (d.cena) cenas += 1;
      if (d.procena) procenas += 1;

      kmTotal += km;
      contTotal += toNum(d.contenedores);
      festivoTotal += toNum(d.suma_festivo);
    });

    const base = toNum(config.salario_base);
    const antig = toNum(config.antiguedad);
    const diaPay = workedDays * toNum(config.precio_dia_trabajado);
    const desPay = desayunos * toNum(config.precio_desayuno);
    const cenPay = cenas * toNum(config.precio_cena);
    const proPay = procenas * toNum(config.precio_procena);
    const kmPay = kmTotal * toNum(config.precio_km);
    const contPay = contTotal * toNum(config.precio_contenedor);
    const festPay = festivoTotal; // suma directa

    const total = base + antig + diaPay + desPay + cenPay + proPay + kmPay + contPay + festPay;

    return {
      base,
      antiguedad: antig,
      workedDays,
      desayunos, cenas, procenas,
      km: kmTotal,
      contenedores: contTotal,
      festivo: festivoTotal,
      extras: diaPay + desPay + cenPay + proPay + kmPay + contPay + festPay,
      total,
      breakdown: {
        'Días trabajados': diaPay,
        'Desayunos': desPay,
        'Cenas': cenPay,
        'Pro-cenas': proPay,
        'Kilómetros': kmPay,
        'Contenedores': contPay,
        'Festivos': festPay,
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
        {/* COLUMNA 1 */}
        <div className={styles.column}>
          {/* Toolbar centrada */}
          <div className={styles.toolbar + ' ' + styles.toolbarCenter}>
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

            {/* 🔹 NUEVO: botón Parte semanal */}
            <button
              className={styles.iconBtn}
              onClick={() => {
                const wd = buildWeekData(currentDate, zilePontaj); // semana de la fecha visible
                setWeeklyData(wd);
                setIsWeeklyOpen(true);
                flashHint('Parte semanal');
              }}
              aria-label="Parte semanal"
              aria-pressed={isWeeklyOpen}
              title="Parte semanal"
            >
              <span className={styles.emoji}>🗓️</span>
            </button>
          </div>

          {hint && <div className={styles.hint}>{hint}</div>}

          {/* Resultado ARRIBA (misma columna que Config) */}
          {showResult && result && <NominaResultCard result={result} />}

          {/* Configuración (toggle) */}
          {showConfig && (
            <NominaConfigCard
              config={config}
              onChange={setConfig}
              onSave={() => setShowConfig(false)}
              userId={profile?.id}
            />
          )}
        </div>

        {/* COLUMNA 2 */}
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
                    Día {day}
                  </option>
                ))}
              </select>
              <button
                className={styles.summaryButton}
                onClick={() => openSummary(selectedSummaryDay - 1)}
              >
                Ver Parte Diario
              </button>
            </div>
          </div>
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

      {/* 🔹 NUEVO: Modal Parte semanal */}
      {isWeeklyOpen && weeklyData && (
        <WeeklySummaryModal
          isOpen={isWeeklyOpen}
          onClose={() => setIsWeeklyOpen(false)}
          weekData={weeklyData}
        />
      )}
    </Layout>
  );
}
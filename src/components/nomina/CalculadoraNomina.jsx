// src/components/nomina/CalculadoraNomina.jsx
// VERSIÓN COMPLETA REPARADA + PARTE SEMANAL (SAFE) + SALVARE INSTANT ÎN PARTE DIARIO

import React, {
  useMemo, useState, useEffect, useCallback, useRef, lazy, Suspense,
} from 'react';
import Layout from '../Layout';
import styles from './Nominas.module.css';
import NominaConfigCard from './NominaConfigCard';
import NominaCalendar from './NominaCalendar';
import ParteDiarioModal from './ParteDiarioModal';
import NominaResultCard from './NominaResultCard';
import SimpleSummaryModal from './SimpleSummaryModal';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../AuthContext';

// Lazy import pentru a evita white-screen dacă fișierul lipsește/are erori
const WeeklySummaryModal = lazy(() => import('./WeeklySummaryModal'));

/* ======================== Helper săptămână (local) ======================== */
function getMonday(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (x.getDay() + 6) % 7; // Luni=0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}
function buildWeekData(currentDate, zilePontaj, mondayOverride = null) {
  const monday = mondayOverride ? new Date(mondayOverride) : getMonday(currentDate);
  const days = [];
  let kmInitMonday = 0;
  let kmFinalFriday = 0;
  let kmWeekTotal = 0;

  for (let i = 0; i < 5; i++) { // Luni→Vineri
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);

    const sameMonth = (d.getFullYear() === currentDate.getFullYear()) &&
                      (d.getMonth() === currentDate.getMonth());
    const idx = sameMonth ? d.getDate() - 1 : null;
    const zi = idx != null && zilePontaj[idx] ? zilePontaj[idx] : {};

    const km_i = Number(zi?.km_iniciar || 0);
    const km_f = Number(zi?.km_final || 0);
    const km_d = Math.max(0, km_f - km_i);

    if (i === 0) kmInitMonday = km_i || 0;
    if (i === 4) kmFinalFriday = km_f || 0;
    kmWeekTotal += km_d;

    days.push({
      date: d,
      label: d.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'short' }),
      des: !!(zi?.desayuno),
      cen: !!(zi?.cena),
      pro: !!(zi?.procena),
      festivo: Number(zi?.suma_festivo || 0),
      km_iniciar: km_i,
      km_final: km_f,
      km_dia: km_d,
      contenedores: Number(zi?.contenedores || 0),
    });
  }

  return {
    monday,
    friday: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 4),
    days,
    kmInitMonday,
    kmFinalFriday,
    kmWeekTotal: Math.max(0, kmWeekTotal),
  };
}
/* ======================================================================== */

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

  // Plantilla de día
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

  // Parte semanal (modal + datos)
  const [isWeeklyOpen, setIsWeeklyOpen] = useState(false);
  const [weeklyData, setWeeklyData] = useState(null);

  // selector pentru SimpleSummaryModal
  const [selectedSummaryDay, setSelectedSummaryDay] = useState(new Date().getDate());

  // Cargar CONFIG
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

  // Sincronizează când se schimbă luna
  useEffect(() => {
    setSelectedSummaryDay(1);
    setIsParteOpen(false);
    setSelectedDayIndex(null);
  }, [currentDate]);

  const openParte = useCallback((idx) => {
    setSelectedDayIndex(idx);
    setIsParteOpen(true);
  }, []);

  // Persistare în DB
  const savePontajDay = useCallback(async (dayIndex, dayData) => {
    if (!profile?.id || dayIndex == null) return;
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

    if (error) {
      console.error('savePontajDay error:', error);
    }
  }, [profile?.id, currentDate]);

  // Închidere modal (păstrăm și salvarea la închidere ca fallback)
  const closeParte = useCallback(() => {
    if (selectedDayIndex !== null) {
      savePontajDay(selectedDayIndex, zilePontaj[selectedDayIndex]);
    }
    setSelectedDayIndex(null);
    setIsParteOpen(false);
  }, [selectedDayIndex, zilePontaj, savePontajDay]);

  // Deschidere sumar simplu (ticket zi)
  const openSummary = useCallback((dayIndex) => {
    if (dayIndex < 0 || dayIndex >= zilePontaj.length) return;
    const data = {
      ...zilePontaj[dayIndex],
      day: dayIndex + 1,
      monthName: monthNames[currentDate.getMonth()],
      year: currentDate.getFullYear(),
      chofer: profile?.nombre_completo || profile?.full_name || profile?.username || 'Nombre no disponible',
      camion: profile?.camioane?.matricula || profile?.matricula || '—',
    };
    setSummaryModalData(data);
  }, [zilePontaj, monthNames, currentDate, profile]);

  const closeSummary = useCallback(() => setSummaryModalData(null), []);

  // Normalizare numerică + SALVARE INSTANT
  const numericFields = useMemo(() => new Set(['km_iniciar', 'km_final', 'contenedores', 'suma_festivo']), []);
  const handleDayDataChange = useCallback((name, value) => {
    if (selectedDayIndex === null) return;
    const v = numericFields.has(name) && value !== '' ? Number(value) : value;

    setZilePontaj(prev => {
      const arr = [...prev];
      const newDayData = { ...arr[selectedDayIndex], [name]: v };
      arr[selectedDayIndex] = newDayData;
      // SALVARE INSTANT
      savePontajDay(selectedDayIndex, newDayData);
      return arr;
    });
  }, [numericFields, selectedDayIndex, savePontajDay]);

  const handleToggleChange = useCallback((field) => {
    if (selectedDayIndex === null) return;
    setZilePontaj(prev => {
      const arr = [...prev];
      const cur = !!arr[selectedDayIndex]?.[field];
      const newDayData = { ...arr[selectedDayIndex], [field]: !cur };
      arr[selectedDayIndex] = newDayData;
      // SALVARE INSTANT
      savePontajDay(selectedDayIndex, newDayData);
      return arr;
    });
  }, [selectedDayIndex, savePontajDay]);

  const updateCurse = useCallback((newCurse) => {
    if (selectedDayIndex === null) return;
    setZilePontaj(prev => {
      const arr = [...prev];
      const newDayData = { ...arr[selectedDayIndex], curse: newCurse };
      arr[selectedDayIndex] = newDayData;
      // SALVARE INSTANT
      savePontajDay(selectedDayIndex, newDayData);
      return arr;
    });
  }, [selectedDayIndex, savePontajDay]);

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
    const festPay = festivoTotal; // suma directă

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

  // Deschide „Parte semanal”
  const openParteSemanal = useCallback(() => {
    try {
      const wd = buildWeekData(currentDate, zilePontaj);
      setWeeklyData(wd);
      setIsWeeklyOpen(true);
      flashHint('Parte semanal');
    } catch (e) {
      console.error('Parte semanal error:', e);
    }
  }, [currentDate, zilePontaj, flashHint]);

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

            {/* Parte semanal */}
            <button
              className={styles.iconBtn}
              onClick={openParteSemanal}
              aria-label="Parte semanal"
              aria-pressed={isWeeklyOpen}
              title="Parte semanal"
            >
              <span className={styles.emoji}>🗓️</span>
            </button>
          </div>

          {hint && <div className={styles.hint}>{hint}</div>}

          {/* Resultado ARRIBA */}
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

      {/* Modal Parte semanal — L A Z Y */}
      <Suspense fallback={null}>
        {isWeeklyOpen && weeklyData && (
          <WeeklySummaryModal
            isOpen={isWeeklyOpen}
            onClose={() => setIsWeeklyOpen(false)}
            weekData={weeklyData}
          />
        )}
      </Suspense>
    </Layout>
  );
}
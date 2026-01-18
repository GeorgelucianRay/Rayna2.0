/// src/components/nomina/CalculadoraNomina.jsx
import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
  lazy,
  Suspense,
} from "react";
import Layout from "../Layout";
import styles from "./NominaDashboard.module.css";

import NominaConfigCard from "./NominaConfigCard";
import NominaCalendar from "./NominaCalendar";
import ParteDiarioModal from "./ParteDiarioModal";
import NominaResultCard from "./NominaResultCard";
import SimpleSummaryModal from "./SimpleSummaryModal";
import { supabase } from "../../supabaseClient";
import { useAuth } from "../../AuthContext";

// Lazy import
const WeeklySummaryModal = lazy(() => import("./WeeklySummaryModal"));

/* ======================== Helpers săptămâni pe lună ======================== */
function getMonday(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (x.getDay() + 6) % 7; // Luni=0 ... Duminică=6
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function buildWeekDataForMonth(currentDate, zilePontaj, monday) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const days = [];
  let kmInit = 0;
  let kmFin = 0;
  let kmTotal = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);

    const sameMonth = d.getFullYear() === year && d.getMonth() === month;
    const idx = sameMonth ? d.getDate() - 1 : null;
    const zi = idx != null && zilePontaj[idx] ? zilePontaj[idx] : {};

    const km_i = Number(zi.km_iniciar || 0);
    const km_f = Number(zi.km_final || 0);
    const km_d = Math.max(0, km_f - km_i);

    if (sameMonth) {
      if (!kmInit && km_i) kmInit = km_i;
      if (km_f) kmFin = km_f;
      kmTotal += km_d;
    }

    days.push({
      date: d,
      label: d.toLocaleDateString("es-ES", {
        weekday: "long",
        day: "2-digit",
        month: "short",
      }),
      des: !!zi.desayuno,
      cen: !!zi.cena,
      pro: !!zi.procena,
      festivo: Number(zi.suma_festivo || 0),
      km_iniciar: km_i,
      km_final: km_f,
      km_dia: km_d,
      contenedores: Number(zi.contenedores || 0),
      camion_matricula: zi.camion_matricula || null,
      curse: Array.isArray(zi.curse) ? zi.curse : [],
    });
  }

  return {
    monday,
    friday: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6),
    days,
    kmInitMonday: kmInit,
    kmFinalFriday: kmFin,
    kmWeekTotal: Math.max(0, kmTotal),
  };
}

function buildWeeksForMonth(currentDate, zilePontaj) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);

  const weeks = [];
  let monday = getMonday(firstOfMonth);

  while (monday <= lastOfMonth) {
    weeks.push(buildWeekDataForMonth(currentDate, zilePontaj, monday));
    monday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7);
  }
  return weeks;
}
/* ======================================================================== */

const CalendarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M7 3v2M17 3v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M4 8h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const CalcIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M8 7h8M8 11h8M8 15h3M8 19h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="2"/>
    <path d="M19.4 15a1.9 1.9 0 0 0 .38 2.1l.04.04-1.7 1.7-.04-.04a1.9 1.9 0 0 0-2.1-.38 1.9 1.9 0 0 0-1.14 1.74V21h-2.4v-.1A1.9 1.9 0 0 0 11.3 19a1.9 1.9 0 0 0-2.1.38l-.04.04-1.7-1.7.04-.04A1.9 1.9 0 0 0 7 15.6 1.9 1.9 0 0 0 5.26 14H5v-2.4h.1A1.9 1.9 0 0 0 7 10.3a1.9 1.9 0 0 0-.38-2.1l-.04-.04 1.7-1.7.04.04A1.9 1.9 0 0 0 10.4 7c.72 0 1.38-.41 1.74-1.14V5h2.4v.1c0 .72.41 1.38 1.14 1.74.72.36 1.55.27 2.1-.38l.04-.04 1.7 1.7-.04.04A1.9 1.9 0 0 0 19 10.4c0 .72.41 1.38 1.14 1.74H21v2.4h-.1c-.72 0-1.38.41-1.74 1.14Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ======================== Antigüedad helpers ======================== */
function yearsBetween(startDate, now = new Date()) {
  if (!startDate) return 0;
  const s = new Date(startDate);
  if (Number.isNaN(s.getTime())) return 0;
  let years = now.getFullYear() - s.getFullYear();
  const m = now.getMonth() - s.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < s.getDate())) years -= 1;
  return Math.max(0, years);
}

function computeAntiguedadAmount(years, tiers) {
  // tiers: [{ years: 2, amount: 25 }, { years: 4, amount: 50 }, ...]
  const y = Number(years || 0) || 0;
  const arr = Array.isArray(tiers) ? tiers : [];

  // normalize + sort asc by years
  const sorted = arr
    .map((t) => ({ years: Number(t?.years || 0) || 0, amount: Number(t?.amount || 0) || 0 }))
    .filter((t) => t.years > 0)
    .sort((a, b) => a.years - b.years);

  let best = 0;
  for (const t of sorted) {
    if (y >= t.years) best = t.amount;
    else break;
  }
  return best;
}

function isDayWorked(d) {
  const toNum = (v) => (v === "" || v == null ? 0 : Number(v) || 0);
  const km = Math.max(0, toNum(d.km_final) - toNum(d.km_iniciar));
  return (
    km > 0 ||
    toNum(d.contenedores) > 0 ||
    (Array.isArray(d.curse) && d.curse.length > 0) ||
    !!d.desayuno ||
    !!d.cena ||
    !!d.procena
  );
}
/* ==================================================================== */

export default function CalculadoraNomina() {
  const { profile } = useAuth();
  const role = (profile?.role || "").toLowerCase();
  const canConfigure = role === "admin" || role === "dispecer";

  const monthNames = useMemo(
    () => ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"],
    []
  );
  const monthShort = useMemo(
    () => ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"],
    []
  );

  const [currentDate, setCurrentDate] = useState(new Date());
  const [result, setResult] = useState(null);

  // IMPORTANT: fără antiguedad aici (nu e input, nu e editabil de șofer)
  const defaultConfig = useMemo(() => ({
    salario_base: 1050,
    precio_dia_trabajado: 20,
    precio_desayuno: 10,
    precio_cena: 15,
    precio_procena: 5,
    precio_km: 0.05,
    precio_contenedor: 6,
    precio_festivo: 0, // optional: weekend auto
    antiguedad_tiers: [
      { years: 2, amount: 0 },
      { years: 4, amount: 0 },
      { years: 6, amount: 0 },
    ],
  }), []);

  const DAY_TEMPLATE = useMemo(() => ({
    desayuno: false,
    cena: false,
    procena: false,
    km_iniciar: "",
    km_final: "",
    contenedores: 0,
    suma_festivo: 0,
    camion_matricula: null,
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

  // UI state
  const [showConfig, setShowConfig] = useState(false);
  const [hint, setHint] = useState("");
  const hintTimerRef = useRef(null);
  const flashHint = useCallback((msg) => {
    setHint(msg);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setHint(""), 1200);
  }, []);

  // parte diario
  const [isParteOpen, setIsParteOpen] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(null);
  const [summaryModalData, setSummaryModalData] = useState(null);

  // weekly
  const [isWeeklyOpen, setIsWeeklyOpen] = useState(false);
  const [weeksData, setWeeksData] = useState([]);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);

  const [selectedSummaryDay, setSelectedSummaryDay] = useState(1);

  // Header meta
  const vehicleId = profile?.camioane?.matricula || profile?.matricula || "—";
  const driverName = profile?.nombre_completo || profile?.full_name || profile?.username || "—";

  // ---- Antigüedad years (setat de admin/dispecer pe profil) ----
  const antigYears = useMemo(() => {
    // preferă fecha_inicio dacă există
    if (profile?.fecha_inicio) return yearsBetween(profile.fecha_inicio);
    // altfel folosește antiguedad_years direct
    return Number(profile?.antiguedad_years || 0) || 0;
  }, [profile?.fecha_inicio, profile?.antiguedad_years]);

  // Load config (doar citire pentru șofer; edit doar în NominaConfigCard pt canConfigure)
  useEffect(() => {
    const loadConfig = async () => {
      if (!profile?.id) return;
      const { data, error } = await supabase
        .from("config_nomina")
        .select("*")
        .eq("user_id", profile.id)
        .single();

      if (data && !error) {
        setConfig({
          salario_base: data.salario_base ?? defaultConfig.salario_base,
          precio_dia_trabajado: data.precio_dia_trabajado ?? defaultConfig.precio_dia_trabajado,
          precio_desayuno: data.precio_desayuno ?? defaultConfig.precio_desayuno,
          precio_cena: data.precio_cena ?? defaultConfig.precio_cena,
          precio_procena: data.precio_procena ?? defaultConfig.precio_procena,
          precio_km: data.precio_km ?? defaultConfig.precio_km,
          precio_contenedor: data.precio_contenedor ?? defaultConfig.precio_contenedor,
          precio_festivo: data.precio_festivo ?? defaultConfig.precio_festivo,
          antiguedad_tiers: data.antiguedad_tiers ?? defaultConfig.antiguedad_tiers,
        });
      } else {
        setConfig(defaultConfig);
      }
    };
    loadConfig();
  }, [profile?.id, defaultConfig]);

  // Load pontaje month
  useEffect(() => {
    const loadPontaj = async () => {
      if (!profile?.id) return;
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      const { data, error } = await supabase
        .from("pontaj_diario")
        .select("*")
        .eq("user_id", profile.id)
        .eq("year", year)
        .eq("month", month)
        .order("day", { ascending: true });

      if (data && !error) {
        const newPontaj = makePontajForMonth(currentDate);
        data.forEach((item) => {
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

  // Weeks
  useEffect(() => {
    if (!zilePontaj?.length) {
      setWeeksData([]);
      setSelectedWeekIndex(0);
      return;
    }
    const weeks = buildWeeksForMonth(currentDate, zilePontaj);
    setWeeksData(weeks);
    setSelectedWeekIndex(0);
  }, [currentDate, zilePontaj]);

  useEffect(() => {
    setSelectedSummaryDay(1);
    setIsParteOpen(false);
    setSelectedDayIndex(null);
  }, [currentDate]);

  // Persist day
  const savePontajDay = useCallback(
    async (dayIndex, dayData) => {
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
        camion_matricula: dayData.camion_matricula ?? null,
        curse: Array.isArray(dayData.curse) ? dayData.curse : [],
      };

      const { error } = await supabase
        .from("pontaj_diario")
        .upsert(payload, { onConflict: "user_id,year,month,day" });

      if (error) console.error("savePontajDay error:", error);
    },
    [profile?.id, currentDate]
  );

  const openParte = useCallback((idx) => {
    setSelectedDayIndex(idx);
    setIsParteOpen(true);
  }, []);

  const closeParte = useCallback(() => {
    if (selectedDayIndex !== null) {
      savePontajDay(selectedDayIndex, zilePontaj[selectedDayIndex]);
    }
    setSelectedDayIndex(null);
    setIsParteOpen(false);
  }, [selectedDayIndex, zilePontaj, savePontajDay]);

  const openSummary = useCallback(
    (dayIndex) => {
      if (dayIndex < 0 || dayIndex >= zilePontaj.length) return;
      const data = {
        ...zilePontaj[dayIndex],
        day: dayIndex + 1,
        monthName: monthNames[currentDate.getMonth()],
        year: currentDate.getFullYear(),
        chofer: driverName,
        camion:
          zilePontaj[dayIndex]?.camion_matricula ||
          profile?.camioane?.matricula ||
          profile?.matricula ||
          "—",
      };
      setSummaryModalData(data);
    },
    [zilePontaj, monthNames, currentDate, profile, driverName]
  );

  const closeSummary = useCallback(() => setSummaryModalData(null), []);

  // Instant save edits
  const numericFields = useMemo(
    () => new Set(["km_iniciar", "km_final", "contenedores", "suma_festivo"]),
    []
  );

  const handleDayDataChange = useCallback(
    (name, value) => {
      if (selectedDayIndex === null) return;
      const v = numericFields.has(name) && value !== "" ? Number(value) : value;

      setZilePontaj((prev) => {
        const arr = [...prev];
        const newDayData = { ...arr[selectedDayIndex], [name]: v };
        arr[selectedDayIndex] = newDayData;
        savePontajDay(selectedDayIndex, newDayData);
        return arr;
      });
    },
    [numericFields, selectedDayIndex, savePontajDay]
  );

  const handleToggleChange = useCallback(
    (field) => {
      if (selectedDayIndex === null) return;
      setZilePontaj((prev) => {
        const arr = [...prev];
        const cur = !!arr[selectedDayIndex]?.[field];
        const newDayData = { ...arr[selectedDayIndex], [field]: !cur };
        arr[selectedDayIndex] = newDayData;
        savePontajDay(selectedDayIndex, newDayData);
        return arr;
      });
    },
    [selectedDayIndex, savePontajDay]
  );

  const updateCurse = useCallback(
    (newCurse) => {
      if (selectedDayIndex === null) return;
      setZilePontaj((prev) => {
        const arr = [...prev];
        const newDayData = { ...arr[selectedDayIndex], curse: newCurse };
        arr[selectedDayIndex] = newDayData;
        savePontajDay(selectedDayIndex, newDayData);
        return arr;
      });
    },
    [selectedDayIndex, savePontajDay]
  );

  // Monthly calc
  const calc = useCallback(() => {
    if (!zilePontaj?.length) {
      return {
        base: 0, antiguedad: 0, antigYears: 0, workedDays: 0,
        desayunos: 0, cenas: 0, procenas: 0,
        km: 0, contenedores: 0, festivo: 0,
        extras: 0, total: 0, breakdown: {}
      };
    }

    const toNum = (v) => (v === "" || v == null ? 0 : Number(v) || 0);

    let workedDays = 0;
    let desayunos = 0;
    let cenas = 0;
    let procenas = 0;
    let kmTotal = 0;
    let contTotal = 0;
    let festivoTotal = 0;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0-based

    zilePontaj.forEach((d, idx) => {
      const kmi = toNum(d.km_iniciar);
      const kmf = toNum(d.km_final);
      const km = Math.max(0, kmf - kmi);

      const diaTrabajado = isDayWorked(d);

      if (diaTrabajado) workedDays += 1;
      if (d.desayuno) desayunos += 1;
      if (d.cena) cenas += 1;
      if (d.procena) procenas += 1;

      kmTotal += km;
      contTotal += toNum(d.contenedores);

      // FESTIVO:
      // 1) dacă ai introdus manual suma_festivo -> o adună
      // 2) opțional: dacă e weekend și diaTrabajado -> adaugă precio_festivo (din config)
      const manualFest = toNum(d.suma_festivo);
      let autoFest = 0;

      const dateObj = new Date(year, month, idx + 1);
      const dow = dateObj.getDay(); // 0=Sun ... 6=Sat
      const isWeekend = dow === 0 || dow === 6;

      if (isWeekend && diaTrabajado && toNum(config.precio_festivo) > 0) {
        autoFest = toNum(config.precio_festivo);
      }

      festivoTotal += Math.max(manualFest, autoFest);
    });

    const base = toNum(config.salario_base);

    // Antigüedad: calculată din ani + tabla (din config)
    const antig = computeAntiguedadAmount(antigYears, config.antiguedad_tiers);

    const diaPay = workedDays * toNum(config.precio_dia_trabajado);
    const desPay = desayunos * toNum(config.precio_desayuno);
    const cenPay = cenas * toNum(config.precio_cena);
    const proPay = procenas * toNum(config.precio_procena);
    const kmPay = kmTotal * toNum(config.precio_km);
    const contPay = contTotal * toNum(config.precio_contenedor);
    const festPay = festivoTotal;

    const total = base + antig + diaPay + desPay + cenPay + proPay + kmPay + contPay + festPay;

    return {
      base,
      antiguedad: antig,
      antigYears,
      workedDays,
      desayunos, cenas, procenas,
      km: kmTotal,
      contenedores: contTotal,
      festivo: festivoTotal,
      extras: diaPay + desPay + cenPay + proPay + kmPay + contPay + festPay,
      total,
      breakdown: {
        "Antigüedad": antig,
        "Días trabajados": diaPay,
        "Desayunos": desPay,
        "Cenas": cenPay,
        "Pro-cenas": proPay,
        "Kilómetros": kmPay,
        "Contenedores": contPay,
        "Festivos": festPay,
      },
    };
  }, [zilePontaj, config, currentDate, antigYears]);

  const daysInMonth = useMemo(
    () => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate(),
    [currentDate]
  );

  // Month tabs
  const setMonthIndex = useCallback((mIdx) => {
    setCurrentDate((d) => new Date(d.getFullYear(), mIdx, 1));
  }, []);

  // Buttons: weekly + config
  const openParteSemanal = useCallback(() => {
    if (!weeksData.length) return;
    setIsWeeklyOpen(true);
    flashHint("Parte semanal");
  }, [weeksData, flashHint]);

  const handleRecalculate = useCallback(() => {
    const r = calc();
    setResult(r);
    flashHint("Nómina recalculada");
  }, [calc, flashHint]);

  const handleGeneratePdf = useCallback(() => {
    flashHint("Generando PDF…");
  }, [flashHint]);

  // Init result
  useEffect(() => {
    setResult(calc());
  }, [calc, currentDate]);

  return (
    <Layout backgroundClassName="homepageBackground">
      <div className={styles.wrap}>
        {/* ============== Sticky Glass Header ============== */}
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.brand}>
              <div className={styles.brandIcon}>🚚</div>
              <div>
                <div className={styles.brandTitle}>Rayna 2.0</div>
                <div className={styles.brandSub}>Nóminas y partes</div>
              </div>
            </div>

            <div className={styles.headerBtns}>
              {canConfigure && (
                <button
                  type="button"
                  className={styles.circleBtn}
                  onClick={() => { setShowConfig((v) => !v); flashHint("Configuración del contrato"); }}
                  title="Configuración del contrato"
                  aria-label="Configuración del contrato"
                >
                  <SettingsIcon />
                </button>
              )}
              <button
                type="button"
                className={styles.circleBtn}
                onClick={openParteSemanal}
                title="Parte semanal"
                aria-label="Parte semanal"
              >
                <CalendarIcon />
              </button>
            </div>
          </div>

          {/* Month navigation tabs */}
          <div className={styles.monthTabs}>
            {monthShort.map((m, idx) => {
              const active = idx === currentDate.getMonth();
              return (
                <button
                  key={m}
                  type="button"
                  className={`${styles.monthTab} ${active ? styles.monthTabActive : ""}`}
                  onClick={() => setMonthIndex(idx)}
                  aria-pressed={active}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </header>

        {hint && <div className={styles.hint}>{hint}</div>}

        {/* ============== Main ============== */}
        <main className={styles.main}>
          {/* Summary card */}
          <section className={styles.section}>
            <div className={styles.glassCardPad}>
              <div className={styles.summaryHead}>
                <div>
                  <div className={styles.kicker}>Nómina estimada (mes)</div>
                  <div className={styles.bigNumber}>
                    {Number(result?.total || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.chipBtn}
                  onClick={handleRecalculate}
                  title="Recalcular"
                >
                  <CalcIcon />
                  Recalcular
                </button>
              </div>

              {result && (
                <div className={styles.summaryBody}>
                  <NominaResultCard result={result} />
                </div>
              )}
            </div>
          </section>

          {/* Parte diario */}
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <div className={styles.sectionTitle}>
                <span className={styles.sectionIcon}><CalendarIcon /></span>
                Parte diario
              </div>

              <div className={styles.subtleRight}>
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </div>
            </div>

            <div className={styles.glassCardPad}>
              <div className={styles.calendarHint}>
                Haz clic en un día para añadir o editar el parte diario.
              </div>

              <NominaCalendar
                date={currentDate}
                zilePontaj={zilePontaj}
                onPickDay={openParte}
              />

              <div className={styles.selectorBar}>
                <select
                  className={styles.select}
                  value={selectedSummaryDay}
                  onChange={(e) => setSelectedSummaryDay(Number(e.target.value))}
                >
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      Día {day}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => openSummary(selectedSummaryDay - 1)}
                >
                  Ver parte
                </button>
              </div>
            </div>
          </section>

          {/* Configuración del contrato (NUMAI admin/dispecer) */}
          {canConfigure && (
            <section className={styles.section}>
              <div className={styles.glassCard}>
                <div className={styles.cardHeaderRow}>
                  <div className={styles.cardHeaderTitle}>Configuración del contrato</div>
                  <button
                    type="button"
                    className={styles.linkLike}
                    onClick={() => setShowConfig((v) => !v)}
                  >
                    {showConfig ? "Ocultar" : "Editar"}
                  </button>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.kvRow}>
                    <div>
                      <div className={styles.kvLabel}>Precio por día trabajado</div>
                      <div className={styles.kvHint}>Se aplica automáticamente</div>
                    </div>
                    <div className={styles.kvValue}>
                      {Number(config.precio_dia_trabajado || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                    </div>
                  </div>

                  <div className={styles.kvRow}>
                    <div>
                      <div className={styles.kvLabel}>Precio por km</div>
                      <div className={styles.kvHint}>Cálculo automático</div>
                    </div>
                    <div className={styles.kvValue}>
                      {Number(config.precio_km || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                    </div>
                  </div>

                  <div className={styles.kvRow}>
                    <div>
                      <div className={styles.kvLabel}>Precio por contenedor</div>
                      <div className={styles.kvHint}>Se suma con el pontaje</div>
                    </div>
                    <div className={styles.kvValue}>
                      {Number(config.precio_contenedor || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                    </div>
                  </div>

                  <div className={styles.kvRow}>
                    <div>
                      <div className={styles.kvLabel}>Antigüedad (años chofer)</div>
                      <div className={styles.kvHint}>Se calcula por perfil</div>
                    </div>
                    <div className={styles.kvValue}>
                      {antigYears} años
                    </div>
                  </div>

                  {showConfig && (
                    <div className={styles.inlineConfig}>
                      <NominaConfigCard
                        config={config}
                        onChange={setConfig}
                        onSave={() => setShowConfig(false)}
                        userId={profile?.id}
                      />
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Context meta */}
          <div className={styles.meta}>
            <div>Chofer: {driverName}</div>
            <div>Vehículo: {vehicleId}</div>
          </div>
        </main>

        {/* Bottom action bar */}
        <div className={styles.bottomBar}>
          <button type="button" className={styles.bottomBtn} onClick={handleGeneratePdf}>
            Generar informe PDF
          </button>
        </div>

        {/* Modals */}
        <ParteDiarioModal
          isOpen={isParteOpen}
          onClose={closeParte}
          data={selectedDayIndex !== null ? zilePontaj[selectedDayIndex] : {}}
          onDataChange={handleDayDataChange}
          onToggleChange={handleToggleChange}
          onCurseChange={updateCurse}
          day={selectedDayIndex !== null ? selectedDayIndex + 1 : ""}
          monthName={monthNames[currentDate.getMonth()]}
          year={currentDate.getFullYear()}
        />

        {summaryModalData && (
          <SimpleSummaryModal data={summaryModalData} onClose={closeSummary} />
        )}

        <Suspense fallback={null}>
          {isWeeklyOpen && weeksData.length > 0 && (
            <WeeklySummaryModal
              isOpen={isWeeklyOpen}
              onClose={() => setIsWeeklyOpen(false)}
              weeks={weeksData}
              initialIndex={selectedWeekIndex}
              onChangeWeek={setSelectedWeekIndex}
            />
          )}
        </Suspense>
      </div>
    </Layout>
  );
}

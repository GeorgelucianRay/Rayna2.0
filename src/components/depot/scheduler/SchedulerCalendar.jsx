import React, { useMemo } from 'react';
import styles from './SchedulerCalendar.module.css';

const fmtISO = (d) => {
  // yyyy-mm-dd (fără TZ)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function SchedulerCalendar({
  date,                // Date selectat curent
  setDate,             // setter pentru schimbarea lunii/zii curente
  // HARTĂ cu zile → listă de programări în acea zi (pentru color + listare)
  programadosByDate = {}, // ex: { "2025-09-21": [row, row,...], ... }

  // Când dai click pe o zi în modul normal → vrem să afișăm lista acelei zile
  onPickDay,           // (iso, items) => void

  // MODUL DE SELECȚIE MULTIPĂ (pentru export în Completado)
  selectable = false,  // dacă true, click-ul face toggle de selecție, nu deschide listă
  selectedDates = new Set(), // set(string ISO)
  onToggleSelect,      // (iso) => void

  // opțional: etichete custom pentru limbă (fallback spaniolă)
  weekLabels = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'],
  locale = 'es-ES',
}) {
  const today = new Date();
  const year  = date.getFullYear();
  const month = date.getMonth();

  const daysInMonth = useMemo(
    () => new Date(year, month + 1, 0).getDate(),
    [year, month]
  );

  // Pornește de LUNI (Mon-first)
  const firstDay = new Date(year, month, 1).getDay(); // 0..6 (duminică=0)
  const leadingEmpty = (firstDay + 6) % 7;

  const goPrevMonth = () => setDate(new Date(year, month - 1, 1));
  const goNextMonth = () => setDate(new Date(year, month + 1, 1));
  const goToday     = () => setDate(new Date());

  const handleClickDay = (day) => {
    const d = new Date(year, month, day);
    const iso = fmtISO(d);

    if (selectable) {
      onToggleSelect?.(iso);
      return;
    }

    // modul normal: setăm ziua și notificăm lista zilei
    setDate(d);
    const items = programadosByDate[iso] || [];
    onPickDay?.(iso, items);
  };

  return (
    <div className={styles.sideCard}>
      <div className={styles.sideHeader}>
        <button className={styles.navBtn} onClick={goPrevMonth} aria-label="Mes anterior">‹</button>
        <h3 className={styles.monthTitle}>
          {date.toLocaleString(locale, { month: 'long' })} {year}
        </h3>
        <button className={styles.navBtn} onClick={goNextMonth} aria-label="Mes siguiente">›</button>
        <button className={styles.todayBtn} onClick={goToday}>Hoy</button>
      </div>

      <div className={styles.week}>
        {weekLabels.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className={styles.calendar}>
        {Array.from({ length: leadingEmpty }).map((_, i) => (
          <div key={`ph-${i}`} className={styles.placeholderDay} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const cellDate = new Date(year, month, day);
          const iso = fmtISO(cellDate);

          const isToday =
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear();

          const isSelected =
            day === date.getDate() &&
            month === date.getMonth() &&
            year === date.getFullYear();

          const hasProg = (programadosByDate[iso]?.length || 0) > 0;
          const isMultiPicked = selectable && selectedDates?.has?.(iso);

          return (
            <button
              key={day}
              type="button"
              onClick={() => handleClickDay(day)}
              className={[
                styles.day,
                isToday ? styles.today : '',
                isSelected && !selectable ? styles.dayActive : '',
                hasProg ? styles.dayHasProgramados : '',
                isMultiPicked ? styles.dayMultiSelected : '',
              ].join(' ')}
              title={hasProg ? `${programadosByDate[iso].length} programaciones` : ''}
            >
              <span className={styles.dayNumber}>{day}</span>
              {hasProg && <span className={styles.dotProg} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
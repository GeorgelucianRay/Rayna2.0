// src/components/Depot/scheduler/SchedulerCalendar.jsx
import React, { useMemo } from 'react';
import styles from './SchedulerCalendar.module.css';

/**
 * Props:
 * - date, setDate: luna/ziua curentă
 * - mode: 'todos' | 'programado' | 'pendiente' | 'completado'
 * - markers: { 'YYYY-MM-DD': number }  // zile cu programări
 * - selectedDates: Set<string>         // doar pt. completado
 * - onSelectDay(dayStr)                // single-day (non-completado)
 * - onToggleDate(dayStr)               // toggle pentru completado
 */
export default function SchedulerCalendar({
  date, setDate,
  mode,
  markers = {},
  selectedDates = new Set(),
  onSelectDay,
  onToggleDate,
}) {
  const today = new Date();
  const year = date.getFullYear();
  const month = date.getMonth();

  const daysInMonth = useMemo(
    () => new Date(year, month + 1, 0).getDate(),
    [year, month]
  );

  // 0=Sun..6=Sat → vrem să începem cu Luni
  const firstDay = new Date(year, month, 1).getDay(); // 0..6
  const leadingEmpty = (firstDay + 6) % 7;

  const fmt = (y, m, d) =>
    new Date(y, m, d).toISOString().slice(0, 10); // YYYY-MM-DD

  const handleClick = (day) => {
    const iso = fmt(year, month, day);
    // schimbă "date" (pt. navigație vizuală și pentru eventuale filtre globale)
    setDate(new Date(year, month, day));

    if (mode === 'completado') {
      onToggleDate?.(iso);
    } else {
      onSelectDay?.(iso);
    }
  };

  return (
    <div className={styles.sideCard}>
      <div className={styles.sideHeader}>
        <h3>
          {date.toLocaleString('es-ES', { month: 'long' })}{' '} {year}
        </h3>
      </div>

      <div className={styles.week}>
        {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className={styles.calendar}>
        {Array.from({ length: leadingEmpty }).map((_, i) => (
          <div key={`ph-${i}`} className={styles.placeholderDay} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isToday =
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear();

          const iso = fmt(year, month, day);
          const hasPrograms = !!markers[iso];

          const isSelected =
            mode === 'completado'
              ? selectedDates.has(iso)
              : iso === fmt(date.getFullYear(), date.getMonth(), date.getDate());

          return (
            <button
              key={day}
              type="button"
              onClick={() => handleClick(day)}
              className={[
                styles.day,
                isToday ? styles.today : '',
                isSelected ? styles.dayActive : '',
                hasPrograms ? styles.hasPrograms : '',
              ].join(' ')}
              title={hasPrograms ? `${markers[iso]} programado(s)` : undefined}
            >
              <span className={styles.dayNumber}>{day}</span>
              {hasPrograms && <span className={styles.dot} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
import React, { useMemo } from 'react';
import styles from './SchedulerCalendar.module.css';

// format local YYYY-MM-DD (fără conversie la UTC)
const pad = (n) => String(n).padStart(2, '0');
const fmtLocal = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

export default function SchedulerCalendar({
  date, setDate,
  mode,
  markers = {},              // { 'YYYY-MM-DD': number }
  selectedDates = new Set(), // doar pt. completado
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

  // 0=Sun..6=Sat → vrem Luni la început
  const firstDay = new Date(year, month, 1).getDay();
  const leadingEmpty = (firstDay + 6) % 7;

  const handleClick = (day) => {
    const iso = fmtLocal(year, month, day);
    setDate(new Date(year, month, day)); // doar pentru highlight & filtre
    if (mode === 'completado') onToggleDate?.(iso);
    else onSelectDay?.(iso);
  };

  const selectedKey = fmtLocal(date.getFullYear(), date.getMonth(), date.getDate());

  return (
    <div className={styles.sideCard}>
      <div className={styles.sideHeader}>
        <h3>
          {date.toLocaleString('es-ES', { month: 'long' })} {year}
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

          const iso = fmtLocal(year, month, day);
          const hasPrograms = !!markers[iso];

          const isSelected =
            mode === 'completado'
              ? selectedDates.has(iso)
              : iso === selectedKey;

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
              aria-pressed={isSelected ? 'true' : 'false'}
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
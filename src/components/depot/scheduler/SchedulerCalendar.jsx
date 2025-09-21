import React, { useMemo } from 'react';
import styles from './SchedulerCalendar.module.css';

export default function SchedulerCalendar({ date, setDate }) {
  const today = new Date();
  const year = date.getFullYear();
  const month = date.getMonth();

  const daysInMonth = useMemo(
    () => new Date(year, month + 1, 0).getDate(),
    [year, month]
  );

  // duminică=0 … sâmbătă=6; vrem să înceapă cu luni
  const firstDay = new Date(year, month, 1).getDay(); // 0..6
  const leadingEmpty = (firstDay + 6) % 7;

  const handleSelect = (day) => {
    const next = new Date(year, month, day);
    setDate(next);
  };

  return (
    <div className={styles.sideCard}>
      <div className={styles.sideHeader}>
        <h3>
          {date.toLocaleString('default', { month: 'long' })}{' '}
          {year}
        </h3>
      </div>

      <div className={styles.week}>
        {['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sa', 'Du'].map((d) => (
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
          const isSelected =
            day === date.getDate() &&
            month === date.getMonth() &&
            year === date.getFullYear();

          return (
            <button
              key={day}
              type="button"
              onClick={() => handleSelect(day)}
              className={[
                styles.day,
                isToday ? styles.today : '',
                isSelected ? styles.dayActive : '',
              ].join(' ')}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
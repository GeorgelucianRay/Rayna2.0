import React, { useMemo } from 'react';
import styles from './SchedulerCalendar.module.css';

export default function SchedulerCalendar({ date, setDate }) {
  const today = new Date();

  // luna & anul curent din "date"
  const year = date.getFullYear();
  const month = date.getMonth();

  // număr zile în luna respectivă
  const daysInMonth = useMemo(() => 
    new Date(year, month + 1, 0).getDate(),
    [year, month]
  );

  // prima zi din lună (luni=1 … duminică=0)
  const firstDay = new Date(year, month, 1).getDay();

  // funcție pentru click pe o zi
  const handleSelect = (day) => {
    const newDate = new Date(year, month, day);
    setDate(newDate);
  };

  return (
    <div className={styles.calendar}>
      <div className={styles.header}>
        {date.toLocaleString('default', { month: 'long' })} {year}
      </div>
      <div className={styles.weekdays}>
        {['Lu','Ma','Mi','Jo','Vi','Sa','Du'].map((d) => (
          <div key={d} className={styles.weekday}>{d}</div>
        ))}
      </div>
      <div className={styles.days}>
        {/* spații goale până la prima zi */}
        {Array.from({ length: (firstDay + 6) % 7 }).map((_, i) => (
          <div key={`empty-${i}`} className={styles.empty}></div>
        ))}

        {/* zilele lunii */}
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
            <div
              key={day}
              className={`${styles.day} 
                ${isToday ? styles.today : ''} 
                ${isSelected ? styles.selected : ''}`}
              onClick={() => handleSelect(day)}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

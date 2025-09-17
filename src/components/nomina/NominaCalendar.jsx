// src/components/nomina/NominaCalendar.jsx
import React, { useMemo } from 'react';
import styles from './Nominas.module.css';

// Día del calendario
const CalendarDay = ({ day, data, onPick, isPlaceholder }) => {
  const hasData = !isPlaceholder && data && (
    data.desayuno || data.cena || data.procena ||
    (Number(data.km_final) > 0) ||
    (Number(data.contenedores) > 0) ||
    (data.curse && data.curse.length > 0)
  );

  const cls = [
    styles.calendarDay,
    isPlaceholder ? styles.placeholderDay : '',
    hasData ? styles.hasData : ''
  ].join(' ');

  return (
    <div className={cls} onClick={!isPlaceholder ? onPick : undefined}>
      <span className={styles.dayNumber}>{day}</span>
    </div>
  );
};

// Calendario principal
export default function NominaCalendar({ date, zilePontaj, onPickDay }) {
  const cells = useMemo(() => {
    const y = date.getFullYear();
    const m = date.getMonth();
    const first = new Date(y, m, 1).getDay();
    const daysIn = new Date(y, m + 1, 0).getDate();
    const start = first === 0 ? 6 : first - 1;

    const arr = [];
    for (let i = 0; i < start; i++) {
      arr.push(<CalendarDay key={`ph-s-${i}`} isPlaceholder />);
    }

    for (let d = 1; d <= daysIn; d++) {
      arr.push(
        <CalendarDay
          key={d}
          day={d}
          data={zilePontaj[d - 1]}
          onPick={() => onPickDay(d - 1)}
          isPlaceholder={false}
        />
      );
    }

    while (arr.length % 7 !== 0) {
      arr.push(<CalendarDay key={`ph-e-${arr.length}`} isPlaceholder />);
    }
    return arr;
  }, [date, zilePontaj, onPickDay]);

  return (
    <>
      <div className={styles.calendarWeekdays}>
        <div>Lu</div>
        <div>Ma</div>
        <div>Mi</div>
        <div>Ju</div>
        <div>Vi</div>
        <div>Sá</div>
        <div>Do</div>
      </div>
      <div className={styles.calendarGrid}>{cells}</div>
    </>
  );
}
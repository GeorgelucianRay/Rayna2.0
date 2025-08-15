// src/components/nomina/NominaCalendar.jsx
import React, { useMemo } from 'react';
import styles from './Nominas.module.css';

const CalendarDay = ({ day, data, onClick, isPlaceholder }) => {
  const hasData = !isPlaceholder && (
    data?.desayuno || data?.cena || data?.procena ||
    ((+data?.km_final || 0) > (+data?.km_iniciar || 0)) ||
    (data?.contenedores || 0) > 0 ||
    (data?.suma_festivo || 0) > 0
  );
  const cls = [
    styles.calendarDay,
    isPlaceholder ? styles.placeholderDay : '',
    hasData ? styles.hasData : ''
  ].join(' ');
  return (
    <div className={cls} onClick={!isPlaceholder ? onClick : undefined}>
      <span className={styles.dayNumber}>{day}</span>
    </div>
  );
};

export default function NominaCalendar({ date, zilePontaj, onPickDay }) {
  const cells = useMemo(() => {
    const y = date.getFullYear();
    const m = date.getMonth();
    const first = new Date(y, m, 1).getDay(); // 0=Do
    const daysIn = new Date(y, m + 1, 0).getDate();
    const start = first === 0 ? 6 : first - 1; // Luni începe

    const arr = [];
    for (let i = 0; i < start; i++) {
      arr.push(<CalendarDay key={`ph-s-${i}`} isPlaceholder day="" data={null} onClick={null} />);
    }
    for (let d = 1; d <= daysIn; d++) {
      arr.push(
        <CalendarDay
          key={d}
          day={d}
          data={zilePontaj[d - 1]}
          onClick={() => onPickDay(d - 1)}
          isPlaceholder={false}
        />
      );
    }
    while (arr.length % 7 !== 0) {
      const k = `ph-e-${arr.length}`;
      arr.push(<CalendarDay key={k} isPlaceholder day="" data={null} onClick={null} />);
    }
    return arr;
  }, [date, zilePontaj, onPickDay]);

  return (
    <>
      <div className={styles.calendarWeekdays}>
        <div>Lu</div><div>Ma</div><div>Mi</div><div>Ju</div><div>Vi</div><div>Sá</div><div>Do</div>
      </div>
      <div className={styles.calendarGrid}>{cells}</div>
    </>
  );
}

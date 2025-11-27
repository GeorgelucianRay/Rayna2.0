// src/components/nomina/NominaCalendar.jsx
import React, { useMemo } from 'react';
import styles from './Nominas.module.css';

const CalendarDay = ({ day, data, onPick, isPlaceholder }) => {
  const safeData = data || {};
  const hasData =
    !isPlaceholder &&
    (
      safeData.desayuno ||
      safeData.cena ||
      safeData.procena ||
      Number(safeData.km_final) > 0 ||
      Number(safeData.contenedores) > 0 ||
      (Array.isArray(safeData.curse) && safeData.curse.length > 0)
    );

  const cls = [
    styles.calendarDay,
    isPlaceholder ? styles.placeholderDay : '',
    hasData ? styles.hasData : ''
  ].join(' ');

  return (
    <div
      className={cls}
      onClick={!isPlaceholder ? onPick : undefined}
    >
      <span className={styles.dayNumber}>{day || ''}</span>
    </div>
  );
};


export default function NominaCalendar({ date, zilePontaj, onPickDay }) {
  const cells = useMemo(() => {
    const y = date.getFullYear();
    const m = date.getMonth();

    const first = new Date(y, m, 1).getDay();
    const daysIn = new Date(y, m + 1, 0).getDate();

    const start = first === 0 ? 6 : first - 1;

    const arr = [];

    // placeholders la început
    for (let i = 0; i < start; i++) {
      arr.push(
        <CalendarDay
          key={`ph-s-${i}`}
          isPlaceholder={true}
          day=""
          data={{}}
        />
      );
    }

    // zilele reale
    for (let d = 1; d <= daysIn; d++) {
      arr.push(
        <CalendarDay
          key={d}
          day={d}
          data={zilePontaj[d - 1] || {}}
          onPick={() => onPickDay(d - 1)}
          isPlaceholder={false}
        />
      );
    }

    // placeholders la final
    while (arr.length % 7 !== 0) {
      arr.push(
        <CalendarDay
          key={`ph-e-${arr.length}`}
          isPlaceholder={true}
          day=""
          data={{}}
        />
      );
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
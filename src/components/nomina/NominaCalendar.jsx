// src/components/nomina/NominaCalendar.jsx
import React, { useMemo } from "react";
import styles from "./Calendar.module.css";

const CalendarDay = ({ day, data, onPick, isPlaceholder, isToday }) => {
  const safeData = data || {};
  const hasData =
    !isPlaceholder &&
    (
      safeData.desayuno ||
      safeData.cena ||
      safeData.procena ||
      Number(safeData.km_final) > 0 ||
      Number(safeData.contenedores) > 0 ||
      (Array.isArray(safeData.curse) && safeData.curse.length > 0) ||
      Number(safeData.suma_festivo) > 0
    );

  const cls = [
    styles.calendarDay,
    isPlaceholder ? styles.placeholderDay : "",
    hasData ? styles.hasData : "",
    isToday ? styles.today : "",
  ].join(" ");

  return (
    <button
      type="button"
      className={cls}
      onClick={!isPlaceholder ? onPick : undefined}
      disabled={isPlaceholder}
      aria-label={day ? `Día ${day}` : "Vacío"}
    >
      <span className={styles.dayNumber}>{day || ""}</span>
      {hasData && <span className={styles.indicatorDot} aria-hidden="true" />}
    </button>
  );
};

export default function NominaCalendar({ date, zilePontaj, onPickDay }) {
  const cells = useMemo(() => {
    const y = date.getFullYear();
    const m = date.getMonth();

    const first = new Date(y, m, 1).getDay();
    const daysIn = new Date(y, m + 1, 0).getDate();

    const start = first === 0 ? 6 : first - 1;

    const today = new Date();
    const isSameMonth =
      today.getFullYear() === y && today.getMonth() === m;

    const arr = [];

    for (let i = 0; i < start; i++) {
      arr.push(
        <CalendarDay
          key={`ph-s-${i}`}
          isPlaceholder
          day=""
          data={{}}
        />
      );
    }

    for (let d = 1; d <= daysIn; d++) {
      const isToday = isSameMonth && today.getDate() === d;

      arr.push(
        <CalendarDay
          key={d}
          day={d}
          data={zilePontaj[d - 1] || {}}
          onPick={() => onPickDay(d - 1)}
          isPlaceholder={false}
          isToday={isToday}
        />
      );
    }

    while (arr.length % 7 !== 0) {
      arr.push(
        <CalendarDay
          key={`ph-e-${arr.length}`}
          isPlaceholder
          day=""
          data={{}}
        />
      );
    }

    return arr;
  }, [date, zilePontaj, onPickDay]);

  return (
    <div className={styles.calendarWrap}>
      <div className={styles.calendarWeekdays}>
        <div>Lu</div><div>Ma</div><div>Mi</div><div>Ju</div><div>Vi</div><div>Sá</div><div>Do</div>
      </div>

      <div className={styles.calendarGrid}>{cells}</div>
    </div>
  );
}

// src/components/nomina/NominaCalendar.jsx
import React, { useMemo } from 'react';
import styles from './Nominas.module.css';

// MODIFICAT: Componenta CalendarDay a fost actualizată pentru a include butonul "Ver"
const CalendarDay = ({ day, data, onPick, onView, isPlaceholder }) => {
  // Logica pentru a determina dacă o zi are date a fost actualizată
  const hasData = !isPlaceholder && data && (
    data.desayuno || data.cena || data.procena ||
    (Number(data.km_final) > Number(data.km_iniciar)) ||
    (Number(data.contenedores) > 0) ||
    (Number(data.suma_festivo) > 0) ||
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
      
      {/* NOU: Adăugarea condiționată a butonului "Ver" */}
      {hasData && (
        <button 
          className={styles.viewDayButton} 
          onClick={(e) => {
            e.stopPropagation(); // Esențial: Oprește propagarea pentru a nu deschide și modalul de editare
            onView();
          }}
        >
          Ver
        </button>
      )}
    </div>
  );
};


// MODIFICAT: Componenta principală primește acum și proprietatea "onViewDay"
export default function NominaCalendar({ date, zilePontaj, onPickDay, onViewDay }) {
  const cells = useMemo(() => {
    const y = date.getFullYear();
    const m = date.getMonth();
    const first = new Date(y, m, 1).getDay(); // Duminica=0, Luni=1...
    const daysIn = new Date(y, m + 1, 0).getDate();
    
    // Corectează începutul săptămânii pentru a fi Luni
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
          onView={() => onViewDay(d - 1)} // NOU: Trimitem funcția către buton
          isPlaceholder={false}
        />
      );
    }
    
    // Completează restul grilei până la 7 coloane
    while (arr.length % 7 !== 0) {
      const k = `ph-e-${arr.length}`;
      arr.push(<CalendarDay key={k} isPlaceholder />);
    }
    return arr;
    
  // MODIFICAT: Am adăugat 'onViewDay' în lista de dependențe
  }, [date, zilePontaj, onPickDay, onViewDay]);

  return (
    <>
      <div className={styles.calendarWeekdays}>
        <div>Lu</div><div>Ma</div><div>Mi</div><div>Ju</div><div>Vi</div><div>Sá</div><div>Do</div>
      </div>
      <div className={styles.calendarGrid}>{cells}</div>
    </>
  );
}

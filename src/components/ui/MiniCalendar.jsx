import React from 'react';
import styles from './MiniCalendar.module.css';

export default function MiniCalendar({ date, marks }) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const first = new Date(y, m, 1);
  const startDay = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startDay; i++) {
    cells.push({ blank: true, key: `b-${i}` });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, key: `d-${d}` });
  }

  return (
    <div className={styles.miniCal}>
      <div className={styles.miniCalHead}>
        <span>Lu</span><span>Ma</span><span>Mi</span><span>Ju</span><span>Vi</span><span>Sá</span><span>Do</span>
      </div>
      <div className={styles.miniCalGrid}>
        {cells.map((c) =>
          c.blank ? (
            <div key={c.key} className={styles.miniBlank} />
          ) : (
            <div
              key={c.key}
              className={`${styles.miniDay} ${marks?.has(c.day) ? styles.miniHasData : ''}`}
            >
              {c.day}
            </div>
          )
        )}
      </div>
    </div>
  );
}

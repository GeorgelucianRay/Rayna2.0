// src/components/depot/scheduler/SchedulerToolbar.jsx
import React from "react";
import { Link } from "react-router-dom";
import styles from "./SchedulerToolbar.module.css";

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="currentColor"
      d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1.2A2.8 2.8 0 0 1 22 6.8v13.4A2.8 2.8 0 0 1 19.2 23H4.8A2.8 2.8 0 0 1 2 20.2V6.8A2.8 2.8 0 0 1 4.8 4H6V3a1 1 0 0 1 1-1Zm13 8H4v10.2c0 .44.36.8.8.8h14.4c.44 0 .8-.36.8-.8V10ZM6 6H4.8a.8.8 0 0 0-.8.8V8h16V6.8a.8.8 0 0 0-.8-.8H18v1a1 1 0 1 1-2 0V6H8v1a1 1 0 1 1-2 0V6Z"
    />
  </svg>
);

const ExcelIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="currentColor"
      d="M14 2H6.5A2.5 2.5 0 0 0 4 4.5v15A2.5 2.5 0 0 0 6.5 22H17.5A2.5 2.5 0 0 0 20 19.5V8l-6-6Zm1 1.5L18.5 7H15a1 1 0 0 1-1-1V3.5ZM6.8 17.9l2.2-3.2-2.1-3.1h1.8l1.2 2 1.2-2h1.8l-2.1 3.1 2.2 3.2h-1.8l-1.3-2.1-1.3 2.1H6.8Z"
    />
  </svg>
);

export default function SchedulerToolbar({
  tabs,
  tab,
  setTab,
  query,
  setQuery,
  date,
  setDate,
  onExportExcel,
  onProgramarClick,
  canProgramar,
  showCalendar,
  onToggleCalendar,
}) {
  const monthLabel = date.toLocaleString("es-ES", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className={styles.toolbar}>
      {/* ROW 1 */}
      <div className={styles.rowTop}>
        <Link to="/depot" className={styles.backBtn}>
          ← Volver
        </Link>

        <h1 className={styles.title}>Programar Contenedor</h1>

        <div className={styles.topRight} />
      </div>

      {/* ROW 2 */}
      <div className={styles.tabs}>
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            className={`${styles.tab} ${tab === t ? styles.active : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "programado" ? "Programado" : t === "pendiente" ? "Pendiente" : "Completado"}
          </button>
        ))}
      </div>

      {/* ROW 3 */}
      <div className={styles.rowBottom}>
        <input
          className={styles.search}
          placeholder="Buscar por matrícula, empresa…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          inputMode="search"
        />

        <button
          type="button"
          className={styles.month}
          onClick={() => setDate(new Date())}
          title="Ir a este mes"
        >
          {monthLabel}
        </button>

        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.iconBtn} ${showCalendar ? styles.iconBtnActive : ""}`}
            onClick={onToggleCalendar}
            aria-label="Calendario"
            title="Calendario"
          >
            <CalendarIcon />
          </button>

          <button
            type="button"
            className={styles.iconBtn}
            onClick={onExportExcel}
            aria-label="Exportar Excel"
            title="Exportar Excel"
          >
            <ExcelIcon />
          </button>

          {canProgramar && (
            <button
              type="button"
              className={`${styles.iconBtn} ${styles.primaryBtn}`}
              onClick={onProgramarClick}
              aria-label="Programar contenedor"
              title="Programar"
            >
              +
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
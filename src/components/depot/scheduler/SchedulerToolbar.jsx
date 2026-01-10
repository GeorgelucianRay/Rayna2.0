import React from "react";
import { Link } from "react-router-dom";
import styles from "./SchedulerToolbar.module.css";

export default function SchedulerToolbar({
  backTo = "/depot",
  title = "Programación",
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
      {/* TOP ROW: Back + Title */}
      <div className={styles.topRow}>
        <Link to={backTo} className={styles.backBtn} aria-label="Volver">
          ← Volver
        </Link>
        <div className={styles.topTitle}>{title}</div>
        <div className={styles.topRight} />
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            className={`${styles.tab} ${tab === t ? styles.active : ""}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className={styles.filters}>
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
          title="Saltar a este mes"
        >
          {monthLabel}
        </button>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.calendarBtn}
          onClick={onToggleCalendar}
          aria-label={showCalendar ? "Cerrar calendario" : "Abrir calendario"}
          title={showCalendar ? "Cerrar calendario" : "Abrir calendario"}
        >
          <img src="/Calendar.JPG" alt="" />
        </button>

        <button
          type="button"
          className={styles.excelBtn}
          onClick={onExportExcel}
          aria-label="Exportar a Excel"
          title="Exportar a Excel"
        >
          <img src="/excel_circle_green.png" alt="" />
        </button>

        {canProgramar && (
          <button
            type="button"
            className={`${styles.programarBtn} ${styles.programarSkin}`}
            onClick={onProgramarClick}
            aria-label="Programar contenedor"
            title="Programar contenedor"
          />
        )}
      </div>
    </div>
  );
}
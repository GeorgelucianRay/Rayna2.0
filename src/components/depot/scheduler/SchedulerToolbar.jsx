import React from "react";
import { Link } from "react-router-dom";
import styles from "./SchedulerToolbar.module.css";

export default function SchedulerToolbar({
  tabs,
  tab, setTab,
  query, setQuery,
  date, setDate,
  onExportExcel,
  onProgramarClick,
  canProgramar,
  showCalendar,
  onToggleCalendar,
}) {
  const monthLabel = date.toLocaleString("es-ES", { month: "long", year: "numeric" });

  return (
    <div className={styles.toolbar}>
      {/* ROW 1: Back + Title */}
      <div className={styles.rowTop}>
        <Link to="/depot" className={styles.backBtn}>← Volver</Link>
        <h1 className={styles.title}>Programar Contenedor</h1>
        <div className={styles.topRight} />
      </div>

      {/* ROW 2: Tabs */}
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

      {/* ROW 3: Search + Month + Actions */}
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
          <button type="button" className={styles.iconBtn} onClick={onToggleCalendar} aria-label="Calendario">
            <img src="/Calendar.JPG" alt="" />
          </button>

          <button type="button" className={styles.iconBtn} onClick={onExportExcel} aria-label="Exportar Excel">
            <img src="/excel_circle_green.png" alt="" />
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
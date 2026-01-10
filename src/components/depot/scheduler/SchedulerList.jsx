import React from "react";
import styles from "./SchedulerList.module.css";

function Badge({ row }) {
  // programări din tabelul programados
  if (row.source === "programados") {
    if ((row.estado || "").toLowerCase() === "pendiente") {
      return <span className={`${styles.badge} ${styles.badgeWarn}`}>Pendiente</span>;
    }
    return <span className={`${styles.badge} ${styles.badgeInfo}`}>Programado</span>;
  }

  // dacă vine din depozit (contenedores)
  return <span className={`${styles.badge} ${styles.badgeNeutral}`}>En depósito</span>;
}

function SchedulerItem({ row, onSelect }) {
  const key =
    (row.source === "programados" ? row.programado_id : row.id) ||
    row.matricula_contenedor ||
    `${row.fecha || ""}-${row.hora || ""}`;

  return (
    <li
      key={key}
      className={styles.item}
      onClick={() => onSelect(row)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect(row)}
      title="Ver detalles"
    >
      <div className={styles.itemTop}>
        <span className={styles.dot} />
        <span className={styles.cid}>{(row.matricula_contenedor || "").toUpperCase()}</span>
        <Badge row={row} />
      </div>

      <div className={styles.meta}>
        <span className={styles.cliente}>{row.empresa_descarga || row.naviera || "—"}</span>
        {row.fecha && <span className={styles.fecha}>{row.fecha}</span>}
        {row.hora && <span className={styles.time}>{row.hora}</span>}
      </div>

      {/* extra info mic, optional */}
      {(row.posicion || row.tipo || row.matricula_camion) && (
        <div className={styles.meta2}>
          {row.posicion && <span className={styles.chip}>Pos: {row.posicion}</span>}
          {row.tipo && <span className={styles.chip}>{row.tipo}</span>}
          {row.matricula_camion && <span className={styles.chip}>Camión: {row.matricula_camion}</span>}
        </div>
      )}
    </li>
  );
}

function CompletedItem({ row, onSelect }) {
  return (
    <li
      key={row.id}
      className={styles.item}
      onClick={() => onSelect(row)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect(row)}
      title="Ver detalles"
    >
      <div className={styles.itemTop}>
        <span className={styles.dot} />
        <span className={styles.cid}>
          {(row.matricula_contenedor || row.cid || row.id || "").toString().toUpperCase()}
        </span>
        <span className={`${styles.badge} ${styles.badgeOk}`}>Completado</span>
      </div>

      <div className={styles.meta}>
        <span className={styles.cliente}>{row.empresa_descarga || "—"}</span>
        {row.fecha_salida && (
          <span className={styles.fecha}>{new Date(row.fecha_salida).toLocaleString()}</span>
        )}
      </div>
    </li>
  );
}

export default function SchedulerList({ items, tab, loading, onSelect }) {
  if (loading) {
    return (
      <div className={styles.card}>
        <p className={styles.stateText}>Cargando…</p>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className={styles.card}>
        <p className={styles.stateText}>No hay datos.</p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <ul className={styles.list}>
        {tab === "completado"
          ? items.map((row) => <CompletedItem key={row.id} row={row} onSelect={onSelect} />)
          : items.map((row) => (
              <SchedulerItem key={row.programado_id || row.id} row={row} onSelect={onSelect} />
            ))}
      </ul>
    </div>
  );
}
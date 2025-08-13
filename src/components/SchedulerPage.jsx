import React, { useMemo, useState, useEffect } from "react";
import styles from "./SchedulerStandalone.module.css";

// SVG inline (fără librării externe)
const ArrowLeft = (props) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);
const Search = (props) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const STATUS = ["Todos", "Programado", "En progreso", "Pendiente", "Completado"];

export default function SchedulerPage() {
  // date reale: le poți lua din Supabase aici; momentan demo local
  const [items, setItems] = useState([
    { id: "c1", contenedor_id: "CONT-001", cliente: "TransLog S.A.", fecha: "2025-08-20", hora: "10:00", placa: "B-123-XYZ", status: "Programado" },
    { id: "c2", contenedor_id: "CONT-002", cliente: "CargoMar",     fecha: "2025-08-21", hora: "14:30", placa: "B-555-TRK", status: "Pendiente" },
  ]);

  const [filter, setFilter] = useState("Todos");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  // modal Nuevo
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ contenedor_id: "", cliente: "", fecha: "", hora: "", placa: "" });

  const filtered = useMemo(() => {
    return items.filter((p) => {
      const okStatus = filter === "Todos" ? true : p.status === filter;
      const okSearch =
        (p.contenedor_id + " " + p.cliente + " " + p.placa).toLowerCase().includes(search.toLowerCase());
      const okDate = dateFilter ? p.fecha === dateFilter : true;
      return okStatus && okSearch && okDate;
    });
  }, [items, filter, search, dateFilter]);

  // TODO: înlocuiește cu navigate('/depot') dacă folosești react-router aici
  const goBack = () => (window.location.href = "/depot");

  const handleSave = (e) => {
    e.preventDefault();
    // TODO: inserare în Supabase (contenedores_programados) + ștergere din contenedores
    const newItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      contenedor_id: form.contenedor_id || `CONT-${Math.floor(Math.random()*900+100)}`,
      cliente: form.cliente || "—",
      fecha: form.fecha || "",
      hora: form.hora || "",
      placa: form.placa || "",
      status: "Pendiente",
    };
    setItems([newItem, ...items]);
    setIsModalOpen(false);
    setForm({ contenedor_id: "", cliente: "", fecha: "", hora: "", placa: "" });
  };

  const statusClass = (s) => ({
    Programado: styles.bProgramado,
    "En progreso": styles.bEnprogreso,
    Pendiente: styles.bPendiente,
    Completado: styles.bCompletado,
  }[s] || "");

  return (
    <div className={styles.pageWrap}>
      {/* fundal difuz */}
      <div className={styles.bg} />
      <div className={styles.vignette} />

      {/* bară sus */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={goBack}><ArrowLeft /> Depot</button>
        <h2 className={styles.title}>Programar Contenedor</h2>
        <button className={styles.newBtn} onClick={() => setIsModalOpen(true)}>Nuevo</button>
      </div>

      {/* card central */}
      <section className={styles.card}>
        {/* toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.chips}>
            {STATUS.map((c) => (
              <button key={c} className={`${styles.chip} ${filter === c ? styles.chipActive : ""}`} onClick={() => setFilter(c)}>
                {c}
              </button>
            ))}
          </div>
          <div className={styles.inputs}>
            <div className={styles.search}>
              <Search className={styles.searchIcon} />
              <input type="text" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <input type="date" className={styles.date} value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          </div>
        </div>

        {/* grid listă + calendar */}
        <div className={styles.grid}>
          {/* listă programări */}
          <ul className={styles.list}>
            {filtered.length === 0 ? (
              <li className={styles.muted}>No hay contenedores programados.</li>
            ) : filtered.map((p) => (
              <li key={p.id} className={styles.item}>
                <div>
                  <div className={styles.itemTop}>
                    <span className={styles.dot}></span>
                    <span className={styles.cid}>{p.contenedor_id}</span>
                    <span className={`${styles.badge} ${statusClass(p.status)}`}>{p.status}</span>
                  </div>
                  <div className={styles.meta}>
                    <span className={styles.cliente}>{p.cliente}</span>
                    <span className={styles.fecha}>📅 {p.fecha || "—"}</span>
                    <span className={styles.time}>⏱ {p.hora || "—"}</span>
                    <span className={styles.plate}>🚚 {p.placa || "—"}</span>
                  </div>
                </div>
                <div className={styles.actions}>
                  <button className={styles.actionMini}>Editar</button>
                  <button className={styles.actionOk}>Salida</button>
                  <button className={styles.actionGhost}>Eliminar</button>
                </div>
              </li>
            ))}
          </ul>

          {/* calendar lateral (dummy) */}
          <div className={styles.sideCard}>
            <div className={styles.sideHeader}><h3>Contenedor 2024</h3></div>
            <div className={styles.week}>{["L","M","X","J","V","S","D"].map(d=><span key={d}>{d}</span>)}</div>
            <div className={styles.calendar}>
              {Array.from({ length: 31 }, (_, i) => (
                <div key={i} className={`${styles.day} ${i===19 ? styles.dayActive : ""}`}>{i+1}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* modal Nuevo */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modal} onClick={(e)=>e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Programar Contenedor</h3>
              <button className={styles.closeIcon} onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form className={styles.modalBody} onSubmit={handleSave}>
              <div className={styles.inputGroup}>
                <label>Container ID</label>
                <input value={form.contenedor_id} onChange={(e)=>setForm({...form, contenedor_id: e.target.value})} placeholder="UUID / ID" />
              </div>
              <div className={styles.inputGrid}>
                <div className={styles.inputGroup}>
                  <label>Cliente</label>
                  <input value={form.cliente} onChange={(e)=>setForm({...form, cliente: e.target.value})} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Matrícula</label>
                  <input value={form.placa} onChange={(e)=>setForm({...form, placa: e.target.value})} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Fecha</label>
                  <input type="date" value={form.fecha} onChange={(e)=>setForm({...form, fecha: e.target.value})} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Hora</label>
                  <input type="time" value={form.hora} onChange={(e)=>setForm({...form, hora: e.target.value})} />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.actionGhost} onClick={()=>setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className={styles.actionOk}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
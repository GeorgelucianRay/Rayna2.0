import React, { useState } from "react";
import styles from "./SchedulerStandalone.module.css";
import { ArrowLeftIcon, SearchIcon } from "@heroicons/react/outline";

const SchedulerPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState("Todos");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    contenedor_id: "",
    cliente: "",
    fecha: "",
    hora: "",
    placa: "",
  });

  const programari = [
    {
      id: "c1",
      contenedor_id: "CONT-001",
      cliente: "TransLog S.A.",
      fecha: "2025-08-20",
      hora: "10:00",
      placa: "B-123-XYZ",
      status: "Programado",
    },
    {
      id: "c2",
      contenedor_id: "CONT-002",
      cliente: "CargoMar",
      fecha: "2025-08-21",
      hora: "14:30",
      placa: "B-555-TRK",
      status: "Pendiente",
    },
  ];

  const statusColors = {
    Programado: styles.bProgramado,
    "En progreso": styles.bEnprogreso,
    Pendiente: styles.bPendiente,
    Completado: styles.bCompletado,
  };

  const handleSave = (e) => {
    e.preventDefault();
    console.log("Salvat:", form);
    // TODO: inserare în contenedores_programados
    // TODO: ștergere din contenedores
    setIsModalOpen(false);
  };

  return (
    <div className={styles.pageWrap}>
      {/* Fundal */}
      <div className={styles.bg}></div>
      <div className={styles.vignette}></div>

      {/* Bara de sus */}
      <div className={styles.topBar}>
        <button className={styles.backBtn}>
          <ArrowLeftIcon width={18} /> Înapoi
        </button>
        <h2 className={styles.title}>Scheduler</h2>
        <button className={styles.newBtn} onClick={() => setIsModalOpen(true)}>
          Nuevo
        </button>
      </div>

      {/* Card central */}
      <section className={styles.card}>
        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.chips}>
            {["Todos", "Programado", "En progreso", "Pendiente", "Completado"].map((c) => (
              <button
                key={c}
                className={`${styles.chip} ${
                  filter === c ? styles.chipActive : ""
                }`}
                onClick={() => setFilter(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div className={styles.inputs}>
            <div className={styles.search}>
              <SearchIcon width={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Caută..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <input type="date" className={styles.date} />
          </div>
        </div>

        {/* Grid listă + calendar */}
        <div className={styles.grid}>
          {/* Lista de programări */}
          <ul className={styles.list}>
            {programari
              .filter(
                (p) =>
                  (filter === "Todos" || p.status === filter) &&
                  (p.contenedor_id.toLowerCase().includes(search.toLowerCase()) ||
                    p.cliente.toLowerCase().includes(search.toLowerCase()))
              )
              .map((p) => (
                <li key={p.id} className={styles.item}>
                  <div>
                    <div className={styles.itemTop}>
                      <span className={styles.dot}></span>
                      <span className={styles.cid}>{p.contenedor_id}</span>
                    </div>
                    <div className={styles.meta}>
                      <span className={styles.cliente}>{p.cliente}</span>
                      <span className={styles.fecha}>{p.fecha}</span>
                      <span className={styles.time}>{p.hora}</span>
                      <span className={styles.plate}>{p.placa}</span>
                    </div>
                  </div>
                  <div className={styles.actions}>
                    <span
                      className={`${styles.badge} ${
                        statusColors[p.status] || ""
                      }`}
                    >
                      {p.status}
                    </span>
                    <button className={styles.actionMini}>Edit</button>
                    <button className={styles.actionOk}>Done</button>
                    <button className={styles.actionGhost}>Del</button>
                  </div>
                </li>
              ))}
          </ul>

          {/* Calendar simplu */}
          <div className={styles.sideCard}>
            <div className={styles.sideHeader}>
              <h3>Calendar</h3>
            </div>
            <div className={styles.week}>
              <span>L</span>
              <span>Ma</span>
              <span>Mi</span>
              <span>J</span>
              <span>V</span>
              <span>S</span>
              <span>D</span>
            </div>
            <div className={styles.calendar}>
              {Array.from({ length: 30 }, (_, i) => (
                <div
                  key={i}
                  className={`${styles.day} ${i === 19 ? styles.dayActive : ""}`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Modal Nuevo */}
      {isModalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>Programar Contenedor</h3>
              <button
                className={styles.closeIcon}
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <form className={styles.modalBody} onSubmit={handleSave}>
              <div className={styles.inputGroup}>
                <label>Container ID</label>
                <input
                  value={form.contenedor_id}
                  onChange={(e) =>
                    setForm({ ...form, contenedor_id: e.target.value })
                  }
                  placeholder="UUID / ID"
                />
              </div>
              <div className={styles.inputGrid}>
                <div className={styles.inputGroup}>
                  <label>Cliente</label>
                  <input
                    value={form.cliente}
                    onChange={(e) =>
                      setForm({ ...form, cliente: e.target.value })
                    }
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Matrícula</label>
                  <input
                    value={form.placa}
                    onChange={(e) =>
                      setForm({ ...form, placa: e.target.value })
                    }
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Fecha</label>
                  <input
                    type="date"
                    value={form.fecha}
                    onChange={(e) =>
                      setForm({ ...form, fecha: e.target.value })
                    }
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Hora</label>
                  <input
                    type="time"
                    value={form.hora}
                    onChange={(e) =>
                      setForm({ ...form, hora: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.actionGhost}
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className={styles.actionOk}>
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulerPage;
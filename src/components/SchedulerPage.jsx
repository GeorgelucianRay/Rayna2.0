import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import styles from "./SchedulerStandalone.module.css";

const STATUS = ["Todos", "Programado", "En progreso", "Pendiente", "Completado"];

// icon mini (SVG inline)
const ArrowLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);

export default function SchedulerPage() {
  const navigate = useNavigate();

  const [scheduled, setScheduled] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Todos");
  const [date, setDate] = useState("");

  // load din Supabase (ajustează numele coloanelor după schema ta)
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("contenedores_programados")
        .select("*")
        .order("fecha", { ascending: true })
        .order("hora", { ascending: true });
      if (!error && data) setScheduled(data);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    return scheduled.filter((r) => {
      const okS = status === "Todos" ? true : r.status === status;
      const okQ =
        `${r.contenedor_id || ""} ${r.cliente || ""} ${r.camion_matricula || ""}`
          .toLowerCase()
          .includes(query.toLowerCase());
      const okD = date ? r.fecha === date : true;
      return okS && okQ && okD;
    });
  }, [scheduled, status, query, date]);

  const goBack = () => navigate("/depot");

  return (
    <div className={styles.pageWrap}>
      {/* Fundal difuz „AI tech” fără imagine clară */}
      <div className={styles.bg} />
      <div className={styles.vignette} />

      {/* BARĂ SUS (fără navbar global) */}
      <header className={styles.topBar}>
        <button className={styles.backBtn} onClick={goBack}><ArrowLeft/> <span>Depot</span></button>
        <h1 className={styles.title}>Programar Contenedor</h1>
        <button className={styles.newBtn}>Nuevo</button>
      </header>

      {/* CARD CENTRAL */}
      <section className={styles.card}>
        {/* FILTRE */}
        <div className={styles.toolbar}>
          <div className={styles.chips}>
            {STATUS.map((s) => (
              <button
                key={s}
                className={`${styles.chip} ${status === s ? styles.chipActive : ""}`}
                onClick={() => setStatus(s)}
              >
                {s}
              </button>
            ))}
          </div>

          <div className={styles.inputs}>
            <div className={styles.search}>
              <span className={styles.searchIcon}>🔎</span>
              <input
                placeholder="Buscar..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <input
              type="date"
              className={styles.date}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        {/* LISTĂ + CALENDAR MINI */}
        <div className={styles.grid}>
          <div className={styles.listCol}>
            {loading ? (
              <p className={styles.muted}>Cargando…</p>
            ) : filtered.length === 0 ? (
              <p className={styles.muted}>No hay contenedores programados.</p>
            ) : (
              <ul className={styles.list}>
                {filtered.map((row) => (
                  <li key={row.id} className={styles.item}>
                    <div className={styles.itemLeft}>
                      <div className={styles.itemTop}>
                        <span className={styles.dot} />
                        <span className={styles.cid}>{String(row.contenedor_id).slice(0, 8)}</span>
                        <span className={`${styles.badge} ${styles[`b${row.status.replace(" ", "")}`]}`}>
                          {row.status}
                        </span>
                      </div>
                      <div className={styles.meta}>
                        <span className={styles.cliente}>{row.cliente || "—"}</span>
                        <span className={styles.time}>⏱ {row.hora || "—"}</span>
                        <span className={styles.fecha}>📅 {row.fecha || "—"}</span>
                        <span className={styles.plate}>🚚 {row.camion_matricula || "—"}</span>
                      </div>
                    </div>
                    <div className={styles.actions}>
                      <button className={styles.actionMini}>Editar</button>
                      <button className={styles.actionMini}>Eliminar</button>
                      <button className={styles.actionOk}>Salida</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <aside className={styles.sideCol}>
            <div className={styles.sideCard}>
              <div className={styles.sideHeader}>
                <h3>Contenedor 2024</h3>
              </div>
              <MiniCalendar selected={date} onPick={setDate} />
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function MiniCalendar({ selected, onPick }) {
  const t = new Date();
  const y = t.getFullYear();
  const m = t.getMonth();
  const first = new Date(y, m, 1);
  const start = (first.getDay() + 6) % 7; // luni=0
  const days = new Date(y, m + 1, 0).getDate();
  const cells = Array.from({ length: start + days }, (_, i) => i - start + 1);
  const toISO = (d) =>
    `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  return (
    <>
      <div className={styles.week}>
        {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className={styles.calendar}>
        {cells.map((d, i) =>
          d < 1 ? (
            <div key={i} className={styles.placeholder} />
          ) : (
            <button
              key={i}
              className={`${styles.day} ${selected === toISO(d) ? styles.dayActive : ""}`}
              onClick={() => onPick(toISO(d))}
            >
              <span>{d}</span>
            </button>
          )
        )}
      </div>
    </>
  );
}
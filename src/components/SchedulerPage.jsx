// src/components/SchedulerPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthContext";
import styles from "./SchedulerStandalone.module.css";

/* SVG-uri inline (fără librării) */
const ArrowLeft = (props) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);
const SearchIcon = (props) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

export default function SchedulerPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();                 // profile.role: "dispecer" | "mecanic" | ...
  const role = profile?.role;

  /* ================= LISTA PROGRAMADOS ================= */
  const [programados, setProgramados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("contenedores_programados")
        .select("*")
        .order("fecha", { ascending: true })
        .order("hora", { ascending: true });

      if (error) {
        console.error("Error cargando programaciones:", error);
        setProgramados([]);
      } else setProgramados(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const lista = useMemo(() => {
    return programados.filter((r) => {
      const text = `${r.matricula_contenedor ?? ""} ${r.empresa_descarga ?? ""} ${r.matricula_camion ?? ""}`.toLowerCase();
      const okQ = text.includes(q.toLowerCase());
      const okDate = dateFilter ? r.fecha === dateFilter : true;
      return okQ && okDate;
    });
  }, [programados, q, dateFilter]);

  /* =================== MODAL NUEVO ===================== */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchMat, setSearchMat] = useState("");
  const [resultados, setResultados] = useState([]);
  const [contenedorSel, setContenedorSel] = useState(null);
  const [form, setForm] = useState({ empresa_descarga: "", fecha: "", hora: "", matricula_camion: "" });

  const openNuevo = () => {
    setIsModalOpen(true);
    setSearchMat("");
    setResultados([]);
    setContenedorSel(null);
    setForm({ empresa_descarga: "", fecha: "", hora: "", matricula_camion: "" });
  };

  const buscarContenedores = async () => {
    if (!searchMat.trim()) { setResultados([]); return; }
    const { data, error } = await supabase
      .from("contenedores")
      .select("*")
      .ilike("matricula_contenedor", `%${searchMat}%`)
      .order("created_at", { ascending: false });
    if (error) { console.error("Error buscando contenedores:", error); setResultados([]); }
    else setResultados(data || []);
  };

  const guardarProgramacion = async (e) => {
    e.preventDefault();
    if (!contenedorSel?.matricula_contenedor) { alert("Selecciona un contenedor por matrícula."); return; }
    const payload = {
      matricula_contenedor: contenedorSel.matricula_contenedor,
      empresa_descarga: form.empresa_descarga || null,
      fecha: form.fecha || null,
      hora: form.hora || null,
      matricula_camion: form.matricula_camion || null,
      // info utilă la listare
      naviera: contenedorSel.naviera || null,
      tipo: contenedorSel.tipo || null,
      posicion: contenedorSel.posicion || null,
    };
    const { error } = await supabase.from("contenedores_programados").insert([payload]);
    if (error) { console.error("Error guardando programación:", error); alert("No se pudo guardar."); return; }

    const { data } = await supabase
      .from("contenedores_programados")
      .select("*")
      .order("fecha", { ascending: true })
      .order("hora", { ascending: true });
    setProgramados(data || []);
    setIsModalOpen(false);
  };

  const eliminarProgramacion = async (id) => {
    if (!confirm("¿Eliminar esta programación?")) return;
    const { error } = await supabase.from("contenedores_programados").delete().eq("id", id);
    if (error) { console.error("Error eliminando:", error); alert("No se pudo eliminar."); return; }
    setProgramados((prev) => prev.filter((x) => x.id !== id));
  };

  const editarProgramacion = async (id, updates) => {
    const { error } = await supabase.from("contenedores_programados").update(updates).eq("id", id);
    if (error) { console.error("Error editando:", error); alert("No se pudo editar."); return; }
    setProgramados((prev) => prev.map((x) => (x.id === id ? { ...x, ...updates } : x)));
  };

  /* ================== HECHO (RPC + fallback) =================== */
  const marcarHecho = async (row) => {
    // 1) Încearcă RPC (dacă l-ai creat în DB)
    try {
      const { data, error: rpcError } = await supabase.rpc("move_programado_to_salidos", {
        p_programado_id: row.id,
      });
      if (!rpcError) {
        setProgramados((prev) => prev.filter((x) => x.id !== row.id));
        return;
      }
      console.warn("RPC indisponibil/eroare, folosesc fallback:", rpcError?.message);
    } catch (e) {
      console.warn("RPC nu există, folosesc fallback:", e?.message);
    }

    // 2) Fallback: insert doar cu coloanele standard (cele care sigur există)
    const salida = {
      matricula_contenedor: row.matricula_contenedor ?? null,
      naviera: row.naviera ?? null,
      tipo: row.tipo ?? null,
      posicion: row.posicion ?? null,
      matricula_camion: row.matricula_camion ?? null,
      detalles: row.detalles ?? null,
      // dacă ai adăugat și în tabel: fecha_programada: row.fecha ?? null, hora_programada: row.hora ?? null,
    };

    const { error: insErr } = await supabase.from("contenedores_salidos").insert([salida]);
    if (insErr) {
      console.error("Insert salidos error:", insErr);
      alert(`No se pudo completar la salida.\n\nDetalle: ${insErr.message ?? "desconocido"}`);
      return;
    }

    const { error: delErr } = await supabase.from("contenedores_programados").delete().eq("id", row.id);
    if (delErr) {
      console.error("Delete programados error:", delErr);
      alert(`Salida creada, pero no se pudo quitar de programados.\n\nDetalle: ${delErr.message ?? "desconocido"}`);
      return;
    }

    setProgramados((prev) => prev.filter((x) => x.id !== row.id));
  };

  /* ================== CALENDARIO DINÁMICO =================== */
  const hoy = new Date();
  const [calMonth, setCalMonth] = useState(hoy.getMonth());     // 0..11
  const [calYear, setCalYear] = useState(hoy.getFullYear());    // p. ex. 2025
  const monthLabel = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" })
    .format(new Date(calYear, calMonth, 1));
  const weekLabels = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

  function getMonthCells(year, month) {
    const first = new Date(year, month, 1);
    const jsWeekDay = first.getDay();        // 0=Dom..6=Sab
    const firstCol = (jsWeekDay + 6) % 7;    // 0=Lun..6=Dom
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = Array(firstCol).fill(null).concat(
      Array.from({ length: daysInMonth }, (_, i) => i + 1)
    );
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }
  const calCells = getMonthCells(calYear, calMonth);
  const isToday = (d) =>
    d &&
    calYear === hoy.getFullYear() &&
    calMonth === hoy.getMonth() &&
    d === hoy.getDate();

  /* ====================== RENDER ====================== */
  return (
    <div className={styles.pageWrap}>
      {/* fundal difuz */}
      <div className={styles.bg} />
      <div className={styles.vignette} />

      {/* Bara top (fără Layout) */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate("/depot")}>
          <ArrowLeft /> Depot
        </button>
        <h2 className={styles.title}>Programar Contenedor</h2>
        {role === "dispecer" && (
          <button className={styles.newBtn} onClick={openNuevo}>Nuevo</button>
        )}
      </div>

      {/* Card central */}
      <section className={styles.card}>
        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.chips}>
            <span className={`${styles.chip} ${styles.chipStatic}`}>Todos</span>
          </div>
          <div className={styles.inputs}>
            <div className={styles.search}>
              <SearchIcon className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Buscar..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <input
              type="date"
              className={styles.date}
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
        </div>

        {/* Grid listă + calendar */}
        <div className={styles.grid}>
          {/* Listă programări */}
          <ul className={styles.list}>
            {loading ? (
              <li className={styles.muted}>Cargando…</li>
            ) : lista.length === 0 ? (
              <li className={styles.muted}>No hay contenedores programados.</li>
            ) : (
              lista.map((r) => (
                <li key={r.id} className={styles.item}>
                  <div>
                    <div className={styles.itemTop}>
                      <span className={styles.dot} />
                      <span className={styles.cid}>{r.matricula_contenedor}</span>
                    </div>
                    <div className={styles.meta}>
                      {r.empresa_descarga && <span className={styles.cliente}>{r.empresa_descarga}</span>}
                      {r.fecha && <span className={styles.fecha}>📅 {r.fecha}</span>}
                      {r.hora && <span className={styles.time}>⏱ {r.hora}</span>}
                      {r.matricula_camion && <span className={styles.plate}>🚚 {r.matricula_camion}</span>}
                      {r.naviera && <span>• {r.naviera}</span>}
                      {r.tipo && <span>• {r.tipo}</span>}
                      {r.posicion && <span>• {r.posicion}</span>}
                    </div>
                  </div>

                  <div className={styles.actions}>
                    {role === "dispecer" && (
                      <>
                        <button
                          className={styles.actionMini}
                          onClick={() => {
                            const nuevaHora = prompt("Nueva hora (HH:MM):", r.hora || "");
                            if (nuevaHora != null) editarProgramacion(r.id, { hora: nuevaHora });
                          }}
                        >
                          Editar
                        </button>
                        <button
                          className={styles.actionGhost}
                          onClick={() => eliminarProgramacion(r.id)}
                        >
                          Eliminar
                        </button>
                      </>
                    )}
                    <button className={styles.actionOk} onClick={() => marcarHecho(r)}>
                      Hecho
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>

          {/* Calendar dinamic */}
          <aside className={styles.sideCard}>
            <div className={styles.sideHeader} style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
              <h3 style={{ textTransform: "capitalize" }}>{monthLabel}</h3>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className={styles.actionMini}
                  onClick={() => {
                    const m = calMonth - 1;
                    setCalMonth((m + 12) % 12);
                    setCalYear(m < 0 ? calYear - 1 : calYear);
                  }}
                >◀</button>
                <button
                  type="button"
                  className={styles.actionMini}
                  onClick={() => {
                    const m = calMonth + 1;
                    setCalMonth(m % 12);
                    setCalYear(m > 11 ? calYear + 1 : calYear);
                  }}
                >▶</button>
              </div>
            </div>

            <div className={styles.week}>
              {weekLabels.map((d) => <span key={d}>{d}</span>)}
            </div>

            <div className={styles.calendar}>
              {calCells.map((d, i) => (
                <div
                  key={i}
                  className={`${styles.day} ${d ? "" : styles.placeholderDay} ${isToday(d) ? styles.dayActive : ""}`}
                >
                  {d ?? ""}
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      {/* Modal Nuevo (doar dispecer) */}
      {isModalOpen && role === "dispecer" && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Programar contenedor</h3>
              <button className={styles.closeIcon} onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form className={styles.modalBody} onSubmit={guardarProgramacion}>
              {/* Căutare în contenedores */}
              <div className={styles.inputGroup}>
                <label>Buscar por matrícula</label>
                <div className={styles.inputGrid}>
                  <input
                    placeholder="Ej: ABCD1234567"
                    value={searchMat}
                    onChange={(e) => setSearchMat(e.target.value)}
                  />
                  <button type="button" className={styles.actionMini} onClick={buscarContenedores}>
                    Buscar
                  </button>
                </div>
              </div>

              {resultados.length > 0 && (
                <div className={styles.inputGroup}>
                  <label>Resultados</label>
                  <div style={{ maxHeight: 160, overflow: "auto", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, padding: 8 }}>
                    {resultados.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setContenedorSel(c)}
                        className={styles.actionMini}
                        style={{ width: "100%", textAlign: "left", marginBottom: 6 }}
                      >
                        {c.matricula_contenedor} · {c.naviera || "—"} · {c.tipo || "—"} · {c.posicion || "—"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {contenedorSel && (
                <div className={styles.inputGrid}>
                  <div className={styles.inputGroup}>
                    <label>Matrícula contenedor</label>
                    <input value={contenedorSel.matricula_contenedor} readOnly />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Naviera</label>
                    <input value={contenedorSel.naviera || ""} readOnly />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Tipo</label>
                    <input value={contenedorSel.tipo || ""} readOnly />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Posición</label>
                    <input value={contenedorSel.posicion || ""} readOnly />
                  </div>
                </div>
              )}

              <div className={styles.inputGrid}>
                <div className={styles.inputGroup}>
                  <label>Empresa de descarga</label>
                  <input
                    value={form.empresa_descarga}
                    onChange={(e) => setForm({ ...form, empresa_descarga: e.target.value })}
                    placeholder="Nombre de la empresa"
                    required
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Matrícula del camión</label>
                  <input
                    value={form.matricula_camion}
                    onChange={(e) => setForm({ ...form, matricula_camion: e.target.value })}
                    placeholder="Ej: B-123-XYZ"
                    required
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Fecha de programación</label>
                  <input
                    type="date"
                    value={form.fecha}
                    onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Hora de programación</label>
                  <input
                    type="time"
                    value={form.hora}
                    onChange={(e) => setForm({ ...form, hora: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.actionGhost} onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className={styles.actionOk}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
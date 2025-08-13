// src/components/SchedulerPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthContext";
import styles from "./SchedulerStandalone.module.css";

/* SVG-uri inline */
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
  const { profile } = useAuth();
  const role = profile?.role; // 'dispecer' | 'mecanic' | ...

  /* =============== STATE LISTE / FILTRE =============== */
  const [view, setView] = useState("todos"); // 'todos'|'programado'|'pendiente'|'completado'
  const [q, setQ] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const [programados, setProgramados] = useState([]);
  const [loadingProg, setLoadingProg] = useState(true);

  const [completados, setCompletados] = useState([]);
  const [loadingComp, setLoadingComp] = useState(false);

  /* =============== ÎNCĂRCĂRI =============== */
  const loadProgramados = async () => {
    setLoadingProg(true);
    const { data, error } = await supabase
      .from("contenedores_programados")
      .select("*")
      .order("fecha", { ascending: true })
      .order("hora", { ascending: true });
    if (error) {
      console.error("Error cargando programados:", error);
      setProgramados([]);
    } else {
      setProgramados(data || []);
    }
    setLoadingProg(false);
  };

  useEffect(() => { loadProgramados(); }, []);

  // Completados se încarcă doar când intri pe tab-ul "completado" sau schimbi data
  useEffect(() => {
    const loadCompletados = async () => {
      if (view !== "completado") return;
      setLoadingComp(true);
      let qSel = supabase
        .from("contenedores_salidos")
        .select("*")
        .eq("desde_programados", true);
      if (dateFilter) qSel = qSel.eq("fecha_programada", dateFilter);
      const { data, error } = await qSel
        .order("fecha_programada", { ascending: false })
        .order("hora_programada", { ascending: false });
      if (error) {
        console.error("Error cargando completados:", error);
        setCompletados([]);
      } else {
        setCompletados(data || []);
      }
      setLoadingComp(false);
    };
    loadCompletados();
  }, [view, dateFilter]);

  /* =============== LISTĂ FILTRATĂ (programados) =============== */
  const listaProg = useMemo(() => {
    const base = programados.filter((r) => {
      const text = `${r.matricula_contenedor ?? ""} ${r.empresa_descarga ?? ""} ${r.matricula_camion ?? ""}`.toLowerCase();
      const okQ = text.includes(q.toLowerCase());
      const okDate = dateFilter ? r.fecha === dateFilter : true;
      return okQ && okDate;
    });
    if (view === "programado") return base.filter((r) => r.estado === "programado");
    if (view === "pendiente") return base.filter((r) => r.estado === "pendiente");
    return base; // 'todos'
  }, [programados, q, dateFilter, view]);

  /* =============== MODAL NUEVO =============== */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchMat, setSearchMat] = useState("");
  const [resultados, setResultados] = useState([]);
  const [contenedorSel, setContenedorSel] = useState(null);
  const [form, setForm] = useState({
    empresa_descarga: "",
    fecha: "",
    hora: "",
    matricula_camion: "",
    estado: "programado", // sau 'pendiente'
  });

  const openNuevo = () => {
    setIsModalOpen(true);
    setSearchMat("");
    setResultados([]);
    setContenedorSel(null);
    setForm({ empresa_descarga: "", fecha: "", hora: "", matricula_camion: "", estado: "programado" });
  };

  const buscarContenedores = async () => {
    const term = searchMat.trim();
    if (!term) { setResultados([]); return; }
    // căutăm atât în contenedores cât și în contenedores_rotos
    const [a, b] = await Promise.all([
      supabase.from("contenedores").select("*").ilike("matricula_contenedor", `%${term}%`).order("created_at", { ascending: false }),
      supabase.from("contenedores_rotos").select("*").ilike("matricula_contenedor", `%${term}%`).order("created_at", { ascending: false }),
    ]);
    const listA = a.error ? [] : (a.data || []);
    const listB = b.error ? [] : (b.data || []);
    // marcăm sursa (util doar pentru debug)
    const merged = [
      ...listA.map((x) => ({ ...x, __src: "contenedores" })),
      ...listB.map((x) => ({ ...x, __src: "contenedores_rotos" })),
    ];
    setResultados(merged);
  };

  const guardarProgramacion = async (e) => {
    e.preventDefault();
    if (!contenedorSel?.matricula_contenedor) {
      alert("Selecciona un contenedor por matrícula.");
      return;
    }
    // Mutare atomică din depósito -> programados
    const { error } = await supabase.rpc("programar_contenedor", {
      p_matricula: contenedorSel.matricula_contenedor,
      p_empresa_descarga: form.empresa_descarga || null,
      p_fecha: form.fecha || null,
      p_hora: form.hora || null,
      p_matricula_camion: form.matricula_camion || null,
      p_estado: form.estado || "programado",
    });
    if (error) {
      console.error("Error programando:", error);
      alert(`No se pudo programar.\n${error.message}`);
      return;
    }
    await loadProgramados();
    setIsModalOpen(false);
  };

  /* =============== ACCIONES FILA =============== */
  // Edit (doar modificări simple, de ex. ora)
  const editarProgramacion = async (id, updates) => {
    const { error } = await supabase.from("contenedores_programados").update(updates).eq("id", id);
    if (error) { console.error("Error editando:", error); alert("No se pudo editar."); return; }
    setProgramados((prev) => prev.map((x) => (x.id === id ? { ...x, ...updates } : x)));
  };

  // Cancelar (revine în depósito)
  const cancelarProgramacion = async (row) => {
    if (!confirm("¿Cancelar la programación y devolver el contenedor al Depósito?")) return;
    // 1) pune în contenedores la loc
    const back = {
      matricula_contenedor: row.matricula_contenedor,
      naviera: row.naviera || null,
      tipo: row.tipo || null,
      posicion: row.posicion || null,
      matricula_camion: null,
      estado: null,
      detalles: row.detalles || null,
    };
    const { error: insErr } = await supabase.from("contenedores").insert([back]);
    if (insErr) {
      console.error("Error devolviendo al depósito:", insErr);
      alert(`No se pudo devolver al depósito.\n${insErr.message}`);
      return;
    }
    // 2) șterge programarea
    const { error: delErr } = await supabase.from("contenedores_programados").delete().eq("id", row.id);
    if (delErr) {
      console.error("Error borrando programado:", delErr);
      alert(`No se pudo borrar la programación.\n${delErr.message}`);
      return;
    }
    setProgramados((prev) => prev.filter((x) => x.id !== row.id));
  };

  // Hecho -> RPC programados -> salidos
  const marcarHecho = async (row) => {
    const { error } = await supabase.rpc("hecho_programado", { p_programado_id: row.id });
    if (error) {
      console.error("Hecho error:", error);
      alert(`No se pudo completar la salida.\n${error.message}`);
      return;
    }
    setProgramados((prev) => prev.filter((x) => x.id !== row.id));
    // dacă ești pe tab Completado + data filtrată = azi, reîncarcă și acea listă
    if (view === "completado") {
      setDateFilter((d) => d); // forțează useEffect să ruleze
    }
  };

  /* =============== CALENDAR (pentru filtru dată) =============== */
  const hoy = new Date();
  const [calMonth, setCalMonth] = useState(hoy.getMonth());
  const [calYear, setCalYear] = useState(hoy.getFullYear());
  const monthLabel = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" })
    .format(new Date(calYear, calMonth, 1));
  const weekLabels = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

  function getMonthCells(year, month) {
    const first = new Date(year, month, 1);
    const jsWeekDay = first.getDay(); // 0=Dom..6=Sab
    const firstCol = (jsWeekDay + 6) % 7; // 0=Lun..6=Dom
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = Array(firstCol).fill(null).concat(
      Array.from({ length: daysInMonth }, (_, i) => i + 1)
    );
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }
  const calCells = getMonthCells(calYear, calMonth);
  const isToday = (d) =>
    d && calYear === hoy.getFullYear() && calMonth === hoy.getMonth() && d === hoy.getDate();

  /* =============== RENDER =============== */
  return (
    <div className={styles.pageWrap}>
      <div className={styles.bg} />
      <div className={styles.vignette} />

      {/* top bar */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate("/depot")}>
          <ArrowLeft /> Depot
        </button>
        <h2 className={styles.title}>Programar Contenedor</h2>
        {role === "dispecer" && (
          <button className={styles.newBtn} onClick={openNuevo}>Nuevo</button>
        )}
      </div>

      {/* card */}
      <section className={styles.card}>
        {/* filtre */}
        <div className={styles.toolbar}>
          <div className={styles.chips}>
            <button className={`${styles.chip} ${view==='todos'?styles.chipActive:''}`} onClick={()=>setView('todos')}>Todos</button>
            <button className={`${styles.chip} ${view==='programado'?styles.chipActive:''}`} onClick={()=>setView('programado')}>Programado</button>
            <button className={`${styles.chip} ${view==='pendiente'?styles.chipActive:''}`} onClick={()=>setView('pendiente')}>Pendiente</button>
            <button className={`${styles.chip} ${view==='completado'?styles.chipActive:''}`} onClick={()=>setView('completado')}>Completado</button>
          </div>
          <div className={styles.inputs}>
            <div className={styles.search}>
              <SearchIcon className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Buscar…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                disabled={view === "completado"} // căutarea text e doar pe programados
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

        {/* grid listă + calendar */}
        <div className={styles.grid}>
          {/* listă stânga */}
          <ul className={styles.list}>
            {view === "completado" ? (
              loadingComp ? (
                <li className={styles.muted}>Cargando…</li>
              ) : completados.length === 0 ? (
                <li className={styles.muted}>No hay completados para la fecha seleccionada.</li>
              ) : (
                completados.map((r) => (
                  <li key={`${r.matricula_contenedor}-${r.fecha_programada}-${r.hora_programada}`} className={styles.item}>
                    <div>
                      <div className={styles.itemTop}>
                        <span className={styles.dot} />
                        <span className={styles.cid}>{r.matricula_contenedor}</span>
                      </div>
                      <div className={styles.meta}>
                        {r.fecha_programada && <span className={styles.fecha}>📅 {r.fecha_programada}</span>}
                        {r.hora_programada && <span className={styles.time}>⏱ {r.hora_programada}</span>}
                        {r.naviera && <span>• {r.naviera}</span>}
                        {r.tipo && <span>• {r.tipo}</span>}
                        {r.posicion && <span>• {r.posicion}</span>}
                        {r.matricula_camion && <span className={styles.plate}>🚚 {r.matricula_camion}</span>}
                      </div>
                    </div>
                    {/* fără acțiuni pe completados */}
                  </li>
                ))
              )
            ) : (
              loadingProg ? (
                <li className={styles.muted}>Cargando…</li>
              ) : listaProg.length === 0 ? (
                <li className={styles.muted}>No hay contenedores programados.</li>
              ) : (
                listaProg.map((r) => (
                  <li key={r.id} className={styles.item}>
                    <div>
                      <div className={styles.itemTop}>
                        <span className={styles.dot} />
                        <span className={styles.cid}>{r.matricula_contenedor}</span>
                        <span className={`${styles.badge} ${r.estado==='pendiente' ? styles.badgeWarn : styles.badgeInfo}`}>
                          {r.estado === 'pendiente' ? 'Pendiente' : 'Programado'}
                        </span>
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
                          <button className={styles.actionGhost} onClick={() => cancelarProgramacion(r)}>
                            Cancelar
                          </button>
                        </>
                      )}
                      <button className={styles.actionOk} onClick={() => marcarHecho(r)}>
                        Hecho
                      </button>
                    </div>
                  </li>
                ))
              )
            )}
          </ul>

          {/* calendar dreapta */}
          <aside className={styles.sideCard}>
            <div className={styles.sideHeader} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
                >
                  ◀
                </button>
                <button
                  type="button"
                  className={styles.actionMini}
                  onClick={() => {
                    const m = calMonth + 1;
                    setCalMonth(m % 12);
                    setCalYear(m > 11 ? calYear + 1 : calYear);
                  }}
                >
                  ▶
                </button>
              </div>
            </div>

            <div className={styles.week}>
              {["Lu","Ma","Mi","Ju","Vi","Sá","Do"].map((d) => <span key={d}>{d}</span>)}
            </div>

            <div className={styles.calendar}>
              {calCells.map((d, i) => {
                const cls = [
                  styles.day,
                  !d ? styles.placeholderDay : "",
                  isToday(d) ? styles.dayActive : "",
                ].join(" ");
                const yyyy = calYear;
                const mm = String(calMonth + 1).padStart(2, "0");
                const dd = String(d || "").padStart(2, "0");
                const dateStr = d ? `${yyyy}-${mm}-${dd}` : "";

                return (
                  <div
                    key={i}
                    className={cls}
                    onClick={() => d && setDateFilter(dateStr)}
                    title={d ? dateStr : ""}
                  >
                    {d ?? ""}
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      </section>

      {/* Modal Nuevo */}
      {isModalOpen && role === "dispecer" && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Programar contenedor</h3>
              <button className={styles.closeIcon} onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form className={styles.modalBody} onSubmit={guardarProgramacion}>
              {/* Căutare */}
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
                        key={`${c.__src}-${c.id}`}
                        type="button"
                        onClick={() => setContenedorSel(c)}
                        className={styles.actionMini}
                        style={{ width: "100%", textAlign: "left", marginBottom: 6 }}
                      >
                        {c.matricula_contenedor} · {c.naviera || "—"} · {c.tipo || "—"} · {c.posicion || "—"} {c.__src === "contenedores_rotos" ? "· Roto" : ""}
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
                <div className={styles.inputGroup}>
                  <label>Estado</label>
                  <select
                    value={form.estado}
                    onChange={(e) => setForm({ ...form, estado: e.target.value })}
                  >
                    <option value="programado">Programado</option>
                    <option value="pendiente">Pendiente</option>
                  </select>
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
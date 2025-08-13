// src/components/SchedulerPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthContext";
import styles from "./SchedulerStandalone.module.css";

/* SVG-uri mici inline (fără dependențe) */
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
  const { profile } = useAuth();                // profile.role: "dispecer" | "mecanic" | ...
  const role = profile?.role;

  /* ---- State listă & filtre ---- */
  const [programados, setProgramados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");               // căutare text
  const [dateFilter, setDateFilter] = useState(""); // filtrare după dată (YYYY-MM-DD)

  /* ---- State modal „Nuevo” ---- */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchMat, setSearchMat] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCont, setSelectedCont] = useState(null); // obiect din `contenedores`
  const [form, setForm] = useState({
    empresa_descarga: "",
    fecha: "",
    hora: "",
    matricula_camion: "",
  });

  /* ==== Load: lista programărilor active (doar din contenedores_programados) ==== */
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
      } else {
        setProgramados(data || []);
      }
      setLoading(false);
    };
    load();
  }, []);

  /* ==== Filtrare client-side (text + dată) ==== */
  const lista = useMemo(() => {
    return programados.filter((r) => {
      const hayTexto = (r.matricula_contenedor || "")
        .concat(" ", r.empresa_descarga || "", " ", r.matricula_camion || "")
        .toLowerCase()
        .includes(q.toLowerCase());
      const hayFecha = dateFilter ? r.fecha === dateFilter : true;
      return hayTexto && hayFecha;
    });
  }, [programados, q, dateFilter]);

  /* ==== Handlere UI ==== */
  const goBack = () => navigate("/depot");

  const openNuevo = () => {
    setIsModalOpen(true);
    setSearchMat("");
    setSearchResults([]);
    setSelectedCont(null);
    setForm({ empresa_descarga: "", fecha: "", hora: "", matricula_camion: "" });
  };

  /* ==== Căutare în `contenedores` după matricula_contenedor ==== */
  const buscarContenedores = async () => {
    if (!searchMat.trim()) {
      setSearchResults([]);
      return;
    }
    const { data, error } = await supabase
      .from("contenedores")
      .select("*")
      .ilike("matricula_contenedor", `%${searchMat}%`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error buscando contenedores:", error);
      setSearchResults([]);
    } else {
      setSearchResults(data || []);
    }
  };

  const seleccionarResultado = (c) => {
    setSelectedCont(c);
    // nu completăm automat datele de programare; doar datele containerului sunt afișate read-only
  };

  /* ==== Guardar: inseră în `contenedores_programados` ==== */
  const guardarProgramacion = async (e) => {
    e.preventDefault();
    if (!selectedCont?.matricula_contenedor) {
      alert("Selecciona primero un contenedor por matrícula.");
      return;
    }
    const payload = {
      matricula_contenedor: selectedCont.matricula_contenedor,
      empresa_descarga: form.empresa_descarga || null,
      fecha: form.fecha || null,
      hora: form.hora || null,
      matricula_camion: form.matricula_camion || null,
      // opțional: poți salva și info utilă pentru listare/istoric
      posicion: selectedCont.posicion || null,
      tipo: selectedCont.tipo || null,
      naviera: selectedCont.naviera || null,
    };

    const { error } = await supabase.from("contenedores_programados").insert([payload]);
    if (error) {
      console.error("Error guardando programación:", error);
      alert("No se pudo guardar la programación.");
      return;
    }
    // reîncarcă listă
    const { data } = await supabase
      .from("contenedores_programados")
      .select("*")
      .order("fecha", { ascending: true })
      .order("hora", { ascending: true });
    setProgramados(data || []);
    setIsModalOpen(false);
  };

  /* ==== Eliminar din `contenedores_programados` (doar dispecer) ==== */
  const eliminarProgramacion = async (id) => {
    if (!confirm("¿Eliminar esta programación?")) return;
    const { error } = await supabase.from("contenedores_programados").delete().eq("id", id);
    if (error) {
      console.error("Error eliminando programación:", error);
      alert("No se pudo eliminar.");
      return;
    }
    setProgramados((prev) => prev.filter((r) => r.id !== id));
  };

  /* ==== Hecho: mută în `contenedores_salidos` și șterge din programados ==== */
  const marcarHecho = async (row) => {
    // pregătim înregistrarea pentru salidos
    const salida = {
      matricula_contenedor: row.matricula_contenedor,
      naviera: row.naviera || null,
      tipo: row.tipo || null,
      posicion: row.posicion || null,
      matricula_camion: row.matricula_camion || null,
      detalles: row.detalles || null,
      // poți salva și data/ora programării ca referință
      fecha_programada: row.fecha || null,
      hora_programada: row.hora || null,
    };

    const { error: insErr } = await supabase.from("contenedores_salidos").insert([salida]);
    if (insErr) {
      console.error("Error moviendo a salidos:", insErr);
      alert("No se pudo completar la salida.");
      return;
    }

    const { error: delErr } = await supabase.from("contenedores_programados").delete().eq("id", row.id);
    if (delErr) {
      console.error("Error borrando de programados:", delErr);
      alert("Salida creada, pero no se pudo quitar de programados.");
      return;
    }

    setProgramados((prev) => prev.filter((r) => r.id !== row.id));
  };

  /* ==== Editare simplă (doar dispecer) – exemplu: schimbă data/ora/camion ==== */
  const editarProgramacion = async (id, updates) => {
    const { error } = await supabase.from("contenedores_programados").update(updates).eq("id", id);
    if (error) {
      console.error("Error editando programación:", error);
      alert("No se pudo editar.");
      return;
    }
    setProgramados((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  return (
    <div className={styles.pageWrap}>
      {/* fundal difuz */}
      <div className={styles.bg} />
      <div className={styles.vignette} />

      {/* Bara de sus (fără Layout) */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={goBack}>
          <ArrowLeft /> Depot
        </button>
        <h2 className={styles.title}>Programar Contenedor</h2>

        {role === "dispecer" && (
          <button className={styles.newBtn} onClick={openNuevo}>
            Nuevo
          </button>
        )}
      </div>

      {/* Card central */}
      <section className={styles.card}>
        {/* Toolbar: doar „Todos” + căutare + dată */}
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

        {/* Listă + calendar (calendar informativ) */}
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
                    {/* Dispecer: poate edita + elimina */}
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

                    {/* Ambele roluri: pot marca Hecho */}
                    <button className={styles.actionOk} onClick={() => marcarHecho(r)}>
                      Hecho
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>

          {/* Calendar lateral minimalist */}
          <aside className={styles.sideCard}>
            <div className={styles.sideHeader}><h3>Contenedor 2024</h3></div>
            <div className={styles.week}>{["L","M","X","J","V","S","D"].map((d) => <span key={d}>{d}</span>)}</div>
            <div className={styles.calendar}>
              {Array.from({ length: 31 }, (_, i) => (
                <div key={i} className={`${styles.day} ${i === 19 ? styles.dayActive : ""}`}>{i + 1}</div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      {/* Modal „Nuevo” – DOAR dispecer */}
      {isModalOpen && role === "dispecer" && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Programar contenedor</h3>
              <button className={styles.closeIcon} onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form className={styles.modalBody} onSubmit={guardarProgramacion}>
              {/* Căutare în `contenedores` */}
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

              {/* Rezultate căutare */}
              {searchResults.length > 0 && (
                <div className={styles.inputGroup}>
                  <label>Resultados</label>
                  <div style={{ maxHeight: 160, overflow: "auto", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, padding: 8 }}>
                    {searchResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => seleccionarResultado(c)}
                        className={styles.actionMini}
                        style={{ width: "100%", textAlign: "left", marginBottom: 6 }}
                      >
                        {c.matricula_contenedor} · {c.naviera || "—"} · {c.tipo || "—"} · {c.posicion || "—"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Info container selectat (read-only) */}
              {selectedCont && (
                <div className={styles.inputGrid}>
                  <div className={styles.inputGroup}>
                    <label>Matrícula contenedor</label>
                    <input value={selectedCont.matricula_contenedor} readOnly />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Naviera</label>
                    <input value={selectedCont.naviera || ""} readOnly />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Tipo</label>
                    <input value={selectedCont.tipo || ""} readOnly />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Posición</label>
                    <input value={selectedCont.posicion || ""} readOnly />
                  </div>
                </div>
              )}

              {/* Datele programării */}
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
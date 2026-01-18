import React, { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import { useAuth } from "../../AuthContext";
import styles from "./ParteDiarioModal.module.css";
import SearchableInput from "./SearchableInput";

/* -------- ICONOS ---------- */
const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" x2="6" y1="6" y2="18" />
    <line x1="6" x2="18" y1="6" y2="18" />
  </svg>
);

const GpsFixedIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <line x1="12" y1="2" x2="12" y2="6" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="22" y1="12" x2="18" y2="12" />
    <line x1="6" y1="12" x2="2" y2="12" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4
              a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

/* -------- DISTANTA ---------- */
function haversineDistance(a, b) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const s = Math.sin;

  const term =
    s(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s(dLon / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(term), Math.sqrt(1 - term));
}

/* -------- Helpers: zi muncita + weekend => festivo auto ---------- */
const toNum = (v) => (v === "" || v == null ? 0 : Number(v) || 0);

function isDayWorked(dayData) {
  const km = Math.max(0, toNum(dayData?.km_final) - toNum(dayData?.km_iniciar));
  const hasCurse = Array.isArray(dayData?.curse) && dayData.curse.length > 0;
  const hasMeals = !!dayData?.desayuno || !!dayData?.cena || !!dayData?.procena;
  const hasContainers = toNum(dayData?.contenedores) > 0;
  return km > 0 || hasCurse || hasMeals || hasContainers;
}

function isWeekendDate(day, monthIndex, year) {
  const d = new Date(year, monthIndex, day);
  const dow = d.getDay(); // 0 Sun, 6 Sat
  return dow === 0 || dow === 6;
}

/* ======================= MODAL GPS ============================= */
const GpsSelectionModal = ({ locations, onSelect, onClose, isLoading }) => (
  <div className={styles.modalOverlay} onClick={onClose}>
    <div
      className={styles.modalCard}
      style={{ maxWidth: 520 }}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
    >
      <div className={styles.topBar}>
        <button className={styles.iconBtn} onClick={onClose} type="button" aria-label="Cerrar">
          <CloseIcon />
        </button>
        <div className={styles.topTitle}>Selecciona una ubicación</div>
        <div style={{ width: 40 }} />
      </div>

      <div className={styles.bodyScroll}>
        {isLoading && <p className={styles.helpText}>Buscando ubicaciones cercanas…</p>}
        {!isLoading && locations.length === 0 && (
          <p className={styles.helpText}>No se han encontrado ubicaciones cercanas.</p>
        )}

        <div className={styles.routeList}>
          {locations.map((loc, idx) => (
            <button
              key={`${loc.name}-${idx}`}
              className={styles.routeRow}
              type="button"
              onClick={() => onSelect(loc.name)}
            >
              <div className={styles.routeMain}>
                <div className={styles.routeTitle}>{loc.name}</div>
                <div className={styles.routeSub}>~ {Math.round(loc.distance * 1000)} m</div>
              </div>
              <span className={styles.routeChevron}>›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/* ==================================================================== */
/*                          PARTE DIARIO MODAL                          */
/* ==================================================================== */

export default function ParteDiarioModal({
  isOpen,
  onClose,
  data,
  onDataChange,
  onToggleChange,
  onCurseChange,
  day,
  monthName,
  year,
}) {
  if (!isOpen) return null;

  const safeData = data || {};
  const { profile } = useAuth() || {};

  // camion implicit din profil
  const defaultCamion =
    profile?.camioane?.matricula ||
    profile?.matricula ||
    profile?.camion ||
    "";

  const mainCamion = safeData.camion_matricula || defaultCamion || "";

  const [isGpsModalOpen, setIsGpsModalOpen] = useState(false);
  const [gpsResults, setGpsResults] = useState([]);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [activeGpsSearch, setActiveGpsSearch] = useState(null);

  const [coordsIndex, setCoordsIndex] = useState({});
  const [trucks, setTrucks] = useState([]);

  /* -------- LOAD COORDINATE (index) ---------- */
  useEffect(() => {
    if (!isOpen) return;

    (async () => {
      const tables = ["gps_clientes", "gps_parkings", "gps_servicios", "gps_terminale"];
      try {
        const res = await Promise.all(
          tables.map((t) => supabase.from(t).select("nombre, coordenadas"))
        );

        const idx = {};
        res.forEach(({ data }) => {
          (data || []).forEach((row) => {
            if (!row?.coordenadas || !row?.nombre) return;
            const [lat, lon] = String(row.coordenadas)
              .replace(/[()]/g, "")
              .split(",")
              .map((n) => parseFloat(n.trim()));

            if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
              idx[row.nombre] = { lat, lon };
            }
          });
        });

        setCoordsIndex(idx);
      } catch (e) {
        console.error("coord load error", e);
      }
    })();
  }, [isOpen]);

  /* -------- LOAD TRUCKS ---------- */
  useEffect(() => {
    if (!isOpen) return;

    (async () => {
      try {
        const { data } = await supabase
          .from("camioane")
          .select("id, matricula")
          .order("matricula", { ascending: true });

        setTrucks(data || []);
      } catch (e) {
        console.error("truck load error", e);
      }
    })();
  }, [isOpen]);

  /* -------- Festivo auto: dacă e weekend + există activitate ---------- */
  useEffect(() => {
    if (!isOpen) return;

    const worked = isDayWorked(safeData);
    const weekend = isWeekendDate(day, new Date(`${monthName} 1, ${year}`).getMonth(), year);
    // Dacă monthName nu e în engleză, fallback:
    // Folosim index-ul din CalculadoraNomina ca prop? Dacă nu, calc simplu:
  }, [isOpen]); // lăsat intenționat gol; vezi implementarea sigură mai jos

  // Implementare sigură weekend: calc din data reală (year + monthName via locale es-ES poate fi problematic)
  // => Soluția corectă: trimite "monthIndex" din părinte.
  // DAR ca să nu te blochez: deducem monthIndex din monthName ES prin listă statică:
  const monthIndex = useMemo(() => {
    const map = {
      "Enero": 0, "Febrero": 1, "Marzo": 2, "Abril": 3, "Mayo": 4, "Junio": 5,
      "Julio": 6, "Agosto": 7, "Septiembre": 8, "Octubre": 9, "Noviembre": 10, "Diciembre": 11,
    };
    return map[monthName] ?? new Date().getMonth();
  }, [monthName]);

  useEffect(() => {
    if (!isOpen) return;

    const weekend = isWeekendDate(Number(day || 1), monthIndex, Number(year || new Date().getFullYear()));
    const worked = isDayWorked(safeData);

    // suma_festivo devine flag 1/0 (NU euro)
    // - dacă weekend și worked => 1
    // - altfel => 0 (dar nu suprascriem dacă ai deja setat manual o sumă > 0 din trecut)
    const cur = toNum(safeData?.suma_festivo);

    if (weekend && worked) {
      if (cur !== 1) onDataChange("suma_festivo", 1);
    } else {
      // dacă nu e weekend sau nu e muncit, nu forțăm 0 dacă user a setat manual ceva >0
      // dar pentru cerința ta (automat), de obicei vrei să fie strict:
      if (cur === 1) onDataChange("suma_festivo", 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isOpen,
    day,
    monthIndex,
    year,
    safeData?.km_iniciar,
    safeData?.km_final,
    safeData?.contenedores,
    safeData?.desayuno,
    safeData?.cena,
    safeData?.procena,
    safeData?.curse,
  ]);

  const kmIniciar = safeData.km_iniciar ?? "";
  const kmFinal = safeData.km_final ?? "";
  const kmShow = Math.max(0, Number(kmFinal) - Number(kmIniciar));

  const curse = useMemo(
    () => (Array.isArray(safeData.curse) ? safeData.curse : []),
    [safeData.curse]
  );

  const autoKmFor = useCallback((start, end) => {
    const A = coordsIndex[start];
    const B = coordsIndex[end];
    if (!A || !B) return null;
    return Math.round(haversineDistance(A, B) * 10) / 10;
  }, [coordsIndex]);

  const onNum = (e) => {
    const name = e.target.name;
    const val = e.target.value === "" ? "" : Number(e.target.value);
    onDataChange(name, val);
  };

  const handleCursaChange = (index, field, value) => {
    const newCurse = [...curse];
    const prev = newCurse[index] || { start: "", end: "", camion_matricula: mainCamion || "" };
    const updated = { ...prev, [field]: value };

    const kmAuto = autoKmFor(updated.start, updated.end);
    if (kmAuto != null) updated.km_auto = kmAuto;

    newCurse[index] = updated;
    onCurseChange(newCurse);
  };

  const addCursa = () => {
    onCurseChange([...curse, { start: "", end: "", camion_matricula: mainCamion || "" }]);
  };

  const removeCursa = (index) => {
    onCurseChange(curse.filter((_, i) => i !== index));
  };

  /* -------- CONTAINERS STEPPER ---------- */
  const contenedores = Number(safeData.contenedores || 0);
  const decContainers = () => onDataChange("contenedores", Math.max(0, contenedores - 1));
  const incContainers = () => onDataChange("contenedores", contenedores + 1);

  /* -------- GPS: nearby top N (din coordsIndex + geolocation) ---------- */
  const openGpsPicker = useCallback(async (index, field) => {
    setActiveGpsSearch({ index, field });
    setIsGpsModalOpen(true);
    setGpsLoading(true);

    try {
      if (!navigator.geolocation) {
        setGpsResults([]);
        setGpsLoading(false);
        return;
      }

      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 15000,
        });
      });

      const here = { lat: pos.coords.latitude, lon: pos.coords.longitude };

      const all = Object.entries(coordsIndex).map(([name, coord]) => ({
        name,
        distance: haversineDistance(here, { lat: coord.lat, lon: coord.lon }),
      }));

      all.sort((a, b) => a.distance - b.distance);
      setGpsResults(all.slice(0, 20)); // top 20
    } catch (e) {
      console.error("gps nearby error", e);
      setGpsResults([]);
    } finally {
      setGpsLoading(false);
    }
  }, [coordsIndex]);

  const weekendFlag = isWeekendDate(Number(day || 1), monthIndex, Number(year || new Date().getFullYear()));
  const festivoWorked = toNum(safeData?.suma_festivo) === 1;

  return (
    <>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div
          className={styles.modalShell}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* Top bar */}
          <div className={styles.topBar}>
            <button className={styles.iconBtn} type="button" onClick={onClose} aria-label="Cerrar">
              <CloseIcon />
            </button>

            <div className={styles.topTitle}>Parte Diario</div>

            <button className={styles.doneBtn} type="button" onClick={onClose}>
              LISTO
            </button>
          </div>

          {/* Progress (poți controla din părinte dacă vrei pași reali) */}
          <div className={styles.progressWrap}>
            <div className={styles.progressHead}>
              <span className={styles.stepLabel}>Paso 2 de 4</span>
              <span className={styles.stepName}>Logística & Dietas</span>
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: "50%" }} />
            </div>
          </div>

          {/* Scroll area */}
          <div className={styles.bodyScroll}>
            {/* Header meta mic */}
            <div className={styles.metaRow}>
              <div className={styles.metaLeft}>
                <div className={styles.metaDate}>
                  {day} {monthName} {year}
                </div>
                {weekendFlag && (
                  <div className={styles.metaBadge}>
                    {festivoWorked ? "Festivo trabajado" : "Fin de semana"}
                  </div>
                )}
              </div>
            </div>

            {/* VEHICULO */}
            <section className={styles.glassPanel}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionIcon}>🚚</span>
                <h2 className={styles.sectionTitle}>Vehículo</h2>
              </div>

              <div className={styles.fieldBlock}>
                <label className={styles.fieldLabel}>Camión del día</label>
                <input
                  list="camiones-list"
                  className={styles.input}
                  value={mainCamion}
                  onChange={(e) => onDataChange("camion_matricula", e.target.value || null)}
                  placeholder={defaultCamion ? `Por defecto: ${defaultCamion}` : "Matrícula"}
                />
                <datalist id="camiones-list">
                  {trucks.map((t) => (
                    <option key={t.id} value={t.matricula} />
                  ))}
                </datalist>
                <div className={styles.helpText}>
                  Por defecto se usa tu camión habitual{defaultCamion ? ` (${defaultCamion})` : ""}.
                </div>
              </div>
            </section>

            {/* KILOMETRAJE */}
            <section className={styles.glassPanel}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionIcon}>speed</span>
                <h2 className={styles.sectionTitle}>Kilometraje</h2>
              </div>

              <div className={styles.grid2}>
                <div className={styles.fieldBlock}>
                  <label className={styles.fieldLabel}>KM Inicio</label>
                  <div className={styles.inputCard}>
                    <input
                      className={styles.bigInput}
                      type="number"
                      name="km_iniciar"
                      value={kmIniciar}
                      onChange={onNum}
                      placeholder="0"
                      inputMode="numeric"
                    />
                  </div>
                </div>

                <div className={styles.fieldBlock}>
                  <label className={styles.fieldLabel}>KM Fin</label>
                  <div className={styles.inputCard}>
                    <input
                      className={styles.bigInput}
                      type="number"
                      name="km_final"
                      value={kmFinal}
                      onChange={onNum}
                      placeholder="0"
                      inputMode="numeric"
                    />
                  </div>
                </div>
              </div>

              <div className={styles.sectionFooterRow}>
                <span className={styles.muted}>Distancia calculada</span>
                <span className={styles.kmValue}>{kmShow ? `${kmShow} km` : "-- km"}</span>
              </div>
            </section>

            {/* DIETAS */}
            <section className={styles.glassPanel}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionIcon}>restaurant</span>
                <h2 className={styles.sectionTitle}>Dietas y Comidas</h2>
              </div>

              <div className={styles.mealsGrid}>
                <button
                  type="button"
                  className={`${styles.mealBtn} ${safeData.desayuno ? styles.mealBtnOn : ""}`}
                  onClick={() => onToggleChange("desayuno")}
                >
                  <div className={styles.mealIcon}>🥐</div>
                  <div className={styles.mealText}>Desayuno</div>
                </button>

                <button
                  type="button"
                  className={`${styles.mealBtn} ${safeData.procena ? styles.mealBtnOn : ""}`}
                  onClick={() => onToggleChange("procena")}
                >
                  <div className={styles.mealIcon}>🍱</div>
                  <div className={styles.mealText}>Pro-cena</div>
                </button>

                <button
                  type="button"
                  className={`${styles.mealBtn} ${safeData.cena ? styles.mealBtnOn : ""}`}
                  onClick={() => onToggleChange("cena")}
                >
                  <div className={styles.mealIcon}>🍲</div>
                  <div className={styles.mealText}>Cena</div>
                </button>
              </div>

              {weekendFlag && festivoWorked && (
                <div className={styles.helpText} style={{ marginTop: 10 }}>
                  Marcado automáticamente como <b>festivo trabajado</b> (fin de semana + actividad).
                </div>
              )}
            </section>

            {/* CONTENEDORES */}
            <section className={styles.glassPanel}>
              <div className={styles.sectionHeadRow}>
                <div className={styles.sectionHead}>
                  <span className={styles.sectionIcon}>inventory_2</span>
                  <div>
                    <h2 className={styles.sectionTitle}>Contenedores</h2>
                    <div className={styles.helpTextTiny}>Total transportados</div>
                  </div>
                </div>

                <div className={styles.stepper}>
                  <button type="button" className={styles.stepBtn} onClick={decContainers} aria-label="Restar">
                    −
                  </button>
                  <div className={styles.stepValue}>{contenedores}</div>
                  <button type="button" className={styles.stepBtnPrimary} onClick={incContainers} aria-label="Sumar">
                    +
                  </button>
                </div>
              </div>
            </section>

            {/* RUTAS ESPECIALES (curse) */}
            <section className={styles.glassPanel}>
              <div className={styles.routesHead}>
                <div className={styles.sectionHead}>
                  <span className={styles.sectionIcon}>alt_route</span>
                  <h2 className={styles.sectionTitle}>Rutas (carreras)</h2>
                </div>

                <button type="button" className={styles.addChip} onClick={addCursa}>
                  + Agregar
                </button>
              </div>

              <div className={styles.curseList}>
                {curse.length === 0 ? (
                  <div className={styles.helpText}>No hay rutas hoy.</div>
                ) : (
                  curse.map((cursa, i) => {
                    const kmAuto = autoKmFor(cursa.start, cursa.end);
                    const cursaCamion = cursa.camion_matricula || mainCamion || "";

                    return (
                      <div key={i} className={styles.cursaCard}>
                        <div className={styles.cursaGrid}>
                          <div className={styles.fieldBlock}>
                            <label className={styles.fieldLabel}>Salida</label>
                            <div className={styles.inputWithBtn}>
                              <SearchableInput
                                value={cursa.start || ""}
                                onChange={(v) => handleCursaChange(i, "start", v)}
                                onLocationSelect={(name) => handleCursaChange(i, "start", name)}
                                placeholder="Ej.: Parking"
                                closeOnSelect
                              />
                              <button
                                type="button"
                                className={styles.iconSquare}
                                onClick={() => openGpsPicker(i, "start")}
                                aria-label="GPS salida"
                              >
                                <GpsFixedIcon />
                              </button>
                            </div>
                          </div>

                          <div className={styles.fieldBlock}>
                            <label className={styles.fieldLabel}>Llegada</label>
                            <div className={styles.inputWithBtn}>
                              <SearchableInput
                                value={cursa.end || ""}
                                onChange={(v) => handleCursaChange(i, "end", v)}
                                onLocationSelect={(name) => handleCursaChange(i, "end", name)}
                                placeholder="Ej.: TCB"
                                closeOnSelect
                              />
                              <button
                                type="button"
                                className={styles.iconSquare}
                                onClick={() => openGpsPicker(i, "end")}
                                aria-label="GPS llegada"
                              >
                                <GpsFixedIcon />
                              </button>
                            </div>
                          </div>

                          <div className={styles.fieldBlock}>
                            <label className={styles.fieldLabel}>Camión</label>
                            <select
                              className={styles.select}
                              value={cursaCamion}
                              onChange={(e) => handleCursaChange(i, "camion_matricula", e.target.value || null)}
                            >
                              <option value="">{mainCamion || "(Del día)"}</option>
                              {trucks.map((t) => (
                                <option key={t.id} value={t.matricula}>
                                  {t.matricula}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className={styles.fieldBlock}>
                            <label className={styles.fieldLabel}>KM aprox.</label>
                            <div className={styles.inputCard}>
                              <input className={styles.smallInput} disabled value={kmAuto ?? "—"} />
                            </div>
                          </div>
                        </div>

                        <button type="button" className={styles.trashBtn} onClick={() => removeCursa(i)} aria-label="Eliminar">
                          <TrashIcon />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* IMPORTANT: NU mai afișăm input "Plus festivo (€)" */}
          </div>

          {/* Bottom action bar */}
          <div className={styles.bottomBar}>
            <button type="button" className={styles.primaryCta} onClick={onClose}>
              LISTO <span className={styles.arrow}>→</span>
            </button>
          </div>
        </div>
      </div>

      {isGpsModalOpen && (
        <GpsSelectionModal
          locations={gpsResults}
          isLoading={gpsLoading}
          onClose={() => setIsGpsModalOpen(false)}
          onSelect={(locName) => {
            if (activeGpsSearch) {
              handleCursaChange(activeGpsSearch.index, activeGpsSearch.field, locName);
            }
            setIsGpsModalOpen(false);
          }}
        />
      )}
    </>
  );
}

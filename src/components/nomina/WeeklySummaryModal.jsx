import React, { useEffect, useMemo, useState } from "react";
import styles from "./WeeklySummaryModal.module.css";

const BackIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CalendarIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M7 3v2M17 3v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M4 8h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const VerifiedIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const MealIcon = ({ on }) => (
  <span className={`${styles.mealDot} ${on ? styles.mealOn : styles.mealOff}`} />
);

function formatRangeES(monday, sunday) {
  const opts = { day: "2-digit", month: "short" };
  const a = monday.toLocaleDateString("es-ES", opts).toUpperCase();
  const b = sunday.toLocaleDateString("es-ES", opts).toUpperCase();
  return `${a} — ${b}`;
}

function weekNumberISO(date) {
  // ISO week number
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

export default function WeeklySummaryModal({
  isOpen,
  onClose,
  weeks = [],
  initialIndex = 0,
  onChangeWeek,
}) {
  const [weekIdx, setWeekIdx] = useState(initialIndex || 0);

  useEffect(() => {
    setWeekIdx(initialIndex || 0);
  }, [initialIndex, isOpen]);

  const week = weeks?.[weekIdx];

  const monday = week?.monday ? new Date(week.monday) : null;
  const sunday = week?.friday ? new Date(week.friday) : null;

  const rangeText = useMemo(() => {
    if (!monday || !sunday) return "";
    return formatRangeES(monday, sunday);
  }, [monday, sunday]);

  const wNum = useMemo(() => (monday ? weekNumberISO(monday) : null), [monday]);

  const dayCards = useMemo(() => {
    const days = Array.isArray(week?.days) ? week.days : [];
    // KPIs pe zi, adaptate la datele tale:
    return days.map((d) => {
      const km = Number(d.km_dia || 0);
      const drops = Array.isArray(d.curse) ? d.curse.length : 0;
      const pickups = Number(d.contenedores || 0);

      const anyLogged =
        km > 0 ||
        drops > 0 ||
        pickups > 0 ||
        !!d.des || !!d.cen || !!d.pro ||
        Number(d.festivo || 0) > 0;

      return {
        date: d.date ? new Date(d.date) : null,
        labelTop: d.date
          ? new Date(d.date).toLocaleDateString("es-ES", { weekday: "long" })
          : "Día",
        labelDay: d.date ? new Date(d.date).getDate() : "",
        km,
        drops,
        pickups,
        des: !!d.des,
        cen: !!d.cen,
        pro: !!d.pro,
        logged: anyLogged,
      };
    });
  }, [week]);

  const totals = useMemo(() => {
    const days = Array.isArray(week?.days) ? week.days : [];
    const totalKm = days.reduce((s, d) => s + (Number(d.km_dia || 0) || 0), 0);
    const activeDays = dayCards.reduce((s, d) => s + (d.logged ? 1 : 0), 0);

    const totalDrops = dayCards.reduce((s, d) => s + (d.drops || 0), 0);
    const totalPickups = dayCards.reduce((s, d) => s + (d.pickups || 0), 0);

    // Bonus estimat (exemplu): 0.03€/km + 1€/carrera + 0.5€/contenedor
    const estBonus = totalKm * 0.03 + totalDrops * 1 + totalPickups * 0.5;

    return {
      totalKm: Math.round(totalKm),
      activeDays,
      totalDrops,
      totalPickups,
      estBonus: Math.round(estBonus * 100) / 100,
    };
  }, [week, dayCards]);

  if (!isOpen) return null;

  const goWeek = (dir) => {
    const next = Math.max(0, Math.min((weeks?.length || 1) - 1, weekIdx + dir));
    setWeekIdx(next);
    onChangeWeek?.(next);
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.shell} onClick={(e) => e.stopPropagation()}>
        {/* Sticky top bar */}
        <header className={styles.topbar}>
          <div className={styles.topbarInner}>
            <button className={styles.iconBtn} type="button" onClick={onClose} aria-label="Volver">
              <BackIcon />
            </button>

            <div className={styles.centerTitle}>
              <div className={styles.title}>Parte semanal</div>
              <div className={styles.subtitle}>
                {rangeText || "—"}
              </div>
            </div>

            <button
              className={styles.iconBtn}
              type="button"
              onClick={() => goWeek(1)}
              aria-label="Siguiente semana"
              title="Siguiente semana"
            >
              <CalendarIcon />
            </button>
          </div>

          <div className={styles.weekRow}>
            <div className={styles.sectionKicker}>Actividad diaria</div>
            <div className={styles.weekChip}>
              {wNum ? `SEMANA ${wNum}` : "SEMANA"}
            </div>

            <div className={styles.weekNav}>
              <button className={styles.weekNavBtn} type="button" onClick={() => goWeek(-1)} disabled={weekIdx === 0}>
                Anterior
              </button>
              <button
                className={styles.weekNavBtn}
                type="button"
                onClick={() => goWeek(1)}
                disabled={weekIdx >= (weeks?.length || 1) - 1}
              >
                Siguiente
              </button>
            </div>
          </div>
        </header>

        {/* Main scroll */}
        <main className={styles.content}>
          {/* Day slider */}
          <div className={styles.slider} aria-label="Días de la semana">
            {dayCards.map((d, i) => {
              const active = d.logged && d.km > 0;
              return (
                <div key={i} className={styles.slide}>
                  <div className={`${styles.dayCard} ${active ? styles.dayCardActive : ""}`}>
                    {active && (
                      <div className={styles.verifiedBadge} title="Registrado">
                        <VerifiedIcon />
                      </div>
                    )}

                    <div className={styles.dayTop}>
                      <div className={styles.dayName}>
                        {d.labelTop} {String(d.labelDay).padStart(2, "0")}
                      </div>
                      <div className={styles.kmRow}>
                        <div className={styles.kmValue}>{Math.round(d.km)}</div>
                        <div className={styles.kmUnit}>KM</div>
                      </div>
                    </div>

                    <div className={styles.dayMid}>
                      <div className={styles.metric}>
                        <div className={styles.metricIcon}>🚚</div>
                        <div>
                          <div className={styles.metricLabel}>Carreras</div>
                          <div className={styles.metricValue}>
                            {d.drops} salidas / {d.pickups} cont.
                          </div>
                        </div>
                      </div>

                      <div className={styles.mealsRow}>
                        <div className={styles.mealsLeft}>
                          <MealIcon on={d.des} />
                          <MealIcon on={d.pro} />
                          <MealIcon on={d.cen} />
                        </div>
                        <div className={styles.mealsRight}>
                          {d.logged ? "Registrado" : "Sin datos"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Weekly insights / details */}
          <div className={styles.block}>
            <div className={styles.blockTitle}>Detalles logísticos</div>

            <div className={styles.list}>
              <div className={styles.item}>
                <div className={`${styles.itemIcon} ${styles.itemIconViolet}`}>🛡️</div>
                <div className={styles.itemBody}>
                  <div className={styles.itemTitle}>Estado de cumplimiento</div>
                  <div className={styles.itemSub}>Revisado por el sistema</div>
                </div>
                <div className={styles.itemRight}>
                  <span className={styles.greenDot} />
                </div>
              </div>

              <div className={styles.item}>
                <div className={`${styles.itemIcon} ${styles.itemIconPrimary}`}>🧭</div>
                <div className={styles.itemBody}>
                  <div className={styles.itemTitle}>Resumen de la semana</div>
                  <div className={styles.itemSub}>
                    {totals.totalDrops} carreras · {totals.totalPickups} contenedores
                  </div>
                </div>
                <div className={styles.itemRight}>
                  <span className={styles.chev}>›</span>
                </div>
              </div>
            </div>
          </div>

          {/* spacer for bottom panel on mobile */}
          <div className={styles.bottomSpacer} />
        </main>

        {/* Glass bottom panel */}
        <footer className={styles.bottomPanel}>
          <div className={styles.bottomInner}>
            <div className={styles.kpiGrid}>
              <div className={styles.kpi}>
                <div className={styles.kpiLabel}>Distancia total</div>
                <div className={styles.kpiValue}>
                  {totals.totalKm} <span className={styles.kpiUnit}>KM</span>
                </div>
              </div>

              <div className={styles.kpi}>
                <div className={styles.kpiLabel}>Días activos</div>
                <div className={`${styles.kpiValue} ${styles.kpiViolet}`}>
                  {String(totals.activeDays).padStart(2, "0")}{" "}
                  <span className={styles.kpiUnit}>DÍAS</span>
                </div>
              </div>
            </div>

            <div className={styles.bonusCard}>
              <div>
                <div className={styles.bonusKicker}>Bonus estimado</div>
                <div className={styles.bonusHint}>Rendimiento + kilometraje</div>
              </div>
              <div className={styles.bonusAmount}>
                {totals.estBonus.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
              </div>
            </div>

            <button className={styles.confirmBtn} type="button" onClick={onClose}>
              Confirmar registros <span className={styles.sendIcon}>↗</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

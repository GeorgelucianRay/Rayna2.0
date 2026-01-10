// src/components/depot/components/DepotCards.jsx
import styles from "../DepotPage.module.css";

function getStatus(c, activeTab) {
  // adaptează cum vrei tu, eu fac fallback logic
  if (activeTab === "contenedores_rotos") return "maintenance";
  if (activeTab === "contenedores_salidos") return "out";
  const s = (c.estado || "").toLowerCase();
  if (s.includes("delay") || s.includes("retras")) return "delayed";
  if (s.includes("mant") || s.includes("repar") || s.includes("rota")) return "maintenance";
  return "ready";
}

function statusLabel(type) {
  if (type === "ready") return "Listo";
  if (type === "delayed") return "Retrasado";
  if (type === "maintenance") return "Mantenimiento";
  if (type === "out") return "Salido";
  return "Estado";
}

export default function DepotCards({ containers, loading, activeTab, onEdit, onSalida }) {
  if (loading) return <p className={styles.loadingText}>Cargando…</p>;
  if (!containers || containers.length === 0) return <p className={styles.noDataText}>No hay contenedores.</p>;

  return (
    <div className={styles.containersGrid}>
      {containers.map((c) => {
        const st = getStatus(c, activeTab);

        return (
          <article key={`${c.__from || activeTab}-${c.id}`} className={styles.containerCard}>
            {/* TOP ROW */}
            <header className={styles.cardTopRow}>
              <div className={styles.cardTitleCol}>
                <h3 className={styles.cardMatricula}>
                  {(c.matricula_contenedor || "").toUpperCase()}
                </h3>
                <p className={styles.cardNaviera}>
                  {c.naviera || "—"}{c.tipo ? ` • ${c.tipo}` : ""}
                </p>
              </div>

              <span className={`${styles.statusPill} ${styles[`status_${st}`]}`}>
                {statusLabel(st)}
              </span>
            </header>

            {/* MID GRID (2 columns like Stich) */}
            <div className={styles.cardMidGrid}>
              <div className={styles.midCell}>
                <p className={styles.midLabel}>Ubicación</p>
                <p className={styles.midValue}>{c.posicion || "—"}</p>
              </div>

              <div className={styles.midCell}>
                <p className={styles.midLabel}>Camión</p>
                <p className={styles.midValue}>{c.matricula_camion || "—"}</p>
              </div>

              <div className={styles.midCell}>
                <p className={styles.midLabel}>Entrada</p>
                <p className={styles.midValue}>
                  {c.created_at ? new Date(c.created_at).toLocaleString() : "—"}
                </p>
              </div>

              <div className={styles.midCell}>
                <p className={styles.midLabel}>Estado</p>
                <p className={styles.midValue}>{c.estado || "—"}</p>
              </div>
            </div>

            {/* FOOTER */}
            <footer className={styles.cardFooter}>
              <div className={styles.footerIcons}>
                <span className={styles.footerIcon}>🚚</span>
                <span className={styles.footerIcon}>🗺️</span>
              </div>

              {activeTab !== "contenedores_salidos" && (
                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className={styles.cardButton}
                    onClick={() => onEdit(c)}
                  >
                    Detalles
                  </button>

                  {c.__from !== "programados" && (
                    <button
                      type="button"
                      className={styles.cardButtonSalida}
                      onClick={() => onSalida(c)}
                    >
                      Salida
                    </button>
                  )}
                </div>
              )}
            </footer>
          </article>
        );
      })}
    </div>
  );
}
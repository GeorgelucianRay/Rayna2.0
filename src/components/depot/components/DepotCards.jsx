// src/components/depot/components/DepotCards.jsx
import styles from "../DepotPage.module.css";

export default function DepotCards({ containers, loading, activeTab, onEdit, onSalida }) {
  if (loading) return <p className={styles.loadingText}>Cargando…</p>;
  if (containers.length === 0) return <p className={styles.noDataText}>No hay contenedores.</p>;

  return (
    <div className={styles.containersGrid}>
      {containers.map((c) => (
        <div key={`${c.__from || activeTab}-${c.id}`} className={styles.containerCard}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardMatricula}>{(c.matricula_contenedor || "").toUpperCase()}</h3>
              <p className={styles.cardNaviera}>{c.naviera || "—"}</p>
            </div>

            {activeTab !== "contenedores_salidos" && (
              <div className={styles.cardActions}>
                <button className={styles.cardButton} onClick={() => onEdit(c)}>Editar</button>
                {c.__from !== "programados" && (
                  <button className={styles.cardButtonSalida} onClick={() => onSalida(c)}>
                    Salida
                  </button>
                )}
              </div>
            )}
          </div>

          <div className={styles.cardBody}>
            <p><strong>Entrada:</strong> {new Date(c.created_at).toLocaleString()}</p>
            {c.tipo && <p><strong>Tipo:</strong> {c.tipo}</p>}
            {c.posicion && <p><strong>Pos:</strong> {c.posicion}</p>}
            {c.estado && <p><strong>Estado:</strong> {c.estado}</p>}
            {c.matricula_camion && <p><strong>Camión:</strong> {c.matricula_camion}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
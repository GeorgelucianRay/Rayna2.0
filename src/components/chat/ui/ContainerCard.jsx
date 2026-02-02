// src/components/chat/ui/ContainerCard.jsx
import React from "react";
import styles from "./ContainerCard.module.css";

export default function ContainerCard({ container, position, blockers, blockersCount, size, naviera }) {
    const containerCode = container?.matricula_contenedor || container?.matricula || "N/A";

    return (
        <div className={styles.containerCard}>
            <div className={styles.cardHeader}>
                <span className={styles.containerCode}>{containerCode}</span>
                <span className={styles.positionBadge}>{position || "N/A"}</span>
            </div>

            <div className={styles.cardBody}>
                <div className={styles.infoRow}>
                    <span className={styles.label}>Naviera:</span>
                    <span className={styles.value}>{naviera || container?.naviera || "N/A"}</span>
                </div>
                <div className={styles.infoRow}>
                    <span className={styles.label}>Tamaño:</span>
                    <span className={styles.value}>{size || container?.tipo || "N/A"}'</span>
                </div>
                <div className={styles.infoRow}>
                    <span className={styles.label}>Bloqueadores:</span>
                    <span className={`${styles.value} ${styles.blockers} ${blockersCount === 0 ? styles.noBlocers : ""}`}>
                        {blockersCount}
                    </span>
                </div>
            </div>

            {blockers && blockers.length > 0 && (
                <div className={styles.blockersList}>
                    <span className={styles.blockersTitle}>Contenedores encima:</span>
                    <div className={styles.blockersItems}>
                        {blockers.map((b, idx) => (
                            <span key={idx} className={styles.blockerItem}>
                                {b.code} ({b.position})
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// src/components/chat/ui/PlaceInfoCard.jsx
import React from "react";
import styles from "../Chatbot.module.css";

export default function PlaceInfoCard({ place, mapsUrl, cameraUrl }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>{place.nombre}</div>
      {place.direccion && <div className={styles.cardSubtitle}>{place.direccion}</div>}
      {place.detalles && <div style={{ marginTop: 6 }}>{place.detalles}</div>}
      <div className={styles.cardActions} style={{ marginTop: 8 }}>
        {mapsUrl && (
          <button className={styles.actionBtn} onClick={() => window.open(mapsUrl, "_blank", "noopener")}>
            Abrir en Google Maps
          </button>
        )}
        {cameraUrl && (
          <button className={styles.actionBtn} onClick={() => window.open(cameraUrl, "_blank", "noopener")}>
            Ver cámara
          </button>
        )}
      </div>
    </div>
  );
}
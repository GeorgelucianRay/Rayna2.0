// src/components/chat/ui/SimpleList.jsx
import React from "react";
import styles from "../Chatbot.module.css";

export default function SimpleList({ title, items, onPick }) {
  return (
    <div className={styles.card}>
      {title && <div className={styles.cardTitle}>{title}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
        {(items || []).map((it) => (
          <button
            key={`${it._table}-${it.id}`}
            className={styles.actionBtn}
            onClick={() => (onPick ? onPick(it) : window.open(it._mapsUrl, "_blank", "noopener"))}
          >
            {it.nombre}
          </button>
        ))}
      </div>
    </div>
  );
}
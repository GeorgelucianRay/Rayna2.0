import React from "react";
import styles from "../Chatbot.module.css";

export default function ActionCard({ card }) {
  return (
    <div className={styles.card}>
      {card.title && <div className={styles.cardTitle}>{card.title}</div>}
      {card.subtitle && <div className={styles.cardSubtitle}>{card.subtitle}</div>}
      <div className={styles.cardActions}>
        {(card.actions || []).map((a, i) => (
          <button
            key={i}
            className={styles.actionBtn}
            onClick={() => window.open(a.route, a.newTab ? "_blank" : "_self", "noopener,noreferrer")}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
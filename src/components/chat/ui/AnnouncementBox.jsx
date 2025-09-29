import React from "react";
import styles from "../Chatbot.module.css";

export default function AnnouncementBox({ content }) {
  return (
    <div className={styles.annBox}>
      <div className={styles.annHead}>📣 Anuncio</div>
      <div className={styles.annBody}>{content || "Sin contenido."}</div>
    </div>
  );
}
// src/components/chat/ui/AddCameraInline.jsx
import React, { useState } from "react";
import styles from "../Chatbot.module.css";

export default function AddCameraInline({ onSubmit, saving }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  return (
    <form
      className={styles.formRow}
      onSubmit={(e) => { e.preventDefault(); onSubmit({ name, url }); }}
    >
      <input className={styles.input} placeholder="Nombre (p.ej. TCB)"
             value={name} onChange={(e) => setName(e.target.value)} required />
      <input className={styles.input} placeholder="URL (https://…)" type="url"
             value={url} onChange={(e) => setUrl(e.target.value)} required />
      <button className={styles.sendBtn} type="submit" disabled={saving}>
        {saving ? "Guardando…" : "Añadir"}
      </button>
    </form>
  );
}
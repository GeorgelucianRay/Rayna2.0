// src/components/EditAnnouncementModal.jsx
import React, { useEffect, useState } from "react";
import styles from "./EditAnnouncementModal.module.css";

export default function EditAnnouncementModal({
  isOpen,
  onClose,
  currentContent = "",
  onSave,
}) {
  const [value, setValue] = useState(currentContent);

  useEffect(() => {
    if (isOpen) setValue(currentContent || "");
  }, [isOpen, currentContent]);

  // Blochează scroll-ul paginii când modalul e deschis (iOS friendly)
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave?.(value);
  };

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Editar anuncio"
      onMouseDown={(e) => {
        // click pe fundal => close
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>Editar anuncio</h3>
          <button className={styles.closeBtn} type="button" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <textarea
          className={styles.textarea}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Escribe el anuncio…"
          rows={6}
        />

        <div className={styles.actions}>
          <button className={styles.btnGhost} type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className={styles.btnPrimary} type="button" onClick={handleSave}>
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import styles from './HomepageDispecer.module.css'; // Refolosește stilurile pentru consistență

function EditAnnouncementModal({ isOpen, onClose, currentContent, onSave }) {
  const [newContent, setNewContent] = useState(currentContent);

  useEffect(() => {
    setNewContent(currentContent);
  }, [currentContent]);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    onSave(newContent);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h3 className={styles.modalTitle}>Editar Anuncio</h3>
        <textarea
          className={styles.modalTextarea}
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          rows="6"
        />
        <div className={styles.modalActions}>
          <button onClick={onClose} className={styles.cancelButton}>
            Cancelar
          </button>
          <button onClick={handleSave} className={styles.saveButton}>
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditAnnouncementModal;

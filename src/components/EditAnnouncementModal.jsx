import React, { useState, useEffect } from 'react';
import styles from './HomepageDispecer.module.css'; // Refolosim stilurile

function EditAnnouncementModal({ isOpen, onClose, currentContent, onSave }) {
  const [newContent, setNewContent] = useState(currentContent);

  // Actualizează starea internă dacă se schimbă proprietatea din exterior
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
        <h3>Editar Anuncio</h3>
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

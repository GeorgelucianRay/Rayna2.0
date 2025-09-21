// src/components/Depot/modals/SalidaContainerModal.jsx
import React from 'react';
import styles from './SalidaContainerModal.module.css';

function SalidaContainerModal({
  isOpen,
  onClose,
  onSubmit,
  salidaMatriculaCamion,
  setSalidaMatriculaCamion,
  selectedContainer,
}) {
  if (!isOpen || !selectedContainer) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h3>Registrar salida</h3>
        <form onSubmit={onSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="salidaMatriculaCamion">Matrícula del camión</label>
            <input
              id="salidaMatriculaCamion"
              type="text"
              value={salidaMatriculaCamion}
              onChange={(e) => setSalidaMatriculaCamion(e.target.value)}
              placeholder="Ej. 1234-ABC"
            />
          </div>

          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
            >
              Cancelar
            </button>
            <button type="submit" className={styles.saveButton}>
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SalidaContainerModal;
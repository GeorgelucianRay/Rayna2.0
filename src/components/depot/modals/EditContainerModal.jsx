import React from 'react';
import styles from './DepotPage.module.css';

function EditContainerModal({
  isOpen,
  onClose,
  onSubmit,
  editPosicion,
  setEditPosicion,
  selectedContainer,
}) {
  if (!isOpen || !selectedContainer) {
    return null;
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h3>Editar Posición</h3>
        <form onSubmit={onSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="editPosicion">Nueva Posición</label>
            <input
              id="editPosicion"
              type="text"
              value={editPosicion}
              onChange={(e) => setEditPosicion(e.target.value)}
              required
            />
          </div>
          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelButton} onClick={onClose}>
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

export default EditContainerModal;
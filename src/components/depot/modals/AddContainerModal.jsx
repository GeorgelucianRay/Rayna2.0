import React from 'react';
import styles from './DepotPage.module.css';

function AddContainerModal({
  isOpen,
  onClose,
  onSubmit,
  newMatricula,
  setNewMatricula,
  newNaviera,
  setNewNaviera,
  newTipo,
  setNewTipo,
  newPosicion,
  setNewPosicion,
  newEstado,
  setNewEstado,
  isBroken,
  setIsBroken,
  newDetalles,
  setNewDetalles,
  newMatriculaCamion,
  setNewMatriculaCamion,
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h3>Añadir Contenedor</h3>
        <form onSubmit={onSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="newMatricula">Matrícula Contenedor</label>
            <input
              id="newMatricula"
              type="text"
              value={newMatricula}
              onChange={(e) => setNewMatricula(e.target.value)}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="newNaviera">Naviera</label>
            <input
              id="newNaviera"
              type="text"
              value={newNaviera}
              onChange={(e) => setNewNaviera(e.target.value)}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="newTipo">Tipo</label>
            <select id="newTipo" value={newTipo} onChange={(e) => setNewTipo(e.target.value)}>
              <option value="20">20</option>
              <option value="20 OpenTop">20 OpenTop</option>
              <option value="40 Alto">40 Alto</option>
              <option value="40 Bajo">40 Bajo</option>
              <option value="40 OpenTop">40 OpenTop</option>
              <option value="45">45</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="newPosicion">Posición</label>
            <input
              id="newPosicion"
              type="text"
              value={newPosicion}
              onChange={(e) => setNewPosicion(e.target.value)}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="newEstado">Estado</label>
            <select
              id="newEstado"
              value={newEstado}
              onChange={(e) => setNewEstado(e.target.value)}
              disabled={isBroken}
            >
              <option value="lleno">Lleno</option>
              <option value="vacio">Vacío</option>
            </select>
          </div>
          <div className={styles.formGroupInline}>
            <input
              id="brokenCheckbox"
              type="checkbox"
              checked={isBroken}
              onChange={(e) => setIsBroken(e.target.checked)}
            />
            <label htmlFor="brokenCheckbox">Roto</label>
          </div>
          {isBroken && (
            <div className={styles.formGroup}>
              <label htmlFor="newDetalles">Detalles</label>
              <input
                id="newDetalles"
                type="text"
                value={newDetalles}
                onChange={(e) => setNewDetalles(e.target.value)}
              />
            </div>
          )}
          <div className={styles.formGroup}>
            <label htmlFor="newMatriculaCamion">Matrícula Camión (opțional)</label>
            <input
              id="newMatriculaCamion"
              type="text"
              value={newMatriculaCamion}
              onChange={(e) => setNewMatriculaCamion(e.target.value)}
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

export default AddContainerModal;
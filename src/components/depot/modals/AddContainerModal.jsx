import Modal from '../../ui/Modal';
import styles from './AddContainerModal.module.css';

export default function AddContainerModal({
  isOpen, onClose, onSubmit,
  newMatricula, setNewMatricula,
  newNaviera, setNewNaviera,
  newTipo, setNewTipo,
  newPosicion, setNewPosicion,
  newEstado, setNewEstado,
  isBroken, setIsBroken,
  newDetalles, setNewDetalles,
  newMatriculaCamion, setNewMatriculaCamion,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Añadir contenedor" wide={false}>
      <h2 className={styles.title}>Añadir Contenedor</h2>

      <form className={styles.form} onSubmit={onSubmit}>
        <label>
          Matrícula Contenedor
          <input value={newMatricula} onChange={e => setNewMatricula(e.target.value)} required />
        </label>
        <label>
          Naviera
          <input value={newNaviera} onChange={e => setNewNaviera(e.target.value)} />
        </label>
        <label>
          Tipo
          <select value={newTipo} onChange={e => setNewTipo(e.target.value)}>
            <option value="20">20</option>
            <option value="40">40</option>
            <option value="45">45</option>
          </select>
        </label>
        <label>
          Posición
          <input value={newPosicion} onChange={e => setNewPosicion(e.target.value)} />
        </label>

        <div className={styles.row}>
          <label className={styles.check}>
            <input type="checkbox" checked={isBroken} onChange={e => setIsBroken(e.target.checked)} />
            Defectuoso
          </label>
          {!isBroken && (
            <label>
              Estado
              <select value={newEstado} onChange={e => setNewEstado(e.target.value)}>
                <option value="lleno">Lleno</option>
                <option value="vacío">Vacío</option>
              </select>
            </label>
          )}
        </div>

        {isBroken && (
          <label>
            Detalles
            <textarea rows={3} value={newDetalles} onChange={e => setNewDetalles(e.target.value)} />
          </label>
        )}

        <label>
          Matrícula Camión (opcional)
          <input value={newMatriculaCamion} onChange={e => setNewMatriculaCamion(e.target.value)} />
        </label>

        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onClose}>Cancelar</button>
          <button type="submit" className={styles.primary}>Guardar</button>
        </div>
      </form>
    </Modal>
  );
}
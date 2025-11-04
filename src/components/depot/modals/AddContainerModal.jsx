// AddContainerModal.jsx (doar fragmentul interior, cum ai deja)
import Modal from '../../ui/Modal';
import styles from './AddContainerModal.module.css';

export default function AddContainerModal(props) {
  const {
    isOpen, onClose, onSubmit,
    newMatricula, setNewMatricula,
    newNaviera, setNewNaviera,
    newTipo, setNewTipo,
    newPosicion, setNewPosicion,
    newEstado, setNewEstado,
    isBroken, setIsBroken,
    newDetalles, setNewDetalles,
    newMatriculaCamion, setNewMatriculaCamion,
  } = props;

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Añadir contenedor">
      <div className={styles.ios}>
        <h2 className={styles.title}>Añadir Contenedor</h2>

        <form className={styles.form} onSubmit={onSubmit}>
          <div className={styles.block}>
            <span className={styles.label}>Matrícula Contenedor</span>
            <input className={styles.input} value={newMatricula} onChange={e=>setNewMatricula(e.target.value)} required />
          </div>

          <div className={styles.block}>
            <span className={styles.label}>Naviera</span>
            <input className={styles.input} value={newNaviera} onChange={e=>setNewNaviera(e.target.value)} />
          </div>

          <div className={styles.block}>
            <span className={styles.label}>Tipo</span>
            <select className={styles.select} value={newTipo} onChange={e=>setNewTipo(e.target.value)}>
              <option>20</option><option>40</option><option>45</option>
            </select>
          </div>

          <div className={styles.block}>
            <span className={styles.label}>Posición</span>
            <input className={styles.input} value={newPosicion} onChange={e=>setNewPosicion(e.target.value)} />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Defectuoso</label>
            <label className={styles.switch}>
              <input type="checkbox" checked={isBroken} onChange={e=>setIsBroken(e.target.checked)} />
              <span className={styles.switchTrack}></span>
              <span className={styles.switchThumb}></span>
            </label>

            {!isBroken && (
              <>
                <span className={styles.label}>Estado</span>
                <select className={styles.select} value={newEstado} onChange={e=>setNewEstado(e.target.value)}>
                  <option>Lleno</option><option>Vacío</option>
                </select>
              </>
            )}
          </div>

          {isBroken && (
            <div className={styles.block}>
              <span className={styles.label}>Detalles</span>
              <textarea className={styles.area} rows={3} value={newDetalles} onChange={e=>setNewDetalles(e.target.value)} />
            </div>
          )}

          <div className={styles.block}>
            <span className={styles.label}>Matrícula Camión (opcional)</span>
            <input className={styles.input} value={newMatriculaCamion} onChange={e=>setNewMatriculaCamion(e.target.value)} />
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.btn} onClick={onClose}>Cancelar</button>
            <button type="submit" className={`${styles.btn} ${styles.primary}`}>Guardar</button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
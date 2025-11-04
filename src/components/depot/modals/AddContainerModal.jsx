// src/components/depot/modals/AddContainerModal.jsx
import Modal from '../../ui/Modal';
import styles from './AddContainerModal.module.css';
import shell from '../../ui/Modal.module.css'; // pentru slotHeader/Content/Footer

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
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Añadir contenedor" fillOnMobile>
      {/* header */}
      <div className={shell.slotHeader}>
        <h2 className={styles.title}>Añadir Contenedor</h2>
      </div>

      {/* content scrollabil */}
      <div className={shell.slotContent}>
        <div className={styles.ios}>
          <form className={styles.form} onSubmit={(e)=>e.preventDefault()}>
            <div className={styles.block}>
              <span className={styles.label}>Matrícula Contenedor</span>
              <input className={styles.input} value={newMatricula} onChange={e=>setNewMatricula(e.target.value)} required />
            </div>

            <div className={styles.block}>
              <span className={styles.label}>Naviera</span>
              <input className={styles.input} value={newNaviera} onChange={e=>setNewNaviera(e.target.value)} />
            </div>

            <div className={styles.grid2}>
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
            </div>

            <div className={styles.row}>
              <div className={styles.block}>
                <span className={styles.label}>Defectuoso</span>
                <label className={styles.switch}>
                  <input type="checkbox" checked={isBroken} onChange={e=>setIsBroken(e.target.checked)} />
                  <span className={styles.switchTrack}></span>
                  <span className={styles.switchThumb}></span>
                </label>
              </div>

              {!isBroken && (
                <div className={styles.block}>
                  <span className={styles.label}>Estado</span>
                  <select className={styles.select} value={newEstado} onChange={e=>setNewEstado(e.target.value)}>
                    <option>Lleno</option><option>Vacío</option>
                  </select>
                </div>
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
          </form>
        </div>
      </div>

      {/* footer fix: aici doar acțiunile */}
      <div className={shell.slotFooter}>
        <div className={styles.actions}>
          <button type="button" className={styles.btn} onClick={onClose}>Cancelar</button>
          <button type="button" className={`${styles.btn} ${styles.primary}`} onClick={onSubmit}>Guardar</button>
        </div>
      </div>
    </Modal>
  );
}
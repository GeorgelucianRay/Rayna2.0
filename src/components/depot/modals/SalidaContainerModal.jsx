import React, { useState, useEffect } from 'react';
import Modal from '../../ui/Modal';
import shell from '../../ui/Modal.module.css';
import styles from './SalidaContainerModal.module.css';

export default function SalidaContainerModal({
  isOpen,
  onClose,
  onSubmit,
  salidaMatriculaCamion,
  setSalidaMatriculaCamion,
  selectedContainer,
}) {
  const [localMatricula, setLocalMatricula] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLocalMatricula(salidaMatriculaCamion || '');
    }
  }, [isOpen, salidaMatriculaCamion]);

  if (!isOpen || !selectedContainer) return null;

  const handleSave = (e) => {
    e.preventDefault();
    if (!localMatricula.trim()) {
      alert('Introduce la matrícula del camión.');
      return;
    }
    setSalidaMatriculaCamion(localMatricula.toUpperCase());
    onSubmit(e);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Registrar salida" fillOnMobile>
      {/* Header */}
      <div className={shell.slotHeader}>
        <h3 className={styles.title}>Registrar salida</h3>
        <p className={styles.subtitle}>
          {selectedContainer?.matricula_contenedor || '—'}
        </p>
      </div>

      {/* Content */}
      <div className={shell.slotContent}>
        <div className={styles.ios}>
          <div className={styles.block}>
            <span className={styles.label}>Matrícula del camión</span>
            <input
              id="salidaMatriculaCamion"
              type="text"
              className={styles.input}
              value={localMatricula}
              onChange={(e) => setLocalMatricula(e.target.value.toUpperCase())}
              placeholder="Ej: 1234-ABC"
              style={{ textTransform: 'uppercase' }}
              autoCapitalize="characters"
              spellCheck={false}
            />
          </div>

          <div className={styles.blockInfo}>
            <p>
              Confirma la salida de este contenedor y registra la matrícula del camión que lo retira.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={shell.slotFooter}>
        <div className={styles.actions}>
          <button type="button" className={styles.btn} onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.primary}`}
            onClick={handleSave}
            disabled={!localMatricula.trim()}
          >
            Guardar
          </button>
        </div>
      </div>
    </Modal>
  );
}
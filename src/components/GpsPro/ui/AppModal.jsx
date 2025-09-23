// src/components/GpsPro/ui/AppModal.jsx
import React from 'react';
import styles from '../GpsPro.module.css';

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" className={styles.icon}>
    <path fill="currentColor" d="M18.3 5.71L12 12.01l-6.29-6.3L4.29 7.12L10.59 13.4l-6.3 6.3l1.42 1.41l6.29-6.29l6.3 6.29l1.41-1.41l-6.29-6.3l6.29-6.29z"/>
  </svg>
);

export default function AppModal({ title, children, onClose, footer }) {
  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e)=>e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{title}</h3>
          <button className={styles.iconBtn} onClick={onClose} aria-label="Cerrar">
            <CloseIcon/>
          </button>
        </div>
        <div className={styles.modalBody}>{children}</div>
        {footer && <div className={styles.modalFooter}>{footer}</div>}
      </div>
    </div>
  );
}
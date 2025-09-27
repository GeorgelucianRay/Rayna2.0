import React from 'react';
import styles from './AdminFeedback.module.css';

export default function FeedbackDetailsModal({ open, onClose, item }) {
  if (!open || !item) return null;

  const created = new Date(item.created_at).toLocaleString();
  const name = item.profiles?.nombre_completo ?? '-';
  const email = item.profiles?.email ?? '-';
  const role = item.profiles?.role ?? '-';

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e)=>e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Detalle de feedback</h3>
          <button className={styles.modalClose} onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <div className={styles.detailGrid}>
          <div>
            <div className={styles.label}>Fecha</div>
            <div className={styles.value}>{created}</div>
          </div>
          <div>
            <div className={styles.label}>Nombre</div>
            <div className={styles.value}>{name}</div>
          </div>
          <div>
            <div className={styles.label}>Email</div>
            <div className={styles.value}>{email}</div>
          </div>
          <div>
            <div className={styles.label}>Rol</div>
            <div className={styles.value}>{role}</div>
          </div>
        </div>

        <div className={styles.label} style={{marginTop:'.5rem'}}>Mensaje</div>
        <div className={styles.messageBox}>{item.message}</div>
      </div>
    </div>
  );
}
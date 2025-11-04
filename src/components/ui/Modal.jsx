// src/components/ui/Modal.jsx
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './Modal.module.css';

const modalRoot = typeof document !== 'undefined' ? document.body : null;

export default function Modal({
  isOpen,
  onClose,
  children,
  ariaLabel = 'Modal',
  wide = false,
  fillOnMobile = true,     // ⬅️ nou: sheet full pe mobile
}) {
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';   // ⬅️ blochează scrollul paginii
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (!isOpen || !modalRoot) return null;

  return createPortal(
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label={ariaLabel}>
      <div
        className={[
          styles.modalContent,
          wide ? styles.wide : '',
          fillOnMobile ? styles.fillMobile : '',
        ].join(' ')}
        role="document"
      >
        <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">×</button>
        {children}
      </div>
      <button className={styles.backdrop} onClick={onClose} aria-label="Cerrar overlay" />
    </div>,
    modalRoot
  );
}
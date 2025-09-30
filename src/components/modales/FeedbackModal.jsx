import React, { useState } from 'react';
import styles from './FeedbackModal.module.css';

export default function FeedbackModal({ isOpen, onClose, onSubmit }) {
  const [feedback, setFeedback] = useState('');

  if (!isOpen) return null;

  const handleOverlayClick = () => {
    onClose();                // închide la click pe fundal
  };

  const stop = (e) => e.stopPropagation(); // nu propagăm click-ul pe card

  const handleSubmit = async () => {
    const text = feedback.trim();
    if (!text) return;

    try {
      await onSubmit(text);   // trimite la părinte
    } finally {
      setFeedback('');        // curăță câmpul
      onClose();              // și închide IMEDIAT
    }
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal} onClick={stop}>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Cerrar"
        >
          ×
        </button>

        <h3>¡Ayúdanos a mejorar las funciones!</h3>
        <p>Cuéntanos qué te gustaría ver añadido en la aplicación.</p>

        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Tu sugerencia..."
          rows={5}
        />

        <button
          type="button"
          className={styles.submitButton}
          onClick={handleSubmit}
          disabled={!feedback.trim()}
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
// src/components/modales/FeedbackModal.jsx
import React, { useState } from 'react';
import styles from './FeedbackModal.module.css'; // Crea también un archivo CSS para los estilos

export default function FeedbackModal({ isOpen, onClose, onSubmit }) {
  const [feedback, setFeedback] = useState('');

  if (!isOpen) {
    return null;
  }

  const handleSubmit = () => {
    if (feedback.trim()) {
      onSubmit(feedback);
      setFeedback(''); // Vacía el campo después de enviar
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button className={styles.closeButton} onClick={onClose}>×</button>
        <h3>¡Ayúdanos a mejorar las funciones!</h3>
        <p>Cuéntanos qué te gustaría ver añadido en la aplicación.</p>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Tu sugerencia..."
          rows="5"
        />
        <button className={styles.submitButton} onClick={handleSubmit}>
          Enviar
        </button>
      </div>
    </div>
  );
}
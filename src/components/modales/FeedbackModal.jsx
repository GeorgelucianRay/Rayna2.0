// src/components/modales/FeedbackModal.jsx
import React, { useState } from 'react';
import styles from './FeedbackModal.module.css'; // Creează și un fișier CSS pentru stilizare

export default function FeedbackModal({ isOpen, onClose, onSubmit }) {
  const [feedback, setFeedback] = useState('');

  if (!isOpen) {
    return null;
  }

  const handleSubmit = () => {
    if (feedback.trim()) {
      onSubmit(feedback);
      setFeedback(''); // Golește căsuța după trimitere
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button className={styles.closeButton} onClick={onClose}>×</button>
        <h3>Ajută-ne să extindem funcțiile!</h3>
        <p>Spune-ne ce ai vrea să vezi în plus în aplicație.</p>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Sugestia ta..."
          rows="5"
        />
        <button className={styles.submitButton} onClick={handleSubmit}>
          Trimite
        </button>
      </div>
    </div>
  );
}

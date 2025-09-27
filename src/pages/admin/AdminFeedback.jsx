import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import './AdminFeedback.css';

export default function AdminFeedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [selected, setSelected] = useState(null); // feedback selectat
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFeedback = async () => {
      const { data, error } = await supabase
        .from('feedback_utilizatori')
        .select(`id, continut, created_at, user_id, profiles(nombre_completo, email, role)`)
        .order('created_at', { ascending: false });

      if (error) setError(error.message);
      else setFeedbacks(data || []);
    };

    fetchFeedback();
  }, []);

  return (
    <div className="admin-feedback-container">
      <div className="admin-feedback-header">
        <h2>📋 Feedback de usuarios</h2>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="feedback-list">
        {feedbacks.length === 0 ? (
          <p className="no-results">No hay resultados.</p>
        ) : (
          <table className="feedback-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Ver</th>
              </tr>
            </thead>
            <tbody>
              {feedbacks.map((fb) => (
                <tr key={fb.id}>
                  <td>{new Date(fb.created_at).toLocaleString()}</td>
                  <td>{fb.profiles?.nombre_completo || '—'}</td>
                  <td>{fb.profiles?.email || '—'}</td>
                  <td>{fb.profiles?.role || '—'}</td>
                  <td>
                    <button
                      className="view-btn"
                      onClick={() => setSelected(fb)}
                    >
                      👁️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pop-up detalii feedback */}
      {selected && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="close-btn" onClick={() => setSelected(null)}>
              ✖
            </button>
            <h3>📩 Detalles del Feedback</h3>
            <p><strong>Fecha:</strong> {new Date(selected.created_at).toLocaleString()}</p>
            <p><strong>Nombre:</strong> {selected.profiles?.nombre_completo || '—'}</p>
            <p><strong>Email:</strong> {selected.profiles?.email || '—'}</p>
            <p><strong>Rol:</strong> {selected.profiles?.role || '—'}</p>
            <hr />
            <p className="feedback-text">{selected.continut}</p>
          </div>
        </div>
      )}
    </div>
  );
}
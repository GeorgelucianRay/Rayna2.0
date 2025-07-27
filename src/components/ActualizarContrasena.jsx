// src/components/ActualizarContrasena.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './iniciarsesion.css';

function ActualizarContrasena() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Verificăm dacă există un token în URL la încărcarea paginii
  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        // Acum utilizatorul este autentificat temporar și poate schimba parola
        setMessage("Puedes establecer tu nueva contraseña.");
      }
    });
  }, []);

  const handleUpdatePassword = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    // Logica de actualizare a parolei cu Supabase
    const { data, error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      setError(error.message || "No se pudo actualizar la contraseña.");
    } else {
      setMessage('¡Tu contraseña ha sido actualizada con éxito! Redireccionando al login...');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Establecer Nueva Contraseña</h2>

        {message && <p style={{ color: 'green', textAlign: 'center', marginBottom: '16px' }}>{message}</p>}
        {error && <p className="error-message">{error}</p>}
        
        <form onSubmit={handleUpdatePassword}>
          <div>
            <label htmlFor="new-password" className="form-label">Nueva Contraseña</label>
            <input
              type="password"
              id="new-password"
              className="form-input"
              placeholder="Introduce tu nueva contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ActualizarContrasena;
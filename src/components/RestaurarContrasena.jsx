import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient'; // Importăm clientul Supabase
import './iniciarsesion.css'; // Reutilizăm stilurile

function RestaurarContrasena() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handlePasswordReset = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/actualizar-contrasena`, // Pagina unde va fi redirecționat userul
    });

    if (error) {
      setError(`Error: ${error.message}`);
    } else {
      setMessage('Se ha enviado un enlace para restaurar la contraseña a tu correo electrónico.');
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Restaurar Contraseña</h2>
        <p className="link-text" style={{ marginTop: '-16px', marginBottom: '24px' }}>
          Introduce tu correo y te enviaremos un enlace para resetear tu contraseña.
        </p>

        {message && <p style={{ color: 'green', textAlign: 'center', marginBottom: '16px' }}>{message}</p>}
        {error && <p className="error-message">{error}</p>}

        <form onSubmit={handlePasswordReset}>
          <div>
            <label htmlFor="email" className="form-label">
              Correo Electrónico
            </label>
            <input
              type="email"
              id="email"
              className="form-input"
              placeholder="tu@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar Enlace'}
          </button>
        </form>

        <p className="link-text">
          <Link to="/login" className="link-style">
            Volver a Iniciar Sesión
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RestaurarContrasena;
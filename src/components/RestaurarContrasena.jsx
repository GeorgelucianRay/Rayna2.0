import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './iniciarsesion.css';

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
      redirectTo: `${window.location.origin}/actualizar-contrasena`,
    });

    if (error) setError(`Error: ${error.message}`);
    else setMessage('Se ha enviado un enlace para restaurar la contraseña a tu correo.');
    setLoading(false);
  };

  return (
    <div className="raynaLogin">
      <div className="raynaBg" aria-hidden="true" />
      <div className="raynaGlow" aria-hidden="true" />

      <div className="raynaCard">
        <div className="raynaTop">
          <div className="raynaLogo" aria-hidden="true">
            <span className="raynaLogoIcon">🔁</span>
          </div>
          <h2 className="raynaBrand">Rayna 2.0</h2>
          <p className="raynaSub">Logistics Management System</p>
        </div>

        <div className="raynaIntro">
          <h1 className="raynaTitle">Restaurar contraseña</h1>
          <p className="raynaHint">Introduce tu correo y te enviaremos un enlace</p>
        </div>

        {error && (
          <div className="raynaError" role="alert" aria-live="polite">
            <span className="raynaErrorIcon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="raynaSuccess" role="status" aria-live="polite">
            <span className="raynaSuccessIcon">✅</span>
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handlePasswordReset} className="raynaForm">
          <div className="raynaField">
            <label htmlFor="email" className="raynaLabel">Correo electrónico</label>
            <input
              type="email"
              id="email"
              className="raynaInput"
              placeholder="tu@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              inputMode="email"
              autoComplete="email"
            />
          </div>

          <button type="submit" className="raynaBtnPrimary" disabled={loading || !email.trim()}>
            {loading ? 'Enviando…' : 'Enviar enlace'}
            <span className="raynaArrow">→</span>
          </button>

          <div className="raynaFooter">
            <p className="raynaFooterText">
              <Link to="/login" className="raynaLinkStrong">Volver a iniciar sesión</Link>
            </p>
          </div>
        </form>

        <div className="raynaBadge" aria-hidden="true">
          <span>🔒</span>
          <span>ENCRYPTED CONNECTION</span>
        </div>
      </div>
    </div>
  );
}

export default RestaurarContrasena;
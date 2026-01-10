import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './iniciarsesion.css';

function ActualizarContrasena() {
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMessage('Puedes establecer tu nueva contraseña.');
      }
    });

    return () => {
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const handleUpdatePassword = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message || 'No se pudo actualizar la contraseña.');
      setLoading(false);
      return;
    }

    setMessage('¡Contraseña actualizada! Redireccionando al login…');
    setLoading(false);

    setTimeout(() => navigate('/login'), 2000);
  };

  return (
    <div className="raynaLogin">
      <div className="raynaBg" aria-hidden="true" />
      <div className="raynaGlow" aria-hidden="true" />

      <div className="raynaCard">
        <div className="raynaTop">
          <div className="raynaLogo" aria-hidden="true">
            <span className="raynaLogoIcon">🔑</span>
          </div>
          <h2 className="raynaBrand">Rayna 2.0</h2>
          <p className="raynaSub">Logistics Management System</p>
        </div>

        <div className="raynaIntro">
          <h1 className="raynaTitle">Nueva contraseña</h1>
          <p className="raynaHint">Establece una contraseña segura</p>
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

        <form onSubmit={handleUpdatePassword} className="raynaForm">
          <div className="raynaField">
            <label htmlFor="new-password" className="raynaLabel">Nueva contraseña</label>

            <div className="raynaPasswordWrap">
              <input
                type={showPw ? 'text' : 'password'}
                id="new-password"
                className="raynaInput raynaInputPw"
                placeholder="Introduce tu nueva contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="raynaPwToggle"
                aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                onClick={() => setShowPw(v => !v)}
              >
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button type="submit" className="raynaBtnPrimary" disabled={loading || password.length < 6}>
            {loading ? 'Actualizando…' : 'Actualizar contraseña'}
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

export default ActualizarContrasena;
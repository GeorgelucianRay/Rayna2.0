import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './iniciarsesion.css';

function Registrar() {
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPass1, setShowPass1] = useState(false);
  const [showPass2, setShowPass2] = useState(false);

  const [loading, setLoading] = useState(false);
const [message, setMessage] = useState('');
const [error, setError] = useState(null);

  const passwordsMismatch = useMemo(() => {
    if (!password || !confirmPassword) return false;
    return password !== confirmPassword;
  }, [password, confirmPassword]);

  const disableSubmit =
    loading ||
    !nombreCompleto.trim() ||
    !email.trim() ||
    !password ||
    !confirmPassword ||
    passwordsMismatch;

  const handleRegister = async (event) => {
    event.preventDefault();
    setError(null);
    setMessage('');

    const fullName = nombreCompleto.trim();

    if (!fullName) {
      setError('El nombre completo es obligatorio');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            nombre_completo: fullName,
            full_name: fullName, // bonus (compat)
          },
        },
      });

      if (signUpError) throw signUpError;

      setMessage('¡Registro exitoso! Revisa tu correo para confirmar la cuenta.');

      setNombreCompleto('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setShowPass1(false);
      setShowPass2(false);
    } catch (err) {
      setError(err.message || 'No se pudo completar el registro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="raynaLogin">
      <div className="raynaBg" aria-hidden="true" />
      <div className="raynaGlow" aria-hidden="true" />

      <div className="raynaCard">
        <div className="raynaTop">
          <div className="raynaLogo" aria-hidden="true">
            <span className="raynaLogoIcon">🧾</span>
          </div>
          <h2 className="raynaBrand">Rayna 2.0</h2>
          <p className="raynaSub">Logistics Management System</p>
        </div>

        <div className="raynaIntro">
          <h1 className="raynaTitle">Crear cuenta</h1>
          <p className="raynaHint">Completa tus datos para solicitar acceso</p>
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

        <form onSubmit={handleRegister} className="raynaForm">
          <div className="raynaField">
            <label htmlFor="nombreCompleto" className="raynaLabel">Nombre completo</label>
            <input
              type="text"
              id="nombreCompleto"
              className="raynaInput"
              placeholder="Juan Pérez"
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              required
              autoComplete="name"
            />
          </div>

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

          <div className="raynaField">
            <label htmlFor="password" className="raynaLabel">Contraseña</label>
            <div className="raynaPasswordWrap">
              <input
                type={showPass1 ? 'text' : 'password'}
                id="password"
                className="raynaInput raynaInputPw"
                placeholder="************"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="raynaPwToggle"
                aria-label={showPass1 ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                onClick={() => setShowPass1(v => !v)}
              >
                {showPass1 ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="raynaField">
            <label htmlFor="confirmPassword" className="raynaLabel">Repetir contraseña</label>
            <div className={`raynaPasswordWrap ${passwordsMismatch ? 'raynaMismatch' : ''}`}>
              <input
                type={showPass2 ? 'text' : 'password'}
                id="confirmPassword"
                className="raynaInput raynaInputPw"
                placeholder="************"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="raynaPwToggle"
                aria-label={showPass2 ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                onClick={() => setShowPass2(v => !v)}
              >
                {showPass2 ? '🙈' : '👁️'}
              </button>
            </div>

            {passwordsMismatch && (
              <div className="raynaInlineError">Las contraseñas no coinciden.</div>
            )}
          </div>

          <button type="submit" className="raynaBtnPrimary" disabled={disableSubmit}>
            {loading ? 'Registrando…' : 'Registrar'}
            <span className="raynaArrow">→</span>
          </button>

          <div className="raynaFooter">
            <p className="raynaFooterText">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="raynaLinkStrong">Iniciar sesión</Link>
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

export default Registrar;
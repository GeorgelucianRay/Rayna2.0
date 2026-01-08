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
    if (!password || !confirmPassword) return false; // nu arătăm până nu scrie în ambele
    return password !== confirmPassword;
  }, [password, confirmPassword]);

  const handleRegister = async (event) => {
    event.preventDefault();

    setError(null);
    setMessage('');

    if (!nombreCompleto.trim()) {
      setError('El nombre completo es obligatorio');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      // 1) Crear usuario
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) throw signUpError;

      const userId = data?.user?.id;
      if (!userId) throw new Error('No se pudo obtener el ID del usuario.');

      // 2) Crear perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email,
          nombre_completo: nombreCompleto.trim(),
          role: 'sofer', // schimbă dacă vrei alt rol default
        });

      if (profileError) throw profileError;

      setMessage('¡Registro exitoso! Por favor, revisa tu correo para confirmar tu cuenta.');

      // reset
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

  const disableSubmit =
    loading ||
    !nombreCompleto.trim() ||
    !email.trim() ||
    !password ||
    !confirmPassword ||
    passwordsMismatch;

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Crear Cuenta</h2>

        {error && <p className="error-message">{error}</p>}
        {message && (
          <p style={{ color: 'green', textAlign: 'center', marginBottom: '16px' }}>
            {message}
          </p>
        )}

        <form onSubmit={handleRegister} className="form-group-spacing">
          {/* Nombre completo */}
          <div>
            <label htmlFor="nombreCompleto" className="form-label">Nombre Completo</label>
            <input
              type="text"
              id="nombreCompleto"
              className="form-input"
              placeholder="Juan Pérez"
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              required
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="form-label">Correo Electrónico</label>
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

          {/* Password + toggle */}
          <div>
            <label htmlFor="password" className="form-label">Contraseña</label>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type={showPass1 ? 'text' : 'password'}
                id="password"
                className="form-input"
                placeholder="************"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowPass1((v) => !v)}
                aria-label={showPass1 ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPass1 ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          {/* Confirm password + toggle + mismatch */}
          <div>
            <label htmlFor="confirmPassword" className="form-label">Repetir Contraseña</label>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type={showPass2 ? 'text' : 'password'}
                id="confirmPassword"
                className="form-input"
                placeholder="************"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{ flex: 1, borderColor: passwordsMismatch ? '#ef4444' : undefined }}
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowPass2((v) => !v)}
                aria-label={showPass2 ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPass2 ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>

            {passwordsMismatch && (
              <div style={{ color: '#ef4444', marginTop: '6px', fontSize: '0.9rem' }}>
                Las contraseñas no coinciden.
              </div>
            )}
          </div>

          <button type="submit" className="btn-primary" disabled={disableSubmit}>
            {loading ? 'Registrando...' : 'Registrar'}
          </button>
        </form>

        <p className="link-text">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="link-style">
            Iniciar Sesión
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Registrar;
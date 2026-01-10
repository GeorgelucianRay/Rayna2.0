import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './iniciarsesion.css';

function IniciarSesion() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  const canSubmit = useMemo(() => {
    return !loading && email.trim().length > 3 && password.length >= 1;
  }, [loading, email, password]);

  const handleLogin = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    try {
      const { data: { user }, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (loginError) throw loginError;
      if (!user) throw new Error('Autentificare eșuată.');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw new Error('Nu s-a putut citi profilul. (RLS?)');
      if (!profile?.role) throw new Error('Profilul nu are rol setat. Contactează admin.');

      switch (profile.role) {
        case 'admin':
        case 'dispecer':
          navigate('/dispecer-homepage');
          break;
        case 'mecanic':
          navigate('/taller');
          break;
        case 'sofer':
          navigate('/sofer-homepage');
          break;
        default:
          throw new Error(`Rol necunoscut: ${profile.role}`);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Eroare la autentificare.');
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
            <span className="raynaLogoIcon">🚚</span>
          </div>
          <h2 className="raynaBrand">Rayna 2.0</h2>
          <p className="raynaSub">Logistics Management System</p>
        </div>

        <div className="raynaIntro">
          <h1 className="raynaTitle">Iniciar sesión</h1>
          <p className="raynaHint">Introduce tus credenciales para continuar</p>
        </div>

        {error && (
          <div className="raynaError" role="alert" aria-live="polite">
            <span className="raynaErrorIcon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="raynaForm">
          <div className="raynaField">
            <label htmlFor="email" className="raynaLabel">Correo electrónico</label>
            <input
              type="email"
              id="email"
              name="email"
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
            <div className="raynaRow">
              <label htmlFor="password" className="raynaLabel">Contraseña</label>
              <Link to="/restaurar-contrasena" className="raynaLink">¿Olvidaste la contraseña?</Link>
            </div>

            <div className="raynaPasswordWrap">
              <input
                type={showPw ? 'text' : 'password'}
                id="password"
                name="password"
                className="raynaInput raynaInputPw"
                placeholder="************"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
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

          <button type="submit" className="raynaBtnPrimary" disabled={!canSubmit}>
            {loading ? 'Cargando…' : 'Entrar'}
            <span className="raynaArrow">→</span>
          </button>

          <div className="raynaFooter">
            <p className="raynaFooterText">
              ¿Aún no tienes cuenta?{' '}
              <Link to="/registro" className="raynaLinkStrong">Registrar</Link>
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

export default IniciarSesion;
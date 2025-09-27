import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './iniciarsesion.css';

function IniciarSesion() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // autentificare simplă
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;
      const user = data?.user;
      if (!user) throw new Error('Autentificare eșuată.');

      // citire rol (dar nu mai blocăm dacă lipsesc date)
      let role = 'sofer'; // fallback implicit
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          console.warn('Eroare la citirea profilului:', profileError.message);
        }
        if (profile?.role) {
          role = profile.role;
        }
      } catch (err) {
        console.warn('Nu s-a putut încărca profilul:', err.message);
      }

      // navigare după rol
      if (role === 'dispecer' || role === 'admin') {
        navigate('/dispecer-homepage');
      } else if (role === 'mecanic') {
        navigate('/taller');
      } else {
        navigate('/sofer-homepage');
      }
    } catch (err) {
      console.error('Eroare la login:', err.message);
      setError(err.message || 'Eroare la autentificare.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Iniciar Sesión</h2>
        {error && <p className="error-message">{error}</p>}
        <form onSubmit={handleLogin} className="form-group-spacing">
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
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="password" className="form-label">Contraseña</label>
            <input
              type="password"
              id="password"
              className="form-input"
              placeholder="************"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Cargando...' : 'Entrar'}
          </button>
        </form>
        <p className="link-text">
          ¿Aún no tienes cuenta?{' '}
          <Link to="/registro" className="link-style">Registrar</Link>
        </p>
        <p className="link-text mt-2-px">
          <Link to="/restaurar-contrasena" className="link-style">Restaurar Contraseña</Link>
        </p>
      </div>
    </div>
  );
}

export default IniciarSesion;
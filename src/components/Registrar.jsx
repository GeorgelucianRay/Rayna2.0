import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './iniciarsesion.css';

function Registrar() {
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);

  const handleRegister = async (event) => {
    event.preventDefault();

    if (!nombreCompleto.trim()) {
      setError('El nombre completo es obligatorio');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage('');

    try {
      // 1️⃣ Crear usuario en Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;

      const userId = data?.user?.id;
      if (!userId) {
        throw new Error('No se pudo obtener el ID del usuario.');
      }

      // 2️⃣ Crear profilul imediat
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email,
          nombre_completo: nombreCompleto.trim(),
          role: 'sofer', // 🔁 poți schimba: 'user', 'sofer', etc.
        });

      if (profileError) throw profileError;

      // 3️⃣ Mesaj succes
      setMessage(
        '¡Registro exitoso! Por favor, revisa tu correo para confirmar tu cuenta.'
      );

      // Reset form
      setNombreCompleto('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'No se pudo completar el registro.');
    } finally {
      setLoading(false);
    }
  };

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
          {/* NOMBRE COMPLETO */}
          <div>
            <label htmlFor="nombreCompleto" className="form-label">
              Nombre Completo
            </label>
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

          {/* EMAIL */}
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

          {/* PASSWORD */}
          <div>
            <label htmlFor="password" className="form-label">
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              className="form-input"
              placeholder="************"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* CONFIRM PASSWORD */}
          <div>
            <label htmlFor="confirmPassword" className="form-label">
              Repetir Contraseña
            </label>
            <input
              type="password"
              id="confirmPassword"
              className="form-input"
              placeholder="************"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
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
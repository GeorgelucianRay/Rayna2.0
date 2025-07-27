// src/components/Registrar.jsx

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient'; // Asigură-te că acest import este corect
import './iniciarsesion.css';

function Registrar() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleRegister = async (event) => {
    event.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage('');

    try {
      // Logica de înregistrare cu Supabase
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (error) {
        throw error;
      }

      // Afișează un mesaj de succes
      setMessage('¡Registro exitoso! Por favor, revisa tu correo para confirmar tu cuenta.');

    } catch (error) {
      setError(error.message || 'No se pudo completar el registro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Crear Cuenta</h2>

        {error && <p className="error-message">{error}</p>}
        {message && <p style={{ color: 'green', textAlign: 'center', marginBottom: '16px' }}>{message}</p>}

        <form onSubmit={handleRegister} className="form-group-spacing">
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
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'Registrando...' : 'Registrar'}
          </button>
        </form>

        <p className="link-text">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="link-style">
            Iniciar Sesión
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Registrar;

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
            const { data: { user }, error: loginError } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (loginError) throw loginError;

            if (user) {
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (profileError) {
                    throw new Error("Nu s-a putut găsi profilul utilizatorului.");
                }

                if (profile.role === 'dispecer') {
                    navigate('/dispecer-homepage');
                } else if (profile.role === 'sofer') {
                    navigate('/sofer-homepage');
                } else if (profile.role === 'mecanic') {
                    navigate('/taller');
                } else {
                    setError("Rol nedefinit. Contactează administratorul.");
                }
            }

        } catch (error) {
            setError(error.message || 'Credențiale incorecte sau eroare la obținerea rolului.');
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
                    ¿Aún no tienes cuenta?{" "}
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
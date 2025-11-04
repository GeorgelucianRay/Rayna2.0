import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function StartupRedirect() {
  const { session, sessionReady } = useAuth();

  // 👇 loader vizibil în loc de null
  if (!sessionReady) {
    return (
      <div style={{
        display: 'flex',
        height: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0b0b0b',
        color: 'white',
        fontFamily: 'Inter, sans-serif'
      }}>
        <p>Iniciando sesión…</p>
      </div>
    );
  }

  const last = localStorage.getItem('lastRoute');
  return session
    ? <Navigate to={last || '/depot'} replace />
    : <Navigate to="/login" replace />;
}
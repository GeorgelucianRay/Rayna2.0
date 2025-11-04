// src/StartupRedirect.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function StartupRedirect() {
  const { session, sessionReady } = useAuth();
  if (!sessionReady) return null;

  const last = localStorage.getItem('lastRoute');
  // dacă avem sesiune -> mergem la ultima rută folosită sau în Depot
  if (session) return <Navigate to={last || '/depot'} replace />;
  return <Navigate to="/login" replace />;
}
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function RequireAuth() {
  const { session, sessionReady } = useAuth();
  if (!sessionReady) return null;                 // așteaptă rehidratarea
  if (!session) return <Navigate to="/login" replace />;  // neautentificat -> login
  return <Outlet />;                              // autentificat -> rutele private
}
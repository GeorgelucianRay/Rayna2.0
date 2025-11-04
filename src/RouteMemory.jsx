import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function RouteMemory() {
  const { session } = useAuth();
  const { pathname, search } = useLocation();
  useEffect(() => {
    if (!session) return;
    const p = pathname + (search || '');
    if (!/^\/(login|registro|restaurar-contrasena|actualizar-contrasena)$/.test(p)) {
      localStorage.setItem('lastRoute', p);
    }
  }, [session, pathname, search]);
  return null;
}
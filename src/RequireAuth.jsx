// src/RequireAuth.jsx
import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';

export default function RequireAuth() {
  const navigate = useNavigate();
  const loc = useLocation();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let canceled = false;
    let unsub;

    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (canceled) return;

      if (error) {
        // doar mergem la /login, nu curățăm agresiv storage
        navigate('/login', { replace: true, state: { from: loc.pathname } });
        return;
      }

      const u = data?.session?.user || null;
      setUser(u);
      setChecking(false);
    })();

    // ascultă schimbările, dar NU da logout pe erori tranzitorii
    unsub = supabase.auth.onAuthStateChange((event, session) => {
      if (!session || event === 'SIGNED_OUT') {
        navigate('/login', { replace: true, state: { from: loc.pathname } });
        return;
      }
      setUser(session.user ?? null);
      setChecking(false);
    }).data.subscription.unsubscribe;

    return () => { canceled = true; try { unsub?.(); } catch {} };
  }, [navigate, loc.pathname]);

  if (checking) {
    return (
      <div style={{display:'grid',placeItems:'center',height:'100vh',color:'#eee'}}>
        <div>
          <div style={{opacity:.85, marginBottom:8}}>Iniciando sesión…</div>
          <small style={{opacity:.5}}>require-auth</small>
        </div>
      </div>
    );
  }

  if (!user) return null;
  return <Outlet />;
}
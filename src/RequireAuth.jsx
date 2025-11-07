import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';

export default function RequireAuth() {
  const nav = useNavigate();
  const loc = useLocation();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);

  const hardSignOut = async () => {
    try { await supabase.auth.signOut(); } catch {}
    try { localStorage.removeItem('rayna.auth'); } catch {}
    nav('/login', { replace: true, state: { from: loc.pathname } });
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (cancelled) return;

      if (error) return hardSignOut();

      if (data?.session?.user) {
        setUser(data.session.user);
        setChecking(false);
      } else {
        return hardSignOut();
      }

      const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
        if (!session || event === 'SIGNED_OUT') {
          hardSignOut();
          return;
        }
        setUser(session.user);
        setChecking(false);
      });

      return () => sub?.subscription?.unsubscribe?.();
    })();

    return () => { cancelled = true; };
  }, []); // eslint-disable-line

  if (checking) {
    return (
      <div style={{display:'grid',placeItems:'center',height:'100vh',color:'#eee'}}>
        <div>
          <div style={{opacity:.8, marginBottom:8}}>Iniciando sesión…</div>
          <small style={{opacity:.5}}>verificând sesiunea</small>
        </div>
      </div>
    );
  }

  if (!user) return null;
  return <Outlet />;
}
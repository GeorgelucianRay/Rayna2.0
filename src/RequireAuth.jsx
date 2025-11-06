// src/RequireAuth.jsx
import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';

export default function RequireAuth() {
  const nav = useNavigate();
  const loc = useLocation();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);

  // helper: semnalizează sesiune stricată și curăță
  const hardSignOut = async () => {
    try { await supabase.auth.signOut(); } catch {}
    try { localStorage.removeItem('rayna.auth'); } catch {}
    nav('/login', { replace: true, state: { from: loc.pathname } });
  };

  useEffect(() => {
    let canceled = false;
    let watchdog;

    (async () => {
      // 1) luăm sesiunea curentă
      const { data, error } = await supabase.auth.getSession();
      if (canceled) return;

      if (error) {
        console.warn('getSession error:', error);
        hardSignOut();
        return;
      }

      if (data?.session?.user) {
        setUser(data.session.user);
        setChecking(false);
      } else {
        // nu există sesiune → mergem la login
        hardSignOut();
        return;
      }

      // 2) ascultăm schimbările (including TOKEN_REFRESHED)
      const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
        // dacă s-a semnat out sau nu mai e sesiune → la login
        if (!session || event === 'SIGNED_OUT') {
          hardSignOut();
          return;
        }
        // sesiune validă → OK
        setUser(session.user);
        setChecking(false);
      });

      // 3) watchdog (dacă ceva rămâne “agățat” >8s, facem hard sign out)
      watchdog = setTimeout(() => {
        if (!user) hardSignOut();
      }, 8000);

      return () => {
        sub?.subscription?.unsubscribe?.();
      };
    })();

    return () => {
      canceled = true;
      if (watchdog) clearTimeout(watchdog);
    };
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
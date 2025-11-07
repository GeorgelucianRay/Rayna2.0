// src/RequireAuth.jsx
import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';

export default function RequireAuth() {
  const nav = useNavigate();
  const loc = useLocation();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);

  const gotoLogin = () =>
    nav('/login', { replace: true, state: { from: loc.pathname } });

  useEffect(() => {
    let canceled = false;
    let unsubscribe = () => {};

    (async () => {
      // 1) Citește sesiunea curentă (din cache local, rapid)
      const { data, error } = await supabase.auth.getSession();
      if (canceled) return;

      if (error) {
        console.warn('getSession error:', error);
        setUser(null);
        setChecking(false);
        gotoLogin();
        return;
      }

      if (data?.session?.user) {
        setUser(data.session.user);
        setChecking(false);
      } else {
        setUser(null);
        setChecking(false);
        gotoLogin();
        return;
      }

      // 2) Ascultă evenimentele de auth; nu mai folosim “hard sign out” decât pe semne clare
      const sub = supabase.auth.onAuthStateChange((event, session) => {
        // NOTE: evenimente valide: SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, USER_UPDATED, PASSWORD_RECOVERY
        if (event === 'SIGNED_OUT' || !session?.user) {
          setUser(null);
          gotoLogin();
          return;
        }
        // Orice alt eveniment cu sesiune validă -> rămânem în app
        setUser(session.user);
        setChecking(false);
      });
      unsubscribe = () => sub.data.subscription.unsubscribe();
    })();

    return () => { canceled = true; try { unsubscribe(); } catch {} };
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
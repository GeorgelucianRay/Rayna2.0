// src/StartupRedirect.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

export default function StartupRedirect() {
  const nav = useNavigate();

  useEffect(() => {
    let canceled = false;
    let watchdog;

    (async () => {
      const { data, error } = await supabase.auth.getSession();

      if (canceled) return;

      // dacă avem eroare pe sesiune → curățăm și login
      if (error) {
        try { await supabase.auth.signOut(); } catch {}
        try { localStorage.removeItem('rayna.auth'); } catch {}
        nav('/login', { replace: true });
        return;
      }

      const user = data?.session?.user;
      if (!user) {
        nav('/login', { replace: true });
        return;
      }

      // ai user → du-l unde ai logica ta default (ex: /rayna-hub sau homepage rol)
      // dacă ai RouteMemory, o poți citi de aici; mai jos pun defaultul tău
      nav('/rayna-hub', { replace: true });
    })();

    // watchdog: dacă rămâne suspendat, mergi la login
    watchdog = setTimeout(() => {
      try { localStorage.removeItem('rayna.auth'); } catch {}
      nav('/login', { replace: true });
    }, 6000);

    return () => { canceled = true; clearTimeout(watchdog); };
  }, [nav]);

  return (
    <div style={{display:'grid',placeItems:'center',height:'100vh',color:'#eee'}}>
      <div>
        <div style={{opacity:.85, marginBottom:8}}>Iniciando sesión…</div>
        <small style={{opacity:.5}}>startup</small>
      </div>
    </div>
  );
}
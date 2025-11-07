// src/RootGate.jsx
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

export default function RootGate() {
  const navigate = useNavigate();
  const fired = useRef(false);

  useEffect(() => {
    let cancel = false;

    (async () => {
      // citește sincronic din cache (nu lovește rețeaua)
      const { data: { session } } = await supabase.auth.getSession();
      if (cancel) return;

      const last = localStorage.getItem('lastRoute');
      const target = session ? (last || '/depot') : '/login';

      if (fired.current) return;
      fired.current = true;

      // NU mai folosim window.location.* aici
      navigate(target, { replace: true });
    })();

    return () => { cancel = true; };
  }, [navigate]);

  // ecran mic de splash cât timp facem redirectul
  return (
    <div style={{display:'grid',placeItems:'center',minHeight:'100vh',background:'#0b0b0b',color:'#fff'}}>
      <div>
        <div style={{opacity:.8, marginBottom:8}}>Iniciando sesión…</div>
        <small style={{opacity:.45}}>root-gate</small>
      </div>
    </div>
  );
}
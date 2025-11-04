// src/RootGate.jsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient'; // 🔴 interogăm direct Supabase

export default function RootGate() {
  const navigate = useNavigate();
  const fired = useRef(false);
  const [status, setStatus] = useState('boot'); // doar pt debug vizual

  // decide ținta direct din Supabase, fără Context
  useEffect(() => {
    let cancel = false;

    async function decide() {
      try {
        setStatus('getSession');
        // getSession citește din localStorage; e sync-ish, NU atinge rețeaua
        const { data: { session } } = await supabase.auth.getSession();

        if (cancel) return;

        const last = localStorage.getItem('lastRoute');
        const target = session ? (last || '/depot') : '/login';

        // 1) încerci router navigate
        setStatus(`navigate:${target}`);
        fired.current = true;
        navigate(target, { replace: true });

        // 2) dacă în 300ms tot pe "/" ești, forțează hard redirect
        setTimeout(() => {
          if (window.location.pathname === '/') {
            setStatus(`hard:${target}`);
            window.location.replace(target);
          }
        }, 300);
      } catch (e) {
        console.error('[RootGate getSession error]', e);
        // fallback sigur: du-l la login
        if (!cancel) {
          setStatus('error->/login');
          fired.current = true;
          window.location.replace('/login');
        }
      }
    }

    decide();

    // watchdog absolut: dacă orice s-a blocat, ieși din splash
    const wd = setTimeout(() => {
      if (!fired.current) {
        setStatus('watchdog->/login');
        window.location.replace('/login');
      }
    }, 4000);

    return () => { cancel = true; clearTimeout(wd); };
  }, [navigate]);

  // Splash + o mică etichetă de debug (o poți ascunde după ce confirmi)
  return (
    <div style={{
      display:'flex',alignItems:'center',justifyContent:'center',
      minHeight:'100vh',background:'#0b0b0b',color:'#fff',
      fontFamily:'Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif'
    }}>
      <div style={{textAlign:'center'}}>
        <div style={{
          width:48,height:48,borderRadius:'50%',
          border:'4px solid rgba(255,255,255,0.2)',
          borderTopColor:'#e10600', margin:'0 auto 14px',
          animation:'spin 1s linear infinite'
        }} />
        <div>Iniciando sesión…</div>
        <div style={{opacity:.35, fontSize:12, marginTop:6}}>{status}</div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
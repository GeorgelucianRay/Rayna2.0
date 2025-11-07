import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

export default function RootGate() {
  const navigate = useNavigate();
  const fired = useRef(false);
  const [status, setStatus] = useState('boot');

  useEffect(() => {
    let cancelled = false;

    const log = (msg, extra) => {
      setStatus(msg);
      try { window.__dbg?.log?.('root-gate', msg, extra || null); } catch {}
      // ca fallback minimal
      console.info('[root-gate]', msg, extra || '');
    };

    (async () => {
      try {
        log('getSession…');
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;

        // ținta
        const last = localStorage.getItem('lastRoute');
        const target = session ? (last && last !== '/' ? last : '/depot') : '/login';
        log('navigate', { target });

        fired.current = true;
        navigate(target, { replace: true });

        // dacă rămânem pe "/" după 1200ms -> mergem la /login o singură dată
        setTimeout(() => {
          if (cancelled) return;
          if (window.location.pathname === '/') {
            log('fallback->navigate:/login');
            navigate('/login', { replace: true });
          }
        }, 1200);

        // dacă **tot** pe "/" după 4s -> forțăm href (o singură dată, fără loop)
        setTimeout(() => {
          if (cancelled) return;
          if (window.location.pathname === '/') {
            log('final-fallback->href:/login');
            window.location.href = '/login';
          }
        }, 4000);
      } catch (e) {
        log('error->navigate:/login', e?.message);
        if (!cancelled) navigate('/login', { replace: true });
      }
    })();

    return () => { cancelled = true; };
  }, [navigate]);

  // Splash + eticheta de status (o vezi și în DBG)
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
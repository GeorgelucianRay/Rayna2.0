import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

export default function RootGate() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;

        const last = localStorage.getItem('lastRoute');
        const target = session ? (last || '/depot') : '/login';

        // Un singur redirect controlat de router:
        navigate(target, { replace: true });
      } catch (e) {
        // În caz de eroare, mergi la login (tot cu navigate)
        if (!cancelled) navigate('/login', { replace: true });
      }
    })();

    return () => { cancelled = true; };
  }, [navigate]);

  // Splash minimalist cât timp deciderea rulează
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
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
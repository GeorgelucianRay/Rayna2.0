// src/RootGate.jsx
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function RootGate() {
  const { session, sessionReady } = useAuth();
  const navigate = useNavigate();
  const did = useRef(false);

  useEffect(() => {
    if (did.current) return;
    // hard fallback: dacă ceva nu setează sessionReady, nu rămânem pe alb
    const safety = setTimeout(() => {
      if (!did.current) {
        did.current = true;
        navigate('/login', { replace: true });
      }
    }, 5000);

    return () => clearTimeout(safety);
  }, [navigate]);

  useEffect(() => {
    if (!sessionReady || did.current) return;
    did.current = true;
    const last = localStorage.getItem('lastRoute');
    const target = session ? (last || '/depot') : '/login';
    // iOS e mai fericit cu redirect imperativ decât cu <Navigate/>
    navigate(target, { replace: true });
  }, [sessionReady, session, navigate]);

  // Splash — vezi ceva, nu alb
  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'center',
      minHeight:'100vh', background:'#0b0b0b', color:'#fff',
      fontFamily:'Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif'
    }}>
      <div style={{textAlign:'center'}}>
        <div style={{
          width:48,height:48,borderRadius:'50%',
          border:'4px solid rgba(255,255,255,0.2)',
          borderTopColor:'#e10600', margin:'0 auto 14px', animation:'spin 1s linear infinite'
        }} />
        <div>Iniciando sesión…</div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
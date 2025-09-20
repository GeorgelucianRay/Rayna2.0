// src/components/GpsPro/hooks/useWakeLockStrict.jsx
import React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

export default function useWakeLockStrict() {
  const [active, setActive] = useState(false);
  const [needsPrompt, setNeedsPrompt] = useState(false);

  const wakeRef = useRef(null);
  const videoRef = useRef(null);
  const tryingRef = useRef(false);
  const idxRef = useRef(0);

  const CANDIDATES = ['/tiny.mp4', '/tiny.mp4.MOV', '/tiny.mov', '/tiny.MOV'];

  const ensureVideo = () => {
    if (videoRef.current) return videoRef.current;
    const v = document.createElement('video');
    v.setAttribute('playsinline', 'true');
    v.setAttribute('muted', 'true');
    v.setAttribute('loop', 'true');
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    Object.assign(v.style, {
      position: 'fixed', width: '1px', height: '1px', opacity: '0',
      pointerEvents: 'none', bottom: '0', left: '0', zIndex: -1,
    });
    document.body.appendChild(v);
    videoRef.current = v;
    return v;
  };

  const tryPlaySync = (v) => {
    // IMPORTANT: fără async/await aici ca să păstrăm gestul
    for (let i = 0; i < CANDIDATES.length; i++) {
      const j = (idxRef.current + i) % CANDIDATES.length;
      try {
        v.src = CANDIDATES[j];
        const p = v.play();
        // Unele browsere întorc Promise, dar în cadrul gestului pornește imediat
        if (p && typeof p.then === 'function') {
          p.catch(() => { /* ignorăm, încercăm următorul */ });
        }
        idxRef.current = j;
        return true;
      } catch (_) {
        // încearcă următorul
      }
    }
    return false;
  };

  const enable = useCallback((fromUserGesture = false) => {
    if (tryingRef.current || active) return true;
    tryingRef.current = true;
    setNeedsPrompt(false);

    // 1) Wake Lock API
    try {
      if ('wakeLock' in navigator && navigator.wakeLock?.request) {
        // în gest poate cere imediat
        navigator.wakeLock.request('screen').then(lock => {
          wakeRef.current = lock;
          wakeRef.current.addEventListener?.('release', () => setActive(false));
          setActive(true);
          tryingRef.current = false;
        }).catch(() => {
          // cădem pe video fallback
          tryVideo(fromUserGesture);
        });
        return true;
      }
    } catch {
      // cădem pe video fallback
    }

    // 2) Fallback video
    return tryVideo(fromUserGesture);
  }, [active]);

  const tryVideo = (fromUserGesture) => {
    try {
      const v = ensureVideo();
      const ok = fromUserGesture ? tryPlaySync(v) : false;
      if (ok) {
        setActive(true);
        tryingRef.current = false;
        return true;
      }
    } catch {}

    // 3) Prompt dacă nu a fost gest
    setNeedsPrompt(!fromUserGesture);
    setActive(false);
    tryingRef.current = false;
    return false;
  };

  const confirmEnable = useCallback(() => {
    // apelat din butonul "Activar" (gest direct)
    return enable(true);
  }, [enable]);

  const disable = useCallback(async () => {
    try {
      if (wakeRef.current) {
        await wakeRef.current.release?.();
        wakeRef.current = null;
      }
    } catch {}
    try {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load?.();
      }
    } catch {}
    setActive(false);
    setNeedsPrompt(false);
  }, []);

  // re-acquire când revii în tab
  useEffect(() => {
    const onFocus = () => { if (active) enable(true); };
    const onVis = () => { if (active && document.visibilityState === 'visible') enable(true); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [active, enable]);

  useEffect(() => () => { disable(); }, [disable]);

  return { active, needsPrompt, enable, confirmEnable, disable };
}

export function WakePrompt({ visible, onConfirm, onCancel }) {
  if (!visible) return null;
  const back = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 999999,
    display: 'flex', alignItems: 'center', justifyContent: 'center' };
  const card = { background: '#0b1f3a', color: '#e8f7ff', border: '1px solid #0ea5e9',
    borderRadius: 12, padding: '16px 18px', width: 'min(92vw, 420px)', boxShadow: '0 8px 28px rgba(0,0,0,.4)' };
  const h3 = { margin: '0 0 8px 0', fontSize: 18, fontWeight: 700 };
  const p  = { margin: '0 0 14px 0', fontSize: 14, lineHeight: 1.5, opacity: .9 };
  const row= { display: 'flex', gap: 8, justifyContent: 'flex-end' };
  const btn= { padding: '10px 14px', borderRadius: 9, border: '1px solid #1f2937', background: '#0f172a', color: '#e5f4ff', cursor: 'pointer' };
  const primary = { ...btn, borderColor: '#0891b2', background: '#0369a1' };

  return (
    <div style={back} onClick={onCancel}>
      <div style={card} onClick={e => e.stopPropagation()}>
        <h3 style={h3}>Mantener pantalla encendida</h3>
        <p style={p}>
          El navegador bloqueó el autoplay. Toca “Activar” para mantener la pantalla despierta mientras grabas.
        </p>
        <div style={row}>
          <button style={btn} onClick={onCancel}>Cancelar</button>
          <button style={primary} onClick={onConfirm}>Activar</button>
        </div>
      </div>
    </div>
  );
}
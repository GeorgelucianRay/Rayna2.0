// src/components/GpsPro/hooks/useWakeLockStrict.js
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * WakeLock STRICT fără dependențe:
 * 1) Folosește Wake Lock API când există (Android/Chrome etc.)
 * 2) Fallback video invizibil care rulează în buclă (iOS/Safari & altele)
 * 3) Dacă autoplay e blocat, afișează un overlay ca să ceară un gest ("Activar")
 *
 * Acceptă fișiere în /public cu nume:
 *   - /tiny.mp4
 *   - /tiny.mp4.MOV
 *   - /tiny.mov
 *   - /tiny.MOV
 *
 * Pune unul dintre ele în /public direct din telefon — nu e nevoie să-l redenumești.
 */

export default function useWakeLockStrict() {
  const [active, setActive] = useState(false);
  const [needsPrompt, setNeedsPrompt] = useState(false);

  const wakeRef = useRef(null);
  const videoRef = useRef(null);
  const tryingRef = useRef(false);
  const idxRef = useRef(0);

  // Ordinea de încercare pentru surse video fallback
  const CANDIDATES = [
    '/tiny.mp4',
    '/tiny.mp4.MOV',
    '/tiny.mov',
    '/tiny.MOV',
  ];

  const ensureVideo = () => {
    if (videoRef.current) return videoRef.current;

    const v = document.createElement('video');
    v.setAttribute('playsinline', 'true');
    v.setAttribute('muted', 'true');
    v.setAttribute('loop', 'true');
    v.muted = true;
    v.loop = true;
    v.playsInline = true;

    // ascuns total
    Object.assign(v.style, {
      position: 'fixed',
      width: '1px',
      height: '1px',
      opacity: '0',
      pointerEvents: 'none',
      bottom: '0',
      left: '0',
      zIndex: -1,
    });

    document.body.appendChild(v);
    videoRef.current = v;
    return v;
  };

  // încearcă să pornească redarea cu fiecare candidat
  const tryPlay = async (v) => {
    for (let i = 0; i < CANDIDATES.length; i++) {
      const j = (idxRef.current + i) % CANDIDATES.length;
      v.src = CANDIDATES[j];
      try {
        await v.play();
        idxRef.current = j;
        return true;
      } catch (e) {
        // trecem la următorul candidate
      }
    }
    return false;
  };

  const enable = useCallback(async () => {
    if (tryingRef.current || active) return true;
    tryingRef.current = true;
    setNeedsPrompt(false);

    // 1) Wake Lock API standard
    try {
      if ('wakeLock' in navigator && navigator.wakeLock?.request) {
        wakeRef.current = await navigator.wakeLock.request('screen');
        wakeRef.current.addEventListener?.('release', () => setActive(false));
        setActive(true);
        tryingRef.current = false;
        return true;
      }
    } catch {
      wakeRef.current = null;
    }

    // 2) Fallback video (iOS / browsere fără WakeLock)
    try {
      const v = ensureVideo();
      const ok = await tryPlay(v);
      if (ok) {
        setActive(true);
        tryingRef.current = false;
        return true;
      }
    } catch {
      // ignore
    }

    // 3) Dacă autoplay a fost blocat, cere un gest
    setNeedsPrompt(true);
    setActive(false);
    tryingRef.current = false;
    return false;
  }, [active]);

  const confirmEnable = useCallback(async () => {
    try {
      const v = ensureVideo();
      const ok = await tryPlay(v);
      if (ok) {
        setActive(true);
        setNeedsPrompt(false);
        return true;
      }
    } catch {
      // ignore
    }
    setNeedsPrompt(true);
    setActive(false);
    return false;
  }, []);

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
        // opțional, ștergem sursa ca să eliberăm conexiunea
        videoRef.current.removeAttribute('src');
        videoRef.current.load?.();
      }
    } catch {}
    setActive(false);
    setNeedsPrompt(false);
  }, []);

  // Re-acquire când revii în tab dacă era activ
  useEffect(() => {
    const onFocus = () => { if (active) enable(); };
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, [active, enable]);

  // Cleanup la demontare
  useEffect(() => () => { disable(); }, [disable]);

  return { active, needsPrompt, enable, confirmEnable, disable };
}

/**
 * Mic overlay pentru când autoplay este blocat
 * — userul trebuie să atingă „Activar”.
 */
export function WakePrompt({ visible, onConfirm, onCancel }) {
  if (!visible) return null;

  const back = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 999999,
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  };
  const card = {
    background: '#0b1f3a', color: '#e8f7ff', border: '1px solid #0ea5e9',
    borderRadius: 12, padding: '16px 18px', width: 'min(92vw, 420px)',
    boxShadow: '0 8px 28px rgba(0,0,0,.4)'
  };
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

// src/components/GpsPro/hooks/useWakeLockStrict.jsx
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Încearcă să mențină ecranul aprins folosind:
 * 1) Wake Lock API
 * 2) Un video invizibil fallback (folosește fișierul din public/tiny.mp4.MOV)
 * Dacă browserul nu permite autoplay, afişează un prompt.
 */
export default function useWakeLockStrict() {
  const [active, setActive] = useState(false);
  const [needsPrompt, setNeedsPrompt] = useState(false);

  const wakeRef  = useRef(null);
  const videoRef = useRef(null);
  const tryingRef = useRef(false);
  const idxRef    = useRef(0);

  // folosim doar tiny.mp4.MOV ca primă opţiune; îl poţi păstra pe al doilea
  const CANDIDATES = ['/tiny.mp4.MOV', '/tiny.mp4', '/tiny.mov', '/tiny.MOV'];

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

  // încearcă redarea sincronă (fără await) pe fiecare candidat; la succes revine true
  const tryPlaySync = (v) => {
    for (let i = 0; i < CANDIDATES.length; i++) {
      const j = (idxRef.current + i) % CANDIDATES.length;
      try {
        v.src = CANDIDATES[j];
        const p = v.play();
        if (p && typeof p.then === 'function') {
          p.catch(() => { /* trece la următorul */ });
        }
        idxRef.current = j;
        return true;
      } catch {
        // încearcă următorul candidat
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
        navigator.wakeLock.request('screen').then((lock) => {
          wakeRef.current = lock;
          wakeRef.current.addEventListener?.('release', () => setActive(false));
          setActive(true);
          tryingRef.current = false;
        }).catch(() => {
          tryVideo(fromUserGesture);
        });
        return true;
      }
    } catch {
      // trecem la fallback video
    }
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
    // dacă nu a fost gest al utilizatorului, cerem prompt
    setNeedsPrompt(!fromUserGesture);
    setActive(false);
    tryingRef.current = false;
    return false;
  };

  const confirmEnable = useCallback(() => enable(true), [enable]);

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

  // re-acquire la revenirea în tab
  useEffect(() => {
    const onFocus = () => { if (active) enable(true); };
    const onVis   = () => { if (active && document.visibilityState === 'visible') enable(true); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [active, enable]);

  // cleanup la demontare
  useEffect(() => () => { disable(); }, [disable]);

  return { active, needsPrompt, enable, confirmEnable, disable };
}
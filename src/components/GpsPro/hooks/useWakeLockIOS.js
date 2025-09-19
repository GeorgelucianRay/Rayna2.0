import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * WakeLock STRICT:
 * 1) Wake Lock API (Android/Chrome)
 * 2) Fallback video invizibil (iOS/others)
 * 3) Dacă încă e blocat, expune un overlay cu buton (gest direct) ca să pornească video.
 */

export default function useWakeLockStrict() {
  const [active, setActive] = useState(false);
  const [needsPrompt, setNeedsPrompt] = useState(false);
  const wakeRef = useRef(null);
  const videoRef = useRef(null);
  const tryingRef = useRef(false);

  const ensureVideo = () => {
    if (videoRef.current) return videoRef.current;
    const v = document.createElement('video');
    v.setAttribute('playsinline', 'true');
    v.setAttribute('muted', 'true');
    v.setAttribute('loop', 'true');
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.style.position = 'fixed';
    v.style.width = '1px';
    v.style.height = '1px';
    v.style.opacity = '0';
    v.style.pointerEvents = 'none';
    v.style.bottom = '0';
    v.style.left = '0';

    // MP4 foarte mic (1px negru). Dacă la tine nu pornește, pune un fișier tiny.mp4 în /public și schimbă cu '/tiny.mp4'.
    v.src = 'data:video/mp4;base64,AAAAIGZ0eXBtcDQyAAAAAG1wNDFtcDQyaXNvbWF2YzEAAAAIZnJlZQA=';
    document.body.appendChild(v);
    videoRef.current = v;
    return v;
  };

  const enable = useCallback(async () => {
    if (tryingRef.current || active) return true;
    tryingRef.current = true;
    setNeedsPrompt(false);

    // 1) Wake Lock API
    try {
      if ('wakeLock' in navigator && navigator.wakeLock?.request) {
        wakeRef.current = await navigator.wakeLock.request('screen');
        wakeRef.current.addEventListener?.('release', () => setActive(false));
        setActive(true);
        tryingRef.current = false;
        return true;
      }
    } catch (e) {
      // continuăm cu fallback
      wakeRef.current = null;
    }

    // 2) Fallback video invizibil (autoplay muted)
    try {
      const v = ensureVideo();
      await v.play();
      setActive(true);
      tryingRef.current = false;
      return true;
    } catch (e) {
      // 3) cerem gest direct explicit
      setNeedsPrompt(true);
      setActive(false);
      tryingRef.current = false;
      return false;
    }
  }, [active]);

  const confirmEnable = useCallback(async () => {
    // apelat dintr-un buton <onClick> (gest direct)
    try {
      const v = ensureVideo();
      await v.play();
      setActive(true);
      setNeedsPrompt(false);
      return true;
    } catch (e) {
      console.warn('Video fallback still blocked:', e);
      setNeedsPrompt(true);
      setActive(false);
      return false;
    }
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
      }
    } catch {}
    setActive(false);
    setNeedsPrompt(false);
  }, []);

  // Re-acquire când revii în tab/focus (doar dacă e activ)
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

/** Componentă mică de overlay, opțională */
export function WakePrompt({ visible, onConfirm, onCancel }) {
  if (!visible) return null;
  const back = {
    position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:999999,
    display:'flex', alignItems:'center', justifyContent:'center'
  };
  const card = {
    background:'#0b1f3a', color:'#e8f7ff', border:'1px solid #0ea5e9',
    borderRadius:12, padding:'16px 18px', width:'min(92vw,420px)', boxShadow:'0 8px 28px rgba(0,0,0,.4)'
  };
  const h3 = { margin:'0 0 8px 0', fontSize:18, fontWeight:700 };
  const p  = { margin:'0 0 14px 0', fontSize:14, lineHeight:1.5, opacity:.9 };
  const row={ display:'flex', gap:8, justifyContent:'flex-end' };
  const btn={ padding:'10px 14px', borderRadius:9, border:'1px solid #1f2937', background:'#0f172a', color:'#e5f4ff', cursor:'pointer' };
  const primary={ ...btn, borderColor:'#0891b2', background:'#0369a1' };
  return (
    <div style={back} onClick={onCancel}>
      <div style={card} onClick={e=>e.stopPropagation()}>
        <h3 style={h3}>Mantener pantalla encendida</h3>
        <p style={p}>iOS/Android ha bloqueado el autoplay. Toca “Activar” para mantener la pantalla despierta mientras grabas la ruta.</p>
        <div style={row}>
          <button style={btn} onClick={onCancel}>Cancelar</button>
          <button style={primary} onClick={onConfirm}>Activar</button>
        </div>
      </div>
    </div>
  );
}
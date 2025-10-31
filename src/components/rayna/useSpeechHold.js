// src/components/rayna/useSpeechHold.jsx
// Hook pentru voce cu buton ON/OFF (click start, click stop).
// Android/Chrome: Web Speech Recognition (gratis).
// iPhone/Safari: NU are SpeechRecognition → arată mesaj informativ.

export function makeSpeechHold({
  onResult,
  onStartChange,
  lang = 'es-ES',
  maxMs = 8000,
  debug = false,
} = {}) {
  const isIOS =
    typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const SR =
    !isIOS &&
    typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  let listening = false;
  let recognition = null;
  let mediaStream = null;
  let finalText = '';
  let safetyTimer = null;

  const log = (...a) => debug && console.log('[speech]', ...a);

  function setListening(v) {
    listening = v;
    try { onStartChange?.(v); } catch {}
  }

  async function ensureMicPermission() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microfon indisponibil pe acest dispozitiv.');
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return stream;
  }

  function clearSafety() {
    if (safetyTimer) {
      clearTimeout(safetyTimer);
      safetyTimer = null;
    }
  }

  function armSafety() {
    clearSafety();
    safetyTimer = setTimeout(() => {
      log('Safety stop (timeout)');
      stop();
    }, Math.max(1000, maxMs | 0));
  }

  async function start() {
    if (listening) return;
    if (!SR) {
      setListening(true);
      setTimeout(() => setListening(false), 200);
      alert('Pe acest iPhone/iPad nu există recunoaștere vocală în browser. Folosește tastatura sau Android/Chrome pentru voice.');
      return;
    }

    try {
      mediaStream = await ensureMicPermission();

      recognition = new SR();
      recognition.lang = lang;
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      finalText = '';

      recognition.onresult = (ev) => {
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const res = ev.results[i];
          if (res.isFinal) finalText += res[0]?.transcript || '';
        }
      };

      recognition.onerror = (ev) => log('SR onerror', ev?.error || ev);
      recognition.onend = () => stop();

      setTimeout(() => {
        try {
          recognition.start();
          setListening(true);
          armSafety();
        } catch (e) {
          log('SR start error', e);
          setListening(false);
          alert('Nu pot porni recunoașterea vocală pe acest dispozitiv.');
        }
      }, 120);
    } catch (e) {
      log('start() error', e);
      setListening(false);
      alert(e?.message || 'Nu pot porni microfonul.');
    }
  }

  function stop({ fallbackText = '' } = {}) {
    if (!listening && !recognition && !mediaStream) return;

    clearSafety();

    if (recognition) {
      try { recognition.stop(); } catch {}
      try {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
      } catch {}
      recognition = null;
    }

    try { mediaStream?.getTracks?.().forEach((t) => t.stop()); } catch {}
    mediaStream = null;

    const spoken = (finalText || '').trim();
    finalText = '';

    const deliver = spoken || (fallbackText || '').trim();
    if (deliver) { try { onResult?.(deliver); } catch {} }

    setListening(false);
  }

  async function toggle() {
    if (listening) stop({ fallbackText: '' });
    else await start();
  }

  function isListening() {
    return !!listening;
  }

  return { start, stop, toggle, isListening };
}
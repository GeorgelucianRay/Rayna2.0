// src/components/rayna/useSpeechHold.jsx
// Hook pentru voce cu buton ON/OFF (click start, click stop).
// Android/Chrome: Web Speech Recognition (GRATIS).
// iPhone/Safari: NU există SpeechRecognition → afișează mesaj clar (fără cod server aici).
//
// API păstrat + extins:
//   const { start, stop, toggle, isListening } = makeSpeechHold({
//     onResult: (text) => { ... },
//     onStartChange: (listening) => setSpeaking(listening),
//     lang: 'es-ES',
//     maxMs: 8000,   // opțional: hard-stop după 8s
//     debug: false,  // opțional: console logs
//   });
//
// Folosire pentru ON/OFF:  <button onClick={toggle}>{isListening() ? '■ Oprește' : '● Vorbește'}</button>

export function makeSpeechHold({
  onResult,          // (text: string) => void
  onStartChange,     // (listening: boolean) => void
  lang = 'es-ES',
  maxMs = 8000,
  debug = false,
} = {}) {
  // platform & API detection
  const isIOS =
    typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const SR =
    !isIOS &&
    typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  // session state
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
    return stream; // trebuie oprit ulterior
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
    // Dacă deja ascultă, nu mai porni încă o dată
    if (listening) return;

    // iOS / Safari: nu are SpeechRecognition → mesaj clar
    if (!SR) {
      setListening(true);
      setTimeout(() => setListening(false), 200);
      alert(
        'Pe acest iPhone/iPad nu există recunoaștere vocală în browser. Folosește tastatura sau Android/Chrome pentru voice.'
      );
      return;
    }

    try {
      // 1) Forțează promptul de microfon (uneori SR nu-l cere fără gUM)
      mediaStream = await ensureMicPermission();

      // 2) Configurează recunoașterea
      recognition = new SR();
      recognition.lang = lang;
      recognition.interimResults = true;   // poți afișa “interim” dacă vrei
      recognition.continuous = false;      // o singură propoziție
      recognition.maxAlternatives = 1;

      finalText = '';

      recognition.onstart = () => log('SR onstart');
      recognition.onaudiostart = () => log('SR onaudiostart');
      recognition.onsoundstart = () => log('SR onsoundstart');
      recognition.onspeechstart = () => log('SR onspeechstart');

      recognition.onresult = (ev) => {
        // Colectează DOAR segmentele finale
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const res = ev.results[i];
          if (res.isFinal) {
            finalText += res[0]?.transcript || '';
          }
        }
      };

      recognition.onerror = (ev) => {
        log('SR onerror', ev?.error || ev);
        // cele mai frecvente: 'no-speech', 'aborted', 'audio-capture', 'network'
      };

      recognition.onend = () => {
        log('SR onend');
        // Dacă SR se închide de la sine (pauză), ne asigurăm că finalizăm sesiunea
        stop();
      };

      // Un mic delay după gUM ajută unele device-uri Chrome
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
    // dacă nu ascultă, nu face nimic
    if (!listening && !recognition && !mediaStream) return;

    clearSafety();

    // 1) Oprește SR (Android)
    if (recognition) {
      try { recognition.stop(); } catch {}
      try {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
      } catch {}
      recognition = null;
    }

    // 2) Oprește microfonul
    try {
      mediaStream?.getTracks?.().forEach((t) => t.stop());
    } catch {}
    mediaStream = null;

    // 3) Livrează rezultat (Android SR)
    const spoken = (finalText || '').trim();
    finalText = '';

    const deliver = spoken || (fallbackText || '').trim();
    if (deliver) {
      try { onResult?.(deliver); } catch {}
    }

    setListening(false);
  }

  async function toggle() {
    if (listening) {
      stop({ fallbackText: '' });
    } else {
      await start();
    }
  }

  function isListening() {
    return !!listening;
  }

  // compat cu vechiul API (press-and-hold), dar acum le poți folosi pe post de on/off
  return { start, stop, toggle, isListening };
}
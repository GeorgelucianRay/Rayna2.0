// Hook pentru "ține apăsat • Speak" cu Web Speech API (Android/Chrome)
// + fallback elegant pentru iOS (unde SpeechRecognition nu este disponibil nativ)

export function makeSpeechHold({
  onResult,        // (text: string) => void
  onStartChange,   // (speaking: boolean) => void
  lang = 'es-ES',  // cod limbă: 'es-ES' | 'ro-RO' | 'ca-ES' | 'en-US' etc.
}) {
  let recognition = null;
  let mediaStream = null;
  let finalText = '';

  const SR =
    (typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition)) ||
    null;

  // mic util — promite/rezolvă permisiunea de microfon (și declanșează promptul)
  async function ensureMicPermission() {
    if (!navigator.mediaDevices?.getUserMedia) return null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return stream; // trebuie oprit ulterior
    } catch (e) {
      throw new Error('Permisiune microfon refuzată sau indisponibilă.');
    }
  }

  async function start() {
    // iOS / Safari: nu există SpeechRecognition → anunț clar și ieșire
    if (!SR) {
      // semnalăm UI-ului că "vorbim" (pornește butonul) doar o clipă, apoi oprim
      onStartChange?.(true);
      setTimeout(() => onStartChange?.(false), 250);

      // Poți înlocui cu un toast în UI:
      alert(
        'Pe acest dispozitiv nu există recunoaștere vocală în browser. Folosește tastatura sau Android/Chrome pentru voice.'
      );
      return;
    }

    try {
      // 1) forțăm promptul de permisiune microfon (uneori Chrome nu-l cere fără gUM)
      mediaStream = await ensureMicPermission();

      // 2) creăm recunoașterea
      recognition = new SR();
      recognition.lang = lang;
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      finalText = '';
      onStartChange?.(true);

      recognition.onresult = (ev) => {
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const res = ev.results[i];
          if (res.isFinal) {
            finalText += res[0]?.transcript || '';
          }
        }
      };

      recognition.onerror = (ev) => {
        // erori tipice: 'no-speech', 'aborted', 'audio-capture'
        // nu spamăm UI-ul; lăsăm stop() să facă fallback
        console.warn('[speech] onerror:', ev?.error);
      };

      recognition.onend = () => {
        // când se închide de la sine (pauză lungă etc.) îl considerăm stop
        stop({ fallbackText: '' });
      };

      recognition.start();
    } catch (e) {
      console.error('[speech] start error:', e);
      // fallback: anunț și ieșire
      onStartChange?.(false);
      alert('Nu pot porni recunoașterea vocală pe acest dispozitiv.');
    }
  }

  function cleanup() {
    try {
      if (recognition) {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        try { recognition.stop(); } catch {}
      }
    } catch {}
    recognition = null;

    try {
      if (mediaStream) {
        mediaStream.getTracks()?.forEach((t) => t.stop());
      }
    } catch {}
    mediaStream = null;
  }

  // stop({ fallbackText }) — cheamă la mouseup/touchend sau când vrei să închizi sesiunea
  function stop({ fallbackText = '' } = {}) {
    // Închidem imediat UI-ul de "speaking"
    onStartChange?.(false);

    // Oprim recognition + microfon
    try {
      if (recognition) {
        try { recognition.stop(); } catch {}
      }
    } catch {}
    try {
      if (mediaStream) {
        mediaStream.getTracks()?.forEach((t) => t.stop());
      }
    } catch {}
    recognition = null;
    mediaStream = null;

    const spoken = (finalText || '').trim();
    finalText = '';

    // dacă nu am rezultat audio, folosim fallback din input (ce ai în composer)
    const deliver = spoken || (fallbackText || '').trim();
    if (deliver) onResult?.(deliver);
  }

  return { start, stop };
}
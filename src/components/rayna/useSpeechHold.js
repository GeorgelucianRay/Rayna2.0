// Simplu: pe mousedown încearcă Web Speech API; pe mouseup/leave/blur finalizează.
// Dacă nu e suportat sau user a refuzat, folosește fallback: ia textul din input curent.

export function makeSpeechHold({
  onResult,         // (string) -> void
  onStartChange,    // (bool) -> void   (true când captează)
  lang = 'es-ES',   // poți schimba la 'ro-RO' / 'ca-ES' dinamic
}) {
  let recog = null;
  let listening = false;
  let transcript = '';

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  function start() {
    onStartChange?.(true);
    transcript = '';
    if (!SpeechRecognition) {
      // fără suport — lăsăm onResult să fie declanșat de caller cu fallback text
      return;
    }
    try {
      recog = new SpeechRecognition();
      recog.lang = lang;
      recog.interimResults = true;
      recog.continuous = true;
      listening = true;

      recog.onresult = (e) => {
        let t = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          t += e.results[i][0].transcript;
        }
        transcript = t;
      };
      recog.onerror = () => { /* lasă fallback la mouseup */ };
      recog.start();
    } catch {}
  }

  function stop({ fallbackText } = {}) {
    if (listening && recog) {
      try { recog.stop(); } catch {}
    }
    listening = false;
    onStartChange?.(false);

    const finalText = (transcript || '').trim() || (fallbackText || '').trim();
    if (finalText) onResult?.(finalText);
    transcript = '';
    recog = null;
  }

  return { start, stop };
}
// src/components/rayna/speakTTS.js
export function speakIfAllowed(text, lang = 'es-ES', force = false) {
  try {
    if (!('speechSynthesis' in window)) return;
    if (!force && /iPad|iPhone|iPod/.test(navigator.userAgent)) return; // să nu deranjeze pe iOS

    const utter = new SpeechSynthesisUtterance(String(text || ''));
    utter.lang = lang;
    utter.rate = 1;
    utter.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  } catch {}
}
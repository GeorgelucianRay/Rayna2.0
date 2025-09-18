// src/components/GpsPro/hooks/useWakeLockIOS.js
// iOS Safari nu are Wake Lock API. Truc: rulăm un video mic, mut, în buclă.
// Necesită o acțiune user (ex: click pe "Iniciar") — perfect pt. recorder.

export default function useWakeLockIOS() {
  let video;

  const enable = () => {
    try {
      if (video) return;
      video = document.createElement('video');
      // mic, mut, fără controls
      video.setAttribute('playsinline', '');
      video.muted = true;
      video.loop = true;
      video.width = 1;
      video.height = 1;
      video.style.position = 'fixed';
      video.style.opacity = '0';
      video.style.pointerEvents = 'none';
      video.style.bottom = '0';
      video.style.right = '0';

      // sursă „data:” de 1s tăcere; merge pe iOS
      video.src =
        'data:video/mp4;base64,AAAAIGZ0eXBtcDQyAAAAAG1wNDFtcDQyaXNvbWF2YzEAAAAIZnJlZQAAC2FtZm1wNDFpc28yYXZjMQAAAB9tb292AAAAbG12aGQAAAAA/////wAAAB9kdHJhawAAABx0a2hkAAAAAP////8AAAABAAAAAAAAG21kaWEAAAAgbWRoZAAAAAD/////AAAALGRpbmYAAAAUZHJlZgAAAAAAAAABAAAADHN0YmwAAABwc3RzZAAAAAAAAAABAAAAAA==';

      document.body.appendChild(video);
      const playPromise = video.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise.catch(() => {
          // uneori trebuie apelat încă o dată după o mică întârziere
          setTimeout(() => video.play().catch(()=>{}), 150);
        });
      }
    } catch (e) {
      // ignorăm
    }
  };

  const disable = () => {
    try {
      if (video) {
        video.pause();
        video.remove();
        video = null;
      }
    } catch (e) {}
  };

  return { enable, disable };
}
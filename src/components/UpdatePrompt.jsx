import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

// Componenta pentru afișarea butonului de actualizare
function UpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('Service Worker înregistrat:', r);
    },
    onRegisterError(error) {
      console.log('Eroare la înregistrarea Service Worker:', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  // Afișăm butonul doar dacă este necesară o actualizare
  if (needRefresh) {
    return (
      <div className="update-prompt-container">
        <span>Nueva actualización disponible.</span>
        <button className="update-prompt-button" onClick={() => updateServiceWorker(true)}>
          Actualizar
        </button>
        <button className="update-prompt-close" onClick={() => close()}>
          &#x2715;
        </button>
      </div>
    );
  }

  return null;
}

export default UpdatePrompt;
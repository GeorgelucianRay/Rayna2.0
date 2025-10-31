import React, { useMemo, useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html, Environment, ContactShadows } from '@react-three/drei';
import RaynaSkin, { RAYNA_MODEL_URL } from './RaynaSkin';
import { makeSpeechHold } from '../rayna/useSpeechHold'; // ⬅️ HOOK-ul actualizat (ON/OFF)
import styles from './RaynaLiveOverlay.module.css';

function CanvasFallback() {
  return (
    <Html center>
      <div className={styles.loadingWrap}>
        <div className={styles.loadingDot} />
        <div className={styles.loadingText}>Se încarcă Rayna…</div>
      </div>
    </Html>
  );
}

// ErrorBoundary rămâne ÎN AFARA Canvas-ului
class OverlayErrorBoundary extends React.Component {
  constructor(p){ super(p); this.state = { hasError:false, err:null }; }
  static getDerivedStateFromError(err){ return { hasError:true, err }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.errorWrap}>
          <div className={styles.errorTitle}>Nu pot încărca modelul Rayna</div>
          {this.state.err?.message && (
            <div className={styles.errorHint} style={{ whiteSpace:'pre-wrap', opacity:.9 }}>
              {String(this.state.err.message)}
            </div>
          )}
          <div className={styles.errorHint}>
            Verifică <code>/models/raynaskin.glb?v=10</code> – trebuie să se descarce.
          </div>
          <button className={styles.retryBtn} onClick={this.props.onClose}>Înapoi</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function RaynaLiveOverlay({
  open,
  onClose,
  onVoiceResult,          // ⬅️ NOU: primește textul recunoscut și îl trimiți în RaynaHub ca mesaj
  composerValueRef,       // (opțional) pentru fallback când nu recunoaște nimic
}) {
  if (!open) return null;

  const [listening, setListening] = useState(false);

  // ——— HOOK-ul ON/OFF pentru voce (Android: SR nativ; iPhone: doar mesaj informativ)
  const speech = useMemo(() => makeSpeechHold({
    lang: 'es-ES',
    maxMs: 8000,                          // safety stop după 8s
    onStartChange: setListening,          // aprinde/stinge starea de “ascult”
    onResult: (txt) => {                  // întoarce textul final
      const t = (txt || '').trim();
      if (!t) return;
      onVoiceResult?.(t);                 // ⇠ îl trimiți în fluxul RaynaHub
    },
    debug: false,
  }), [onVoiceResult]);

  // ——— click unic: ON/OFF
  const handleVoiceButton = async () => {
    if (speech.isListening()) {
      // OPRIRE: livrează și fallback dacă nu s-a recunoscut nimic
      speech.stop({ fallbackText: composerValueRef?.current?.value || '' });
    } else {
      // PORNIRE
      await speech.start();
    }
  };

  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

  const modelScale = 1.0;
  const modelPos = [0, 0, 0];

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <div className={styles.topBar}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">×</button>
      </div>

      <div className={styles.stage}>
        <OverlayErrorBoundary onClose={onClose}>
          <Canvas
            key={RAYNA_MODEL_URL}            // remount când schimbi ?v=
            dpr={[1, 2]}
            camera={{ position: [0, 1.5, 3.5], fov: 40 }}
            onCreated={({ camera }) => camera.lookAt(0, 1.0, 0)}
            style={{ width: '100%', height: '100%' }}
          >
            <ambientLight intensity={0.8} />
            <directionalLight position={[2.5, 5, 2]} intensity={1} />
            <Suspense fallback={<CanvasFallback />}>
              <group position={modelPos} scale={modelScale}>
                <RaynaSkin />
              </group>
              <Environment preset="city" />
              <ContactShadows position={[0, -0.01, 0]} opacity={0.35} blur={2.5} far={3} />
            </Suspense>
          </Canvas>
        </OverlayErrorBoundary>
      </div>

      {/* —— Butonul ON/OFF pus AICI, cum ai cerut —— */}
      <div className={styles.footer}>
        <button
          type="button"
          className={`${styles.speakBtn} ${listening ? styles.speaking : ''}`}
          onClick={handleVoiceButton}
          aria-pressed={listening}
          title={isIOS ? 'Apasă pentru a înregistra (iPhone – răspuns în scris)' : 'Apasă pentru a vorbi (Android)'}
        >
          {listening ? '■ Oprește' : '● Vorbește'}
        </button>
      </div>
    </div>
  );
}
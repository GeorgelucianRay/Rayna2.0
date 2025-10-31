import React, { useMemo, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html, Environment, ContactShadows } from '@react-three/drei';
import RaynaSkin, { RAYNA_MODEL_URL } from './RaynaSkin';
import styles from './RaynaLiveOverlay.module.css';

function CanvasFallback() {
  // HTML în Canvas trebuie învelit în <Html />, altfel apare eroarea R3F: Div...
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
  open, onClose, speaking, onHoldStart, onHoldEnd, composerValueRef
}) {
  if (!open) return null;

  const modelScale = 1.0;
  // Poziția neutră a modelului (Y=0)
  const modelPos = useMemo(() => [0, 0, 0], []); 

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
            // Camera mutată mai în spate (Z=3.5) pentru a cuprinde tot modelul
            camera={{ position: [0, 1.5, 3.5], fov: 40 }}
            // Camera se uită la centrul vizual al modelului (Y=1.0)
            onCreated={({ camera }) => camera.lookAt(0, 1.0, 0)}
            style={{ width: '100%', height: '100%' }}
          >
            <ambientLight intensity={0.8} />
            <directionalLight position={[2.5, 5, 2]} intensity={1} />
            <Suspense fallback={<CanvasFallback />}>
              {/* NUMAI noduri THREE în Canvas */}
              {/* CORECȚIE: S-a eliminat rotația de 180 de grade (Math.PI) 
                  pentru ca modelul să privească spre cameră (axa Z negativă) */}
              <group position={modelPos} scale={modelScale}> 
                <RaynaSkin />
              </group>
              <Environment preset="city" />
              {/* Umbrele de contact așezate la baza modelului (Y=0) */}
              <ContactShadows position={[0, -0.01, 0]} opacity={0.35} blur={2.5} far={3} />
            </Suspense>
          </Canvas>
        </OverlayErrorBoundary>
      </div>

      <div className={styles.footer}>
        <button
          className={`${styles.speakBtn} ${speaking ? styles.speaking : ''}`}
          onMouseDown={onHoldStart}
          onMouseUp={() => onHoldEnd({ fallbackText: composerValueRef?.current?.value || '' })}
          onMouseLeave={() => onHoldEnd({ fallbackText: composerValueRef?.current?.value || '' })}
          onTouchStart={(e) => { e.preventDefault(); onHoldStart(); }}
          onTouchEnd={(e) => { e.preventDefault(); onHoldEnd({ fallbackText: composerValueRef?.current?.value || '' }); }}
          aria-pressed={speaking}
          title="Ține apăsat pentru a vorbi"
        >
          {speaking ? 'Vorbește…' : 'Ține apăsat • Speak'}
        </button>
      </div>
    </div>
  );
}

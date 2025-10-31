import React, { useMemo, Suspense, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { Html, Environment, ContactShadows } from '@react-three/drei';
import RaynaSkin, { RAYNA_MODEL_URL } from './RaynaSkin';
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

// 👉 Potrivește camera la bounding box-ul modelului, orice aspect ratio.
function FitToModel({ targetRef, padding = 1.2 }) {
  const { camera, size } = useThree();
  React.useEffect(() => {
    const obj = targetRef.current;
    if (!obj) return;

    const box = new THREE.Box3().setFromObject(obj);
    const sizeV = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // distanța necesară ca să încapă pe înălțime/lățime
    const fov = (camera.fov * Math.PI) / 180;
    const aspect = size.width / size.height;

    const fitHeightDist = (sizeV.y / 2) / Math.tan(fov / 2);
    const fitWidthDist  = (sizeV.x / 2) / Math.tan(fov / 2) / aspect;
    const distance = Math.max(fitHeightDist, fitWidthDist) * padding;

    // ridicăm puțin ținta pe Y ca să vedem fața, nu creștetul
    const eyeYOffset = sizeV.y * 0.05;

    camera.position.set(center.x, center.y + eyeYOffset, distance);
    camera.near = Math.max(0.01, distance / 100);
    camera.far  = distance + Math.max(10, sizeV.z * 10);
    camera.lookAt(center.x, center.y + eyeYOffset, center.z);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height, targetRef]);

  return null;
}

// ErrorBoundary în afara Canvas-ului
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
            Verifică <code>/models/raynaskin.glb?v=11</code> – trebuie să se descarce.
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

  const modelRef = useRef(null);

  // îl orientăm spre cameră (față în față)
  const groupRotation = useMemo(() => [0, Math.PI, 0], []);

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <div className={styles.topBar}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">×</button>
      </div>

      <div className={styles.stage}>
        <OverlayErrorBoundary onClose={onClose}>
          <Canvas
            key={RAYNA_MODEL_URL}
            dpr={[1, 2]}
            camera={{ position: [0, 1.5, 2.5], fov: 40 }}  // inițial, va fi recalibrată imediat
            style={{ width: '100%', height: '100%' }}
            onCreated={({ camera }) => camera.lookAt(0, 1.4, 0)}
          >
            <ambientLight intensity={0.8} />
            <directionalLight position={[2.5, 5, 2]} intensity={1} />

            <Suspense fallback={<CanvasFallback />}>
              <group ref={modelRef} rotation={groupRotation}>
                <RaynaSkin />
              </group>

              {/* 🔥 acesta face magia de încadrate corectă */}
              <FitToModel targetRef={modelRef} padding={1.25} />

              <Environment preset="city" />
              <ContactShadows position={[0, -1.5, 0]} opacity={0.35} blur={2.5} far={3} />
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
import React, { useMemo, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, ContactShadows } from '@react-three/drei';
import RaynaSkin, { RAYNA_MODEL_URL } from './RaynaSkin';
import styles from './RaynaLiveOverlay.module.css';

function FallbackView() {
  return (
    <div className={styles.loadingWrap}>
      <div className={styles.loadingDot} />
      <div className={styles.loadingText}>Se încarcă Rayna…</div>
    </div>
  );
}

export default function RaynaLiveOverlay({
  open,
  onClose,
  speaking,
  onHoldStart,
  onHoldEnd,
  composerValueRef,
}) {
  if (!open) return null;

  const modelScale = 1.0;
  const modelPos   = useMemo(() => [0, -1.2, 0], []);

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <div className={styles.topBar}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">×</button>
      </div>

      <div className={styles.stage}>
        {/* key pe URL → dacă schimbăm ?v=, Canvas se remontează curat */}
        <Canvas
          key={RAYNA_MODEL_URL}
          dpr={[1, 2]}
          camera={{ position: [0, 1.55, 2.4], fov: 40 }}
          onCreated={({ camera }) => camera.lookAt(0, 1.45, 0)}
          style={{ width: '100%', height: '100%' }}
        >
          <ambientLight intensity={0.8} />
          <directionalLight position={[2.5, 5, 2]} intensity={1} />
          <Suspense fallback={<FallbackView />}>
            {/* întoarcem 180° pe Y ca să privească spre cameră */}
            <group position={modelPos} scale={modelScale} rotation={[0, Math.PI, 0]}>
              <RaynaSkin />
            </group>
            <Environment preset="city" />
            <ContactShadows position={[0, -1.5, 0]} opacity={0.35} blur={2.5} far={3} />
          </Suspense>
        </Canvas>
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
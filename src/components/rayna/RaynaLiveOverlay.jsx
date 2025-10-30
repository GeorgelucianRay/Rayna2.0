import React, { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls, ContactShadows } from '@react-three/drei';
import RaynaSkin from './RaynaSkin';
import styles from './RaynaLiveOverlay.module.css';

export default function RaynaLiveOverlay({
  open,
  onClose,
  speaking,          // bool: când ținem apăsat
  onHoldStart,       // () => void
  onHoldEnd,         // ({fallbackText}) => void
  composerValueRef,  // ref la inputul text din chat (fallback)
}) {
  if (!open) return null;

  const modelScale = 1.1;
  const modelPos   = useMemo(() => [0, -1.4, 0], []);

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <div className={styles.topBar}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">×</button>
      </div>

      <div className={styles.stage}>
        <Canvas dpr={[1, 2]} camera={{ position: [0.6, 1.6, 2.1], fov: 42 }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[3, 5, 2]} intensity={1} />
          <Suspense fallback={null}>
            <RaynaSkin position={modelPos} scale={modelScale} />
            <Environment preset="city" />
          </Suspense>
          <ContactShadows position={[0, -1.5, 0]} opacity={0.35} blur={2.5} far={3} />
          <OrbitControls enablePan={false} enableZoom={false} target={[0, 1.4, 0]} />
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
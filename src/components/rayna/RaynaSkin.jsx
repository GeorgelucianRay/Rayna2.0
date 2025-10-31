import React from 'react';
import { useGLTF } from '@react-three/drei';

// PASTRĂM PUBLIC PATH-UL. Doar folosim un query ca bust-cache.
// Crește v=… (ex. v=7→v=8) când faci un nou deploy.
export const RAYNA_MODEL_URL =
  (import.meta.env.BASE_URL || '/') + 'models/raynaskin.glb?v=7';

export default function RaynaSkin(props) {
  const { scene } = useGLTF(RAYNA_MODEL_URL);
  return <primitive object={scene} {...props} />;
}

useGLTF.preload(RAYNA_MODEL_URL);
import React from 'react';
import { useGLTF } from '@react-three/drei';

// public/models/raynaskin.glb  (același fișier), doar schimb v=5 ca să rupem cache-ul
export const RAYNA_MODEL_URL =
  (import.meta.env.BASE_URL || '/') + 'models/raynaskin.glb?v=5';

export default function RaynaSkin(props) {
  const { scene } = useGLTF(RAYNA_MODEL_URL);
  return <primitive object={scene} {...props} />;
}

useGLTF.preload(RAYNA_MODEL_URL);
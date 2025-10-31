import React from 'react';
import { useGLTF } from '@react-three/drei';

// păstrăm exact public path-ul care ți-a mers,
// doar creștem versiunea ca să rupem cache-ul PWA
const GLB_URL = (import.meta.env.BASE_URL || '/') + 'models/raynaskin.glb?v=4';

export default function RaynaSkin(props) {
  const { scene } = useGLTF(GLB_URL);
  return <primitive object={scene} {...props} />;
}

// forțează remount dacă schimbi versiunea (optional, dar util)
export const RAYNA_MODEL_URL = GLB_URL;

useGLTF.preload(GLB_URL);
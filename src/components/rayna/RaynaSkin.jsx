import React, { Suspense } from 'react';
import { useGLTF } from '@react-three/drei';

export default function RaynaSkin(props) {
  // dacă 404/eroare, drei aruncă — lăsăm ErrorBoundary-ul părinte să afişeze fallback
  const gltf = useGLTF('/models/raynaskin.glb');
  return <primitive object={gltf.scene} {...props} />;
}

useGLTF.preload('/models/raynaskin.glb');
import React, { Suspense } from 'react';
import { useGLTF } from '@react-three/drei';

export default function RaynaSkin(props) {
  const { scene } = useGLTF('/models/raynaskin.glb'); // public/models/raynaskin.glb
  return <primitive object={scene} {...props} />;
}

// preîncărcare ca să se încarce instant când deschizi overlay-ul
useGLTF.preload('/models/raynaskin.glb');
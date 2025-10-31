import React from 'react';
import { useGLTF } from '@react-three/drei';

// versiune cu bust-cache; poți crește v=… când actualizezi modelul
const GLB_URL = (import.meta.env.BASE_URL || '/') + 'models/raynaskin.glb?v=3';

export default function RaynaSkin(props) {
  const { scene } = useGLTF(GLB_URL);
  return <primitive object={scene} {...props} />;
}

useGLTF.preload(GLB_URL);
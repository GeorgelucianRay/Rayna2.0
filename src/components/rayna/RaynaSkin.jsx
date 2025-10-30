import React from 'react';
import { useGLTF } from '@react-three/drei';

const GLB_URL = (import.meta.env.BASE_URL || '/') + 'models/raynaskin.glb?v=1';

export default function RaynaSkin(props) {
  const { scene } = useGLTF(GLB_URL);
  return <primitive object={scene} {...props} />;
}

useGLTF.preload(GLB_URL);
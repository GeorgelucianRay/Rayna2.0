import React, { useEffect, useMemo, useState } from 'react';
import { GLTFLoader } from 'three-stdlib';

export const RAYNA_MODEL_URL =
  (typeof window !== 'undefined'
    ? `${window.location.origin}/models/raynaskin.glb?v=10`
    : '/models/raynaskin.glb?v=10'
  );

function isGlb(buf) {
  const u = new Uint8Array(buf.slice(0, 4));
  return u[0] === 0x67 && u[1] === 0x6c && u[2] === 0x54 && u[3] === 0x46;
}

async function fetchBuffer(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} la ${url}`);
  const buf = await res.arrayBuffer();
  if (!isGlb(buf)) throw new Error('Fișierul primit nu este GLB valid.');
  return buf;
}

export default function RaynaSkin(props) {
  const [scene, setScene] = useState(null);
  const [err, setErr] = useState(null);
  const loader = useMemo(() => new GLTFLoader(), []);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const buf = await fetchBuffer(RAYNA_MODEL_URL);
        if (dead) return;
        const gltf = await loader.parseAsync(buf, '/');
        if (!dead) setScene(gltf.scene);
      } catch (e) {
        console.error('[RaynaSkin] load error:', e);
        if (!dead) setErr(e);
      }
    })();
    return () => { dead = true; };
  }, [loader]);

  if (err) throw err;
  if (!scene) return null;

  // ✅ returnăm un obiect THREE, nu un element React/HTML
  return <primitive object={scene} {...props} />;
}
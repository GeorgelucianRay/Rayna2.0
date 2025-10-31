import React, { useEffect, useMemo, useState, forwardRef } from 'react';
import { GLTFLoader } from 'three-stdlib';

export const RAYNA_MODEL_URL =
  (typeof window !== 'undefined'
    ? `${window.location.origin}/models/raynaskin.glb?v=11`
    : '/models/raynaskin.glb?v=11'
  );

function isGlb(buf) {
  const u = new Uint8Array(buf.slice(0, 4));
  return u[0] === 0x67 && u[1] === 0x6c && u[2] === 0x54 && u[3] === 0x46; // 'glTF'
}
async function fetchBuffer(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} la ${url}`);
  const buf = await res.arrayBuffer();
  if (!isGlb(buf)) throw new Error('Fișierul primit nu este GLB valid.');
  return buf;
}

const RaynaSkin = forwardRef(function RaynaSkin(props, ref) {
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

  return (
    <group ref={ref} {...props}>
      <primitive object={scene} />
    </group>
  );
});

export default RaynaSkin;
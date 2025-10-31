import React, { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';
import { useFrame } from '@react-three/fiber';

// URL ABSOLUT ca să nu depindem de base; crește v când redeployezi
export const RAYNA_MODEL_URL =
  (typeof window !== 'undefined'
    ? `${window.location.origin}/models/raynaskin.glb?v=8`
    : '/models/raynaskin.glb?v=8'
  );

function isGlbSignature(buf) {
  const u8 = new Uint8Array(buf.slice(0, 4));
  // 'glTF' = 0x67 0x6c 0x54 0x46
  return u8[0] === 0x67 && u8[1] === 0x6c && u8[2] === 0x54 && u8[3] === 0x46;
}

async function fetchGlbArrayBuffer(url) {
  const res = await fetch(url, { cache: 'no-store', redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status} la ${url}`);
  const buf = await res.arrayBuffer();
  if (!isGlbSignature(buf)) throw new Error(`Nu e GLB (probabil app-shell în loc de fișier): ${url}`);
  return buf;
}

export default function RaynaSkin(props) {
  const [gltf, setGltf] = useState(null);
  const [err, setErr] = useState(null);

  // instanțiem o singură dată loaderul
  const loader = useMemo(() => new GLTFLoader(), []);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const buf = await fetchGlbArrayBuffer(RAYNA_MODEL_URL);
        if (dead) return;
        const parsed = await new Promise((resolve, reject) => {
          loader.parse(
            buf,                       // ArrayBuffer
            '/',                       // base path (nu e folosit la GLB)
            (g) => resolve(g),
            (e) => reject(e)
          );
        });
        if (!dead) setGltf(parsed);
      } catch (e) {
        console.error('[RaynaSkin] load error:', e);
        if (!dead) setErr(e);
      }
    })();
    return () => { dead = true; };
  }, [loader]);

  if (err) throw err;
  if (!gltf) return null;

  // mic „idle” foarte fin, ca să nu pară complet static
  const ref = React.useRef();
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y = Math.PI; // ține mereu fața spre cameră
  });

  return <primitive ref={ref} object={gltf.scene} {...props} />;
}
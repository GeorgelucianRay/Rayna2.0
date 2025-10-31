import React, { useEffect, useMemo, useState } from 'react';
import { GLTFLoader } from 'three-stdlib';

// URL absolut (nu mai depindem de base). Crește v=… la nevoie.
export const RAYNA_MODEL_URL =
  (typeof window !== 'undefined'
    ? `${window.location.origin}/models/raynaskin.glb?v=9`
    : '/models/raynaskin.glb?v=9'
  );

function isGlb(buf) {
  const u = new Uint8Array(buf.slice(0, 4));
  // 'glTF' = 0x67 0x6c 0x54 0x46
  return u[0] === 0x67 && u[1] === 0x6c && u[2] === 0x54 && u[3] === 0x46;
}

async function fetchArrayBuffer(url) {
  const res = await fetch(url, { cache: 'no-store', redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status} la ${url}`);
  const buf = await res.arrayBuffer();
  if (!isGlb(buf)) throw new Error('Răspunsul nu e GLB (probabil app-shell HTML din cache SW).');
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
        // 1) Prefetch binar (bypass cache SW)
        const buf = await fetchArrayBuffer(RAYNA_MODEL_URL);
        if (dead) return;

        // 2) Încearcă parse în memorie
        try {
          const gltf = await loader.parseAsync(buf, '/');
          if (dead) return;
          setScene(gltf.scene);
          return;
        } catch (e1) {
          // 3) Fallback pe blob:ObjectURL (mai “clasic”, stabil pe Safari)
          const blob = new Blob([buf], { type: 'model/gltf-binary' });
          const url = URL.createObjectURL(blob);
          try {
            const gltf = await loader.loadAsync(url);
            if (!dead) setScene(gltf.scene);
          } catch (e2) {
            throw new Error(`Parse eșuat (memorie și blob). Detalii: ${e1?.message || e1} / ${e2?.message || e2}`);
          } finally {
            URL.revokeObjectURL(url);
          }
        }
      } catch (e) {
        console.error('[RaynaSkin] Eroare încărcare:', e);
        if (!dead) setErr(e);
      }
    })();
    return () => { dead = true; };
  }, [loader]);

  if (err) throw err;
  if (!scene) return null;

  return <primitive object={scene} {...props} />;
}
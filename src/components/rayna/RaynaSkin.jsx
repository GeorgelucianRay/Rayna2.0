import React, { useEffect, useState } from 'react';
import { useGLTF } from '@react-three/drei';

// Baza corectă pentru Vite, indiferent de subpath
const BASE = (import.meta.env.BASE_URL || '/');
const RAW_URL = BASE + 'models/raynaskin.glb';

/**
 * Verifică faptul că un URL răspunde cu GLB real (semnătura "glTF").
 * Întoarce URL-ul valid sau aruncă o eroare cu detalii.
 */
async function assertGlb(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) {
    throw new Error(`HTTP ${r.status} la ${url}`);
  }
  const ct = r.headers.get('content-type') || '';
  // Unele hosturi nu setează model/gltf-binary — nu ne bazăm doar pe content-type
  const buf = await r.arrayBuffer();
  const sig = new Uint8Array(buf.slice(0, 4)); // 0x67 0x6c 0x54 0x46 => "glTF"
  const isGlb = sig[0] === 0x67 && sig[1] === 0x6c && sig[2] === 0x54 && sig[3] === 0x46;
  if (!isGlb) {
    throw new Error(`Nu e GLB (content-type: ${ct || 'n/a'}) la ${url}`);
  }
  return url;
}

export default function RaynaSkin(props) {
  const [validUrl, setValidUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // încercare 1: cu bust-cache versionat
        const u1 = `${RAW_URL}?v=3`;
        const ok1 = await assertGlb(u1).catch(() => null);

        if (ok1 && !cancelled) {
          setValidUrl(u1);
          return;
        }
        // încercare 2: fără query
        const u2 = RAW_URL;
        const ok2 = await assertGlb(u2);

        if (!cancelled) setValidUrl(u2);
      } catch (e) {
        if (!cancelled) setError(e);
        // expune motivul exact în consolă pentru debug
        // (pe device: Safari → Advanced → Web Inspector)
        console.error('[RaynaSkin] GLB preflight failed:', e);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // dacă preflight a eșuat, lăsăm părintelui (ErrorBoundary) decizia
  if (error) throw error;
  if (!validUrl) return null;

  // încarcăm acum GLB-ul confirmat
  const { scene } = useGLTF(validUrl);
  return <primitive object={scene} {...props} />;
}
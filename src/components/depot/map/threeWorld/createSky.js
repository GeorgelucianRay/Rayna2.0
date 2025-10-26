// src/.../threeWorld/createSky.js
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

// Folosește un HDR equirectangular ca background + environment.
// Întoarce un Group (ca înainte), dar încărcarea HDR e async.
export default function createSky({
  scene,
  hdrPath = '/textures/lume/golden_gate_hills_1k.hdr',
  // opționale:
  exposure = 1.0,
  toneMapping = THREE.ACESFilmicToneMapping,
  addLights = true,
} = {}) {
  const g = new THREE.Group();

  // lumini “de sprijin” (opțional)
  if (addLights) {
    const sun = new THREE.DirectionalLight(0xffffff, 0.6);
    sun.position.set(80, 120, 40);
    g.add(sun);
    const hemi = new THREE.HemisphereLight(0xffffff, 0xcad2e1, 0.35);
    g.add(hemi);
  }

  if (!scene) return g;

  // HDRI ca background/environment
  const pmrem = new THREE.PMREMGenerator(scene.renderer ?? null);
  // dacă nu ai renderer pe scene, îl luăm ulterior din window.__THREE_RENDERER (vezi mai jos)

  const applyHDR = (hdrTex) => {
    hdrTex.mapping = THREE.EquirectangularReflectionMapping;

    // tone mapping & exposure (prin renderer)
    const renderer =
      scene.renderer ||
      window.__THREE_RENDERER; // (îl setăm în MapPage imediat)
    if (renderer) {
      renderer.toneMapping = toneMapping;
      renderer.toneMappingExposure = exposure;
    }

    // background + environment
    scene.background = hdrTex;
    scene.environment = hdrTex;
  };

  new RGBELoader()
    .setPath('') // folosim cale absolută
    .load(
      hdrPath,
      (hdrTex) => applyHDR(hdrTex),
      undefined,
      (err) => {
        console.warn('HDR load failed, păstrez cerul simplu:', err);
      }
    );

  return g;
}
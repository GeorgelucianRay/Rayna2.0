import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

export default function createSky({
  scene,
  renderer,
  hdrPath = '/textures/lume/golden_gate_hills_1k.hdr',
  exposure = 1.0,
  toneMapping = THREE.ACESFilmicToneMapping,
  addLights = true,
} = {}) {
  const g = new THREE.Group();

  if (addLights) {
    const sun = new THREE.DirectionalLight(0xffffff, 0.6);
    sun.position.set(80, 120, 40);
    g.add(sun);
    const hemi = new THREE.HemisphereLight(0xffffff, 0xcad2e1, 0.35);
    g.add(hemi);
  }

  // IMPORTANT: avem atât scene cât și renderer
  if (!scene || !renderer) return g;

  new RGBELoader().load(
    hdrPath,
    (hdrTex) => {
      hdrTex.mapping = THREE.EquirectangularReflectionMapping;
      renderer.toneMapping = toneMapping;
      renderer.toneMappingExposure = exposure;
      scene.background = hdrTex;   // cer panoramic
      scene.environment = hdrTex;  // iluminare PBR
    },
    undefined,
    (err) => console.warn('HDR load failed:', err)
  );

  return g;
}
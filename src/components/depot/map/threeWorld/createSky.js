import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

export default function createSky({
  radius = 320,
  texturePath = '/textures/lume/golden_gate_hills_1k.hdr'
} = {}) {
  const g = new THREE.Group();

  // === Încărcăm HDRI panoramic ===
  new RGBELoader()
    .load(texturePath, (hdrTexture) => {
      hdrTexture.mapping = THREE.EquirectangularReflectionMapping;

      // Aplicăm HDRI-ul ca fundal și iluminare
      g.userData.hdri = hdrTexture;
      g.traverse((obj) => {
        if (obj.isScene) {
          obj.background = hdrTexture;
          obj.environment = hdrTexture;
        }
      });
    });

  // === Sferă fallback (vizibilă temporar cât se încarcă HDRI) ===
  const placeholderGeo = new THREE.SphereGeometry(radius, 64, 48);
  const placeholderMat = new THREE.MeshBasicMaterial({
    color: 0x87ceeb, // cer senin
    side: THREE.BackSide,
    depthWrite: false
  });
  const placeholderSky = new THREE.Mesh(placeholderGeo, placeholderMat);
  placeholderSky.renderOrder = -1000;
  g.add(placeholderSky);

  // === Lumini suplimentare ===
  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.position.set(80, 120, 40);
  g.add(sun);

  const hemi = new THREE.HemisphereLight(0xffffff, 0xcad2e1, 0.6);
  g.add(hemi);

  return g;
}
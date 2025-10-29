import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
let cachedGeo = null;
let cachedMat = null;
let loadError = false;

// Încarcă o singură dată geometriile/materialele din GLB
function ensureGrassAsset(onReady) {
  if (cachedGeo && cachedMat) { onReady(); return; }
  if (loadError) { onReady(); return; }

  loader.load(
    '/models/detailed_grass_-_by_lemstrx.glb',   // ✅ calea corectă
    (gltf) => {
      let mesh = null;
      gltf.scene.traverse((o) => { if (!mesh && o.isMesh) mesh = o; });
      if (!mesh) { loadError = true; onReady(); return; }

      cachedGeo = mesh.geometry;
      cachedMat = mesh.material.clone();
      cachedMat.side = THREE.DoubleSide;
      cachedMat.transparent = !!cachedMat.alphaMap || !!cachedMat.transparent;
      cachedMat.depthWrite = true;

      onReady();
    },
    undefined,
    () => { loadError = true; onReady(); }
  );
}
// src/components/depot/map/world/prefabs/Tree.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

const LOADER = new GLTFLoader();
let TEMPLATE = null;

function loadOnce() {
  if (TEMPLATE) return Promise.resolve(TEMPLATE);
  return new Promise((resolve, reject) => {
    LOADER.load('/models/trees/maple_tree.glb', (gltf) => {
      TEMPLATE = gltf.scene || gltf.scenes?.[0];
      resolve(TEMPLATE);
    }, undefined, reject);
  });
}

/**
 * Creează un copac GLB, scalat automat la înălțimea dorită.
 * @param {object} o
 * @param {number} o.targetHeight  Înălțime țintă în metri (default 4)
 * @param {number} o.y             Offset pe verticală (default 0)
 */
export function makeTree({ targetHeight = 4, y = 0 } = {}) {
  const group = new THREE.Group();

  // placeholder mic până încarcă modelul
  const stump = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 0.5, 6),
    new THREE.MeshStandardMaterial({ color: 0x7a5a2a, roughness: 1 })
  );
  stump.position.y = 0.25;
  group.add(stump);

  loadOnce().then((tpl) => {
    const model = cloneSkeleton(tpl);

    model.traverse((c) => {
  if (!c.isMesh) return;
  c.castShadow = true;
  c.receiveShadow = true;

  if (c.material && ('map' in c.material)) {
    const m = c.material;
    m.transparent = true;
    m.alphaTest = 0.5;
    m.depthWrite = true;
    m.side = THREE.DoubleSide;

    // 🔽 întunecăm puțin culoarea
    m.color = new THREE.Color(0.8, 0.8, 0.8); // 80% din intensitatea originală
    // (sau încearcă: new THREE.Color(0.7, 0.75, 0.7) pentru ton mai “verde natural”)
    
    // opțional – mai mat (reduce reflexia)
    if ('roughness' in m) m.roughness = 1.0;
    if ('metalness' in m) m.metalness = 0.0;
  }
});

    // centrează pe sol și scalează la targetHeight
    const box = new THREE.Box3().setFromObject(model);
    const height = Math.max(0.001, box.max.y - box.min.y);
    const scale = targetHeight / height;

    model.scale.setScalar(scale);

    // recalculează și așază baza pe y=0+y
    const box2 = new THREE.Box3().setFromObject(model);
    const dy = box2.min.y;
    model.position.y = (model.position.y || 0) - dy + y;

    // curăță placeholderul și adaugă modelul
    group.clear();
    group.add(model);
  }).catch((err) => {
    console.error('[makeTree] GLB load failed:', err);
  });

  return group;
}
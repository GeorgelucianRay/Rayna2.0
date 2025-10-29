// src/components/depot/map/world/prefabs/Tree.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

const LOADER = new GLTFLoader();
let TEMPLATE = null; // cache: încărcăm o singură dată glb-ul

function loadOnce() {
  if (TEMPLATE) return Promise.resolve(TEMPLATE);
  return new Promise((resolve, reject) => {
    LOADER.load(
      '/models/trees/maple_tree.glb',
      (gltf) => {
        TEMPLATE = gltf.scene;
        resolve(TEMPLATE);
      },
      undefined,
      reject
    );
  });
}

/**
 * Creează un copac pe baza modelului maple_tree.glb.
 * Păstrăm numele/exportul `makeTree` ca să nu schimbi nimic în propRegistry.
 */
export function makeTree({ scale = 1, y = 0 } = {}) {
  const group = new THREE.Group();

  // opțional: placeholder mic până se încarcă modelul
  const stump = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.12, 0.6, 6),
    new THREE.MeshStandardMaterial({ color: 0x7a5a2a, roughness: 1 })
  );
  stump.position.y = 0.3;
  group.add(stump);

  loadOnce().then((tpl) => {
    // clonăm ca să putem instanția de mai multe ori fără a reîncărca
    const model = cloneSkeleton(tpl);
    model.scale.set(scale, scale, scale);
    model.position.y = y;

    model.traverse((c) => {
      if (c.isMesh) {
        c.castShadow = true;
        c.receiveShadow = true;
        // pentru performanță pe mobil
        c.frustumCulled = true;
      }
    });

    // scoatem placeholderul
    group.clear();
    group.add(model);

    // opțional: centrează la sol după bounding box
    const box = new THREE.Box3().setFromObject(model);
    const h = box.max.y - box.min.y;
    if (h > 0) {
      const dy = box.min.y; // aduce baza pe Y=0 + y
      model.position.y = (model.position.y || 0) - dy + y;
    }
  }).catch((err) => {
    console.error('[makeTree] GLB load failed:', err);
  });

  return group;
}
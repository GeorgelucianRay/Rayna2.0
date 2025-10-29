// src/components/depot/map/world/prefabs/GrassPatch.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

const loader = new GLTFLoader();
let template = null;

function loadGrass() {
  if (template) return Promise.resolve(template);
  return new Promise((resolve, reject) => {
    loader.load('/models/detailed_grass_-_by_lemstrx.glb', (gltf) => {
      template = gltf.scene || gltf.scenes?.[0];
      resolve(template);
    }, undefined, reject);
  });
}

export function makeGrassPatch({ count = 50, spread = 5 } = {}) {
  const group = new THREE.Group();
  loadGrass().then((tpl) => {
    const mesh = tpl.getObjectByProperty('isMesh', true);
    if (!mesh) return;

    const inst = new THREE.InstancedMesh(mesh.geometry, mesh.material, count);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * spread;
      const z = (Math.random() - 0.5) * spread;
      const s = 0.8 + Math.random() * 0.4;
      dummy.position.set(x, 0, z);
      dummy.scale.set(s, s, s);
      dummy.rotation.y = Math.random() * Math.PI * 2;
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    }

    inst.instanceMatrix.needsUpdate = true;
    inst.castShadow = true;
    inst.receiveShadow = true;

    group.add(inst);
  });

  return group;
}
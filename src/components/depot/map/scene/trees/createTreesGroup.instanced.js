// src/components/depot/map/scene/trees/createTreesGroup.instanced.js
// ASCII quotes only
import * as THREE from "three";
import { TREE_PROPS } from "./treeLayout";
import { loadTreeTemplateForInstancing } from "../../world/prefabs/TreeInstancing";

// Creeaza un grup cu InstancedMesh-uri (mult mai rapid decat clone per copac)
export async function createTreesGroupInstanced({
  targetHeight = 4,
  name = "trees.instanced",
  yDefault = 0.05,
} = {}) {
  const g = new THREE.Group();
  g.name = name;

  // 1) Load template meshes (o singura data)
  const template = await loadTreeTemplateForInstancing({ targetHeight });

  // template.parts = [{ geometry, material }]
  const count = TREE_PROPS.length;

  // 2) Creeaza InstancedMesh pt fiecare part
  const instanced = template.parts.map((part, partIndex) => {
    const im = new THREE.InstancedMesh(part.geometry, part.material, count);
    im.name = "treePart_" + partIndex;
    im.castShadow = false;
    im.receiveShadow = false;
    im.frustumCulled = true;
    return im;
  });

  // 3) Set matrix per instanta (toate part-urile primesc aceeasi matrice)
  const tmpObj = new THREE.Object3D();

  for (let i = 0; i < count; i++) {
  const p = TREE_PROPS[i];

  tmpObj.position.set(
    p.x ?? 0,
    (template.yOffset ?? 0) + (p.y ?? yDefault),
    p.z ?? 0
  );

  tmpObj.rotation.set(0, p.rotY ?? 0, 0);

  // IMPORTANT: scale la inaltimea ceruta
  tmpObj.scale.setScalar(template.scale ?? 1);

  tmpObj.updateMatrix();

  for (let k = 0; k < instanced.length; k++) {
    instanced[k].setMatrixAt(i, tmpObj.matrix);
  }
}

  for (let k = 0; k < instanced.length; k++) {
    instanced[k].instanceMatrix.needsUpdate = true;
    g.add(instanced[k]);
  }

  return g;
}
// ASCII quotes only
import * as THREE from "three";
import { makeTree } from "../../world/prefabs/Tree";
import { TREE_PROPS } from "./treeLayout";

// IMPORTANT:
// - makeTree este async intern (incarca GLB o singura data, apoi clone)
// - aici doar cream group + plasam instantele
export function createTreesGroup({
  targetHeight = 4,
  name = "trees.static",
} = {}) {
  const g = new THREE.Group();
  g.name = name;

  // Optimizare: group statica
  g.matrixAutoUpdate = false;

  for (let i = 0; i < TREE_PROPS.length; i++) {
    const p = TREE_PROPS[i];

    const t = makeTree({ targetHeight, y: p.y || 0.05 });
    t.position.set(p.x || 0, 0, p.z || 0);

    if (p.rotY) t.rotation.y = p.rotY;

    // Mic offset aleator optional (daca vrei realism) - lasat OFF by default
    // t.rotation.y += (Math.random() - 0.5) * 0.2;

    g.add(t);
  }

  // Dupa ce am setat pozitii/rotatii, "bake"
  g.updateMatrix();
  g.matrixAutoUpdate = false;

  return g;
}
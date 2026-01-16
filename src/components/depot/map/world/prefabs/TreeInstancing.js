// src/components/depot/map/world/prefabs/TreeInstancing.js
// ASCII quotes only
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const LOADER = new GLTFLoader();

let CACHE = null;
// CACHE = { parts: [{ geometry, material }], height, minY }

function optimizeMaterial(mat) {
  if (!mat) return mat;
  // Foarte important pt performanta: fara transparent real, doar alphaTest
  if ("transparent" in mat) mat.transparent = false;
  if ("alphaTest" in mat) mat.alphaTest = 0.5;
  if ("side" in mat) mat.side = THREE.FrontSide;

  if ("roughness" in mat) mat.roughness = 1.0;
  if ("metalness" in mat) mat.metalness = 0.0;

  // Optional: reduce anisotropy (mobil)
  if (mat.map) mat.map.anisotropy = 1;

  return mat;
}

async function loadRawOnce() {
  if (CACHE) return CACHE;

  const gltf = await new Promise((resolve, reject) => {
    LOADER.load("/models/trees/maple_tree.glb", resolve, undefined, reject);
  });

  const root = gltf.scene || gltf.scenes?.[0];
  if (!root) throw new Error("GLB has no scene");

  // Important: facem un template si ii calculam bbox o singura data
  const template = root.clone(true);

  // Bounding box global
  const box = new THREE.Box3().setFromObject(template);
  const height = Math.max(0.001, box.max.y - box.min.y);
  const minY = box.min.y;

  // Extragem doar mesh-uri statice (fara skinned). Daca ai skinned, trebuie alt pipeline.
  const parts = [];
  template.traverse((o) => {
    if (!o.isMesh) return;

    o.castShadow = false;
    o.receiveShadow = false;

    // Clonam geometria si materialul o singura data pt instancing
    const geo = o.geometry;
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;

    const material = optimizeMaterial(mat.clone ? mat.clone() : mat);

    // IMPORTANT: daca geometry nu e indexed, las-o; instancing functioneaza si asa
    // Optional: geo.computeVertexNormals() (NU recomand la runtime)
    parts.push({ geometry: geo, material });
  });

  if (!parts.length) throw new Error("Tree template has no mesh parts");

  CACHE = { parts, height, minY };
  return CACHE;
}

/**
 * Returneaza template pt instancing, scalat la targetHeight.
 * Observatie: NU scalăm geometria (cost) — scale-ul îl facem prin matrice instanta.
 * Ca sa nu recalculam, returnam scaleFactor si yOffset.
 */
export async function loadTreeTemplateForInstancing({ targetHeight = 4 } = {}) {
  const raw = await loadRawOnce();
  const scale = targetHeight / raw.height;

  // yOffset: ridicam ca baza sa stea pe sol
  // (daca minY e negativ, trebuie compensat)
  const yOffset = -raw.minY * scale + 0.05;

  return {
    parts: raw.parts,
    scale,
    yOffset,
  };
}
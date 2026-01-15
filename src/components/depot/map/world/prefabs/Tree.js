// src/components/depot/map/world/prefabs/Tree.js
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

const LOADER = new GLTFLoader();

// Cache “template” + metadate (o singură dată)
let CACHE = null; // { scene, height, minY, hasSkinned }

function isSkinnedScene(root) {
  let skinned = false;
  root.traverse((o) => {
    if (o.isSkinnedMesh) skinned = true;
  });
  return skinned;
}

function optimizeMaterialsOnce(root) {
  root.traverse((c) => {
    if (!c.isMesh) return;

    // IMPORTANT: pe mobil, shadows sunt cost foarte mare
    c.castShadow = false;
    c.receiveShadow = false;

    const m = c.material;
    if (!m) return;

    // Dacă materialul are alpha map (frunze), NU folosi transparent=true (overdraw mare).
    // Mai bine alphaTest + transparent=false (mult mai rapid).
    if ("map" in m) {
      // păstrează textura, doar “întunecă” ușor culoarea (global)
      if (m.color) m.color = new THREE.Color(0.8, 0.8, 0.8);

      // performanță: evită transparent
      m.transparent = false;
      m.alphaTest = 0.5;

      // performance: DoubleSide dublează shading-ul; evită dacă nu e obligatoriu
      // Dacă vezi “dispariții” la frunze, poți reveni la DoubleSide,
      // dar costă. Încearcă întâi FrontSide:
      m.side = THREE.FrontSide;

      // “mat” = mai ieftin și mai natural
      if ("roughness" in m) m.roughness = 1.0;
      if ("metalness" in m) m.metalness = 0.0;

      // depthWrite true e ok cu alphaTest; cu transparent ar fi problematic
      m.depthWrite = true;
    }

    // Bonus: pe obiecte statice, frustum culling trebuie să rămână ON
    c.frustumCulled = true;
  });
}

async function loadOnce() {
  if (CACHE) return CACHE;

  const gltf = await new Promise((resolve, reject) => {
    LOADER.load("/models/trees/maple_tree.glb", resolve, undefined, reject);
  });

  const scene = gltf.scene || gltf.scenes?.[0];
  if (!scene) throw new Error("GLB has no scene");

  // Clone template o dată ca să nu modifici originalul loader-ului
  const template = scene.clone(true);

  // Optimizări aplicate o singură dată (se moștenesc în clone)
  optimizeMaterialsOnce(template);

  // Pre-calculează bounding box o singură dată
  const box = new THREE.Box3().setFromObject(template);
  const height = Math.max(0.001, box.max.y - box.min.y);
  const minY = box.min.y;

  const hasSkinned = isSkinnedScene(template);

  CACHE = { scene: template, height, minY, hasSkinned };
  return CACHE;
}

/**
 * Creează un copac GLB, scalat automat la înălțimea dorită.
 * - Foarte optimizat: fără Box3 per instanță, fără transparent, fără shadows
 */
export function makeTree({ targetHeight = 4, y = 0 } = {}) {
  const group = new THREE.Group();

  // Placeholder foarte ieftin
  const stump = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 0.5, 6),
    new THREE.MeshStandardMaterial({ color: 0x7a5a2a, roughness: 1 })
  );
  stump.position.y = 0.25 + y;
  stump.castShadow = false;
  stump.receiveShadow = false;
  group.add(stump);

  loadOnce()
    .then(({ scene, height, minY, hasSkinned }) => {
      // Dacă nu e skinned/animated, clone simplu e mult mai ieftin decât SkeletonUtils
      const model = hasSkinned ? cloneSkeleton(scene) : scene.clone(true);

      // Scale rapid (fără Box3)
      const scale = targetHeight / height;
      model.scale.setScalar(scale);

      // Așază baza pe sol: minY * scale
      // (minY e de obicei negativ dacă modelul “intră” în pământ)
      model.position.y = y - minY * scale + 0.05;

      // Înlocuiește placeholder
      group.clear();
      group.add(model);
    })
    .catch((err) => {
      console.error("[makeTree] GLB load failed:", err);
    });

  return group;
}
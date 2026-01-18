// src/components/depot/map/scene/trees/createTreesBillboardGroup.js
// ASCII quotes only
import * as THREE from "three";
import { TREE_PROPS } from "./treeLayout";

let TEX_CACHE = null;

async function loadTreeTexture(url) {
  if (TEX_CACHE) return TEX_CACHE;

  const loader = new THREE.TextureLoader();
  const tex = await new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  });

  // Corect pentru culori (daca PNG-ul e sRGB)
  tex.colorSpace = THREE.SRGBColorSpace;

  // Performanta: nu vrei texturi imense + mipmaps grele
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;

  // Evita repetari accidental
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;

  TEX_CACHE = tex;
  return tex;
}

/**
 * Creeaza copaci tip "billboard" (doua plane-uri in cruce) - foarte rapid.
 * - doua plane-uri per copac => arata ok din mai multe unghiuri
 * - alphaTest (NU transparent blending) => mult mai rapid pe mobil
 */
export async function createTreesBillboardGroup({
  name = "trees.billboard",
  url = "/textures/trees/tree_cutout.png", // pune aici PNG-ul tau
  width = 4,   // latime copac
  height = 6,  // inaltime copac
  yDefault = 0.05,
  alphaTest = 0.5,
  flipY = false, // daca PNG-ul vine invers
} = {}) {
  const g = new THREE.Group();
  g.name = name;

  const tex = await loadTreeTexture(url);
  if (flipY) tex.flipY = true;

  // Material: alphaTest (nu transparent) => mare boost de performanta
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: false,
    alphaTest,
    side: THREE.DoubleSide,
    depthWrite: true,
  });

  // Geometrie comuna (reutilizata)
  const geo = new THREE.PlaneGeometry(width, height);

  // Un Object3D temporar pt transform
  const base = new THREE.Object3D();

  for (let i = 0; i < TREE_PROPS.length; i++) {
    const p = TREE_PROPS[i];

    const tree = new THREE.Group();
    tree.name = "tree_" + i;

    const y = (p.y ?? yDefault) + height * 0.5; // ridicam plane-ul sa stea pe sol

    tree.position.set(p.x ?? 0, y, p.z ?? 0);

    // Rotatia ta (optional)
    const ry = p.rotY ?? 0;
    tree.rotation.y = ry;

    // 2 plane-uri in cruce (90 deg)
    const m1 = new THREE.Mesh(geo, mat);
    const m2 = new THREE.Mesh(geo, mat);
    m2.rotation.y = Math.PI / 2;

    // fara umbre, fara update inutil
    m1.castShadow = false;
    m1.receiveShadow = false;
    m2.castShadow = false;
    m2.receiveShadow = false;

    tree.add(m1, m2);

    // Frustum culling ON
    tree.traverse((o) => {
      if (o.isMesh) o.frustumCulled = true;
    });

    g.add(tree);
  }

  return g;
}

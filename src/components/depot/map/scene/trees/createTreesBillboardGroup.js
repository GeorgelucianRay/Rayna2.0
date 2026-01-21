import * as THREE from "three";
import { TREE_PROPS } from "./treeLayout";

let TEX_CACHE = null;

async function loadTreeTexture(url) {
  if (TEX_CACHE) return TEX_CACHE;
  const loader = new THREE.TextureLoader();
  const tex = await new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  });
  tex.colorSpace = THREE.SRGBColorSpace;
  TEX_CACHE = tex;
  return tex;
}

export async function createTreesBillboardGroup({
  url = "/textures/trees/tree_cutout.png",
  width = 4,
  height = 6,
  alphaTest = 0.5,
} = {}) {
  const tex = await loadTreeTexture(url);

  // 1. Geometrie simpla (un singur plan)
  const geo = new THREE.PlaneGeometry(width, height);
  geo.translate(0, height / 2, 0); // Aliniem baza la sol

  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    alphaTest: alphaTest,
    side: THREE.DoubleSide,
    depthWrite: true,
  });

  // 2. InstancedMesh - Dublam numarul de instante (pentru cruce)
  const count = TREE_PROPS.length;
  const iMesh = new THREE.InstancedMesh(geo, mat, count * 2); 
  
  const dummy = new THREE.Object3D();

  TREE_PROPS.forEach((p, i) => {
    const baseX = p.x ?? 0;
    const baseZ = p.z ?? 0;
    const baseRot = p.rotY ?? 0;
    const scale = 0.8 + Math.random() * 0.4;

    // Instanta 1: Planul A
    dummy.position.set(baseX, 0, baseZ);
    dummy.rotation.y = baseRot;
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    iMesh.setMatrixAt(i * 2, dummy.matrix);

    // Instanta 2: Planul B (rotit la 90 grade fata de primul)
    dummy.rotation.y = baseRot + Math.PI / 2;
    dummy.updateMatrix();
    iMesh.setMatrixAt(i * 2 + 1, dummy.matrix);
  });

  iMesh.instanceMatrix.needsUpdate = true;
  return iMesh;
}

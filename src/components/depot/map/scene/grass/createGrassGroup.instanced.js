// src/components/depot/map/scene/trees/createGrassGroupInstanced.js
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { TREE_PROPS } from "../trees/treeLayout";

const loader = new GLTFLoader();
let templateMesh = null;

async function loadGrassMeshTemplate() {
  if (templateMesh) return templateMesh;
  const gltf = await new Promise((resolve, reject) => {
    loader.load("/models/detailed_grass_-_by_lemstrx.glb", resolve, undefined, reject);
  });
  
  gltf.scene.traverse((o) => {
    if (!templateMesh && o.isMesh) templateMesh = o;
  });
  return templateMesh;
}

export async function createGrassGroupInstanced({
  bladesPerTree = 25,
  spread = 3.5,
  y = 0.01,
  minScale = 0.4,
  maxScale = 0.8,
}) {
  const tpl = await loadGrassMeshTemplate();
  const treeCount = TREE_PROPS.length;
  const total = treeCount * bladesPerTree;

  // 1. MATERIAL OPTIMIZAT CU EFECT DE VANT
  const material = new THREE.MeshLambertMaterial({
    map: tpl.material.map,
    alphaTest: 0.5,
    transparent: false,
    side: THREE.DoubleSide,
  });

  // Injectam Shader-ul de vant
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    material.userData.shader = shader; // stocam referinta pentru tick()

    shader.vertexShader = `
      uniform float uTime;
    ` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      `#include <begin_vertex>`,
      `
      vec3 transformed = vec3(position);
      // Miscam varful ierbii (unde y > 0.1) in functie de timp
      float wind = sin(uTime + position.x * 0.5) * cos(uTime * 0.8 + position.z * 0.5) * 0.15;
      if(position.y > 0.1) {
        transformed.x += wind * position.y;
        transformed.z += wind * position.y;
      }
      `
    );
  };

  const inst = new THREE.InstancedMesh(tpl.geometry, material, total);
  inst.castShadow = false; // Performanta critica
  inst.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  let idx = 0;

  for (let t = 0; t < treeCount; t++) {
    const p = TREE_PROPS[t];
    const baseX = p.x ?? 0;
    const baseZ = p.z ?? 0;

    for (let i = 0; i < bladesPerTree; i++) {
      // Pozitionare in cerc in jurul copacului
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * spread;
      const rx = Math.cos(angle) * radius;
      const rz = Math.sin(angle) * radius;

      const s = minScale + Math.random() * (maxScale - minScale);
      
      dummy.position.set(baseX + rx, y, baseZ + rz);
      dummy.rotation.y = Math.random() * Math.PI;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      inst.setMatrixAt(idx, dummy.matrix);

      // Randomizare culoare (nuante de verde/galbui)
      const shade = 0.7 + Math.random() * 0.3;
      color.setRGB(shade * 0.8, shade, shade * 0.5); 
      inst.setColorAt(idx, color);

      idx++;
    }
  }

  inst.instanceMatrix.needsUpdate = true;
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;

  // Adaugam o metoda tick pentru a anima vantul
  inst.userData.tick = (dt, totalTime) => {
    if (material.userData.shader) {
      material.userData.shader.uniforms.uTime.value = totalTime;
    }
  };

  return inst;
}

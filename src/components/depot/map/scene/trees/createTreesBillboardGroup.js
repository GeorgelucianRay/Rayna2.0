import * as THREE from "three";
import { BufferGeometryUtils } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { TREE_PROPS } from "./treeLayout";

// ... loadTreeTexture ramane la fel (cu TEX_CACHE) ...

export async function createTreesBillboardGroup({
  url = "/textures/trees/tree_cutout.png",
  width = 4,
  height = 6,
  alphaTest = 0.5,
} = {}) {
  const tex = await loadTreeTexture(url);

  // 1. CREĂM GEOMETRIA "ÎN CRUCE" O SINGURĂ DATĂ
  const p1 = new THREE.PlaneGeometry(width, height);
  const p2 = new THREE.PlaneGeometry(width, height);
  p2.rotateY(Math.PI / 2); // Rotim al doilea plan la 90 grade

  // Combinăm cele două plane-uri într-o singură geometrie (1 draw call per instanță)
  const crossGeo = BufferGeometryUtils.mergeGeometries([p1, p2]);
  // Mutăm pivotul la baza copacului (ca să stea pe sol la y=0)
  crossGeo.translate(0, height / 2, 0);

  // 2. MATERIAL OPTIMIZAT
  // Folosim MeshLambert sau MeshBasic pentru viteză maximă
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    alphaTest: alphaTest, // Esențial pentru performanță (evită sortarea transparenței)
    side: THREE.DoubleSide,
    depthWrite: true,
  });

  // 3. INSTANCED MESH
  // Un singur obiect care desenează TOȚI copacii din listă
  const count = TREE_PROPS.length;
  const iMesh = new THREE.InstancedMesh(crossGeo, mat, count);
  iMesh.name = "trees.instanced";

  const dummy = new THREE.Object3D();

  TREE_PROPS.forEach((p, i) => {
    dummy.position.set(p.x ?? 0, p.y ?? 0, p.z ?? 0);
    
    // Randomizăm puțin rotația și scara pentru realism (game dev trick)
    dummy.rotation.y = (p.rotY ?? 0) + (Math.random() * 0.5); 
    const scale = 0.8 + Math.random() * 0.4;
    dummy.scale.set(scale, scale, scale);
    
    dummy.updateMatrix();
    iMesh.setMatrixAt(i, dummy.matrix);
  });

  iMesh.instanceMatrix.needsUpdate = true;
  
  // Optimizări extra
  iMesh.castShadow = false; // Copacii 2D cu umbre 3D arată ciudat și consumă FPS
  iMesh.receiveShadow = false;

  return iMesh;
}

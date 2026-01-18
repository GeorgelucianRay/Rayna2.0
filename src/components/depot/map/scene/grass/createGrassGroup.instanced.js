// ASCII quotes only
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { TREE_PROPS } from "../trees/treeLayout";

const loader = new GLTFLoader();
let templateMesh = null;

async function loadGrassMeshTemplate() {
  if (templateMesh) return templateMesh;

  const gltf = await new Promise((resolve, reject) => {
    loader.load(
      "/models/detailed_grass_-_by_lemstrx.glb",
      (g) => resolve(g),
      undefined,
      reject
    );
  });

  const root = gltf.scene || gltf.scenes?.[0];
  if (!root) throw new Error("Grass GLB has no scene");

  // luam primul mesh gasit
  let mesh = null;
  root.traverse((o) => {
    if (!mesh && o && o.isMesh) mesh = o;
  });

  if (!mesh) throw new Error("Grass GLB has no mesh");
  templateMesh = mesh;
  return templateMesh;
}

// Un singur InstancedMesh pentru toata iarba (super rapid)
export async function createGrassGroupInstanced({
  name = "grass.instanced",
  bladesPerTree = 35, // cate "fire" per copac
  spread = 4.0,       // cat de departe se imprastie in jurul copacului
  y = 0.02,           // mica ridicare sa nu z-fight cu solul
  minScale = 0.75,
  maxScale = 1.25,
  castShadow = false,
  receiveShadow = false,
} = {}) {
  const g = new THREE.Group();
  g.name = name;

  const tpl = await loadGrassMeshTemplate();

  // IMPORTANT: clonam materialul ca sa nu afectam altceva (optional)
  const geometry = tpl.geometry;
  const material = Array.isArray(tpl.material) ? tpl.material : tpl.material;

  const treeCount = TREE_PROPS.length;
  const total = Math.max(1, treeCount * bladesPerTree);

  const inst = new THREE.InstancedMesh(geometry, material, total);
  inst.name = "grassBlades";
  inst.frustumCulled = true;
  inst.castShadow = !!castShadow;
  inst.receiveShadow = !!receiveShadow;

  const dummy = new THREE.Object3D();
  let idx = 0;

  for (let t = 0; t < treeCount; t++) {
    const p = TREE_PROPS[t];
    const baseX = p.x ?? 0;
    const baseZ = p.z ?? 0;

    for (let i = 0; i < bladesPerTree; i++) {
      if (idx >= total) break;

      // Directia "spre exterior" = din centru (0,0) catre copac
const dirX = baseX;
const dirZ = baseZ;

// normalizare (aici chiar e ok cu sqrt, e ieftin la cateva mii de instante)
const len = Math.hypot(dirX, dirZ) || 1;
const ux = dirX / len;
const uz = dirZ / len;

// vector perpendicular (stanga/dreapta fata de directia outward)
const px = -uz;
const pz = ux;

// --- control: unde incepe iarba fata de copac ---
// vrei "sa inceapa exact de unde sunt copacii" => startOffset ~ 0..0.3
const startOffset = 0.15; // ajusteaza 0.0 - 0.5

// --- control: cat se duce in exterior ---
// outwardOnly: 0..1 (0=lipit, 1=la marginea spread)
const outwardOnly = Math.random(); // doar in [0,1], nu negativ

// --- control: cat se imprastie lateral ---
// lateral in [-1,1]
const lateral = (Math.random() * 2 - 1);

// Impingem DOAR spre exterior + putin lateral
const outDist = startOffset + outwardOnly * spread;     // DOAR exterior
const sideDist = lateral * (spread * 0.35);             // latime mica, ajusteaza 0.2-0.6

const rx = ux * outDist + px * sideDist;
const rz = uz * outDist + pz * sideDist;




      const s = minScale + Math.random() * (maxScale - minScale);
      const rot = Math.random() * Math.PI * 2;

      dummy.position.set(baseX + rx, y, baseZ + rz);
      dummy.rotation.set(0, rot, 0);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();

      inst.setMatrixAt(idx, dummy.matrix);
      idx++;
    }
  }

  inst.instanceMatrix.needsUpdate = true;

  // Optional: daca ai materiale grele cu umbre, taie costul pe mobil
  // inst.castShadow = false;
  // inst.receiveShadow = false;

  g.add(inst);
  return g;
}

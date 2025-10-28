// buildController.js - VERSIUNEA FUNCȚIONALĂ
import * as THREE from ‘three’;
import { createMeshFor } from ‘./propRegistry’;
import { addProp, removeProp, getProps, updateProp } from ‘./worldStore’;

export default function createBuildController({
camera,
domElement,
worldGroup,
groundMesh,
grid = 1,
}) {
// — STATE —
let mode = ‘place’;
let currentType = ‘road.segment’;
let preview = null;
let rotY = 0;
let lastHit = null;
const idToMesh = new Map();
let selectedId = null;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const snap = (v) => Math.round(v / grid) * grid;

// — HELPERS —
function getGroundHit(clientX, clientY) {
const rect = domElement.getBoundingClientRect();
mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
raycaster.setFromCamera(mouse, camera);
const hits = raycaster.intersectObject(groundMesh, true);
return hits?.[0] || null;
}

function highlightSelection() {
// Curăță toate highlight-urile
idToMesh.forEach((m) => {
m.traverse((c) => {
if (c.isMesh && c.material?.userData?.__origEmissive) {
c.material.emissive?.copy(c.material.userData.__origEmissive);
}
});
});

```
if (!selectedId) return;
const m = idToMesh.get(selectedId);
if (!m) return;

// Highlight obiectul selectat
m.traverse((c) => {
  if (c.isMesh) {
    if (!c.material.userData) c.material.userData = {};
    if (!c.material.userData.__origEmissive) {
      c.material.userData.__origEmissive = (c.material.emissive || new THREE.Color(0x000000)).clone?.() || new THREE.Color(0x000000);
    }
    if (!c.material.emissive) c.material.emissive = new THREE.Color(0x000000);
    c.material.emissive.setHex(0x22c55e); // Verde pentru selecție
  }
});
```

}

function ensurePreview() {
console.log(‘👻 ensurePreview:’, { mode, currentType });

```
if (mode !== 'place') {
  if (preview) preview.visible = false;
  return;
}

// Dacă preview-ul există și e același tip, doar arată-l
if (preview && preview.userData.__type === currentType) {
  preview.visible = true;
  return;
}

// Șterge preview-ul vechi
if (preview) {
  worldGroup.remove(preview);
  preview = null;
}

// Creează preview nou
const m = createMeshFor(currentType);
if (!m) {
  console.error('❌ createMeshFor nu a returnat nimic pentru:', currentType);
  return;
}

// Fă mesh-ul transparent (fantomă)
m.traverse((child) => {
  if (child.isMesh) {
    child.material = child.material.clone();
    child.material.transparent = true;
    child.material.opacity = 0.5;
    child.material.depthWrite = false;
  }
});

m.userData.__type = currentType;
m.userData.__isPreview = true; // Marchează ca preview
m.rotation.y = rotY;
worldGroup.add(m);
preview = m;

console.log('✅ Preview creat:', currentType);
```

}

// — PUBLIC API —

function updatePreviewAt(clientX, clientY) {
if (mode !== ‘place’) return;

```
ensurePreview();
if (!preview) return;

const hit = getGroundHit(clientX, clientY);
if (!hit) return;

lastHit = hit.point;

const x = snap(hit.point.x);
const z = snap(hit.point.z);
const y = hit.point.y + 0.05; // Puțin deasupra solului

preview.position.set(x, y, z);
preview.rotation.y = rotY;
```

}

function updatePreview() {
// Menține preview-ul vizibil
if (mode === ‘place’ && preview && lastHit) {
const x = snap(lastHit.x);
const z = snap(lastHit.z);
const y = lastHit.y + 0.05;
preview.position.set(x, y, z);
}
}

function clickAt(clientX, clientY) {
console.log(‘🖱️ clickAt apelat:’, { mode, lastHit });

```
// REMOVE MODE
if (mode === 'remove') {
  const rect = domElement.getBoundingClientRect();
  mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  
  // Exclude preview-ul din raycasting
  const validObjects = worldGroup.children.filter(
    obj => !obj.userData?.__isPreview
  );
  const hits = raycaster.intersectObjects(validObjects, true);
  
  if (!hits.length) return;

  let target = hits[0].object;
  while (target && !target.userData?.__propId && target.parent) {
    target = target.parent;
  }
  
  const propId = target?.userData?.__propId;
  if (!propId) return;

  console.log('🗑️ Șterg obiect:', propId);

  const mesh = idToMesh.get(propId);
  if (mesh) {
    worldGroup.remove(mesh);
    idToMesh.delete(propId);
  }
  removeProp(propId);
  
  if (selectedId === propId) selectedId = null;
  highlightSelection();
  return;
}

// PLACE MODE - SIMPLU, DIRECT
if (mode === 'place') {
  placeNow();
}
```

}

// ✅ FUNCȚIA PRINCIPALĂ - PLASARE
function placeNow() {
console.log(‘🎯 placeNow apelat’);

```
if (mode !== 'place') {
  console.log('⚠️ Nu e in place mode');
  return;
}

ensurePreview();

if (!preview) {
  console.error('❌ Nu există preview');
  return;
}

if (!lastHit) {
  console.error('❌ Nu există lastHit (mișcă mouse-ul pe hartă)');
  return;
}

const x = snap(lastHit.x);
const z = snap(lastHit.z);
const y = lastHit.y + 0.05;

console.log('📍 Plasez la:', { x, y, z, type: currentType });

// Creează mesh-ul REAL (nu fantomă)
const mesh = createMeshFor(currentType);
if (!mesh) {
  console.error('❌ createMeshFor a returnat null');
  return;
}

mesh.position.set(x, y, z);
mesh.rotation.y = rotY;
worldGroup.add(mesh);

// Salvează în store
const item = addProp({
  type: currentType,
  pos: [x, y, z],
  rotY,
  scale: [1, 1, 1],
  params: {},
});

console.log('✅ Obiect salvat în store:', item);

mesh.userData.__propId = item.id;
idToMesh.set(item.id, mesh);

// Auto-select noul obiect
selectedId = item.id;
highlightSelection();

console.log('📦 Total obiecte în scenă:', idToMesh.size);
```

}

// Rotație
function rotateStep(dir = 1) {
rotY += dir * (Math.PI / 2);

```
if (preview) {
  preview.rotation.y = rotY;
}

if (selectedId) {
  const mesh = idToMesh.get(selectedId);
  if (mesh) {
    mesh.rotation.y += dir * (Math.PI / 2);
    // Sincronizează cu store-ul
    updateProp(selectedId, { rotY: mesh.rotation.y });
  }
}
```

}

// Setări
function setMode(next) {
console.log(‘🔄 Schimb mode:’, mode, ‘→’, next);
mode = next;
ensurePreview();
}

function setType(t) {
console.log(‘🔄 Schimb tip:’, currentType, ‘→’, t);
currentType = t;
ensurePreview();
}

// Selecție
function setSelectedId(id) {
selectedId = id || null;
highlightSelection();
}

function getSelectedId() {
return selectedId;
}

// Mutare fină
function nudgeSelected(dx = 0, dz = 0) {
if (!selectedId) return;

```
const mesh = idToMesh.get(selectedId);
if (!mesh) return;

mesh.position.x = snap(mesh.position.x + dx);
mesh.position.z = snap(mesh.position.z + dz);

// Sincronizează cu store-ul
updateProp(selectedId, {
  pos: [mesh.position.x, mesh.position.y, mesh.position.z]
});

console.log('↔️ Obiect mutat:', selectedId, mesh.position);
```

}

// Încărcare obiecte existente din store
function mountExistingFromStore() {
console.log(‘📥 Montez obiecte existente din store…’);

```
const props = getProps();
console.log('📦 Găsite în store:', props.length, 'obiecte');

for (const p of props) {
  if (idToMesh.has(p.id)) {
    console.log('⏭️ Skip (deja montat):', p.id);
    continue;
  }

  const mesh = createMeshFor(p.type);
  if (!mesh) {
    console.error('❌ Nu pot crea mesh pentru:', p.type);
    continue;
  }

  mesh.position.set(p.pos[0], p.pos[1], p.pos[2]);
  mesh.rotation.y = p.rotY || 0;
  mesh.userData.__propId = p.id;
  
  worldGroup.add(mesh);
  idToMesh.set(p.id, mesh);
  
  console.log('✅ Montat:', p.type, 'la', p.pos);
}

highlightSelection();
console.log('✅ Total montat:', idToMesh.size);
```

}

// Cleanup - șterge un obiect din scenă
function removeFromScene(id) {
const mesh = idToMesh.get(id);
if (mesh) {
worldGroup.remove(mesh);
idToMesh.delete(id);
}
}

// NU mai avem armPlace - plasăm direct la click!
function armPlace() {
// DEPRECATED - nu mai e nevoie
console.log(‘ℹ️ armPlace() e deprecated, plasarea e automată’);
}

return {
setMode,
setType,
rotateStep,
armPlace, // păstrat pentru compatibilitate
placeNow,
updatePreviewAt,
clickAt,
updatePreview,
setSelectedId,
getSelectedId,
nudgeSelected,
mountExistingFromStore,
removeFromScene,
};
}
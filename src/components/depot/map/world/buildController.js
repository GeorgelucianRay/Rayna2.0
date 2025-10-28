// Editor de hartă: plasare la comandă, selecție, mutare, rotire, fără “fantome” persistente.
import * as THREE from 'three';
import { createMeshFor } from './propRegistry';
import { addProp, removeProp, getProps } from './worldStore';

export default function createBuildController({
  camera,
  domElement,
  worldGroup,
  groundMesh,
  grid = 1,
}) {
  // --- state ---
  let mode = 'place';                 // 'place' | 'remove'
  let currentType = 'road.segment';
  let preview = null;                 // fantoma (doar vizuală)
  let rotY = 0;
  let lastHit = null;
  let placeArmed = false;             // NU mai plasăm fără un “Place” explicit
  const idToMesh = new Map();         // pentru select/înlăturare
  let selectedId = null;

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const snap = (v) => Math.round(v / grid) * grid;

  // --- utils ---
  function getGroundHit(clientX, clientY) {
    const rect = domElement.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObject(groundMesh, true);
    return hits?.[0] || null;
  }

  function highlightSelection() {
    // curățăm highlight
    idToMesh.forEach((m) => {
      m.traverse((c) => {
        if (c.isMesh && c.material?.userData?.__origEmissive) {
          c.material.emissive?.copy(c.material.userData.__origEmissive);
        }
      });
    });
    if (!selectedId) return;
    const m = idToMesh.get(selectedId);
    if (!m) return;
    m.traverse((c) => {
      if (c.isMesh) {
        if (!c.material.userData) c.material.userData = {};
        if (!c.material.userData.__origEmissive) {
          c.material.userData.__origEmissive = (c.material.emissive || new THREE.Color(0x000000)).clone?.() || new THREE.Color(0x000000);
        }
        if (!c.material.emissive) c.material.emissive = new THREE.Color(0x000000);
        c.material.emissive.setHex(0x2266ff);
      }
    });
  }

  function ensurePreview() {
    if (mode !== 'place') { if (preview) preview.visible = false; return; }
    if (preview && preview.userData.__type === currentType) { preview.visible = true; return; }
    if (preview) {
      worldGroup.remove(preview);
      preview = null;
    }
    const m = createMeshFor(currentType);
    if (!m) return;
    // fantomă
    m.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        if ('transparent' in child.material) child.material.transparent = true;
        if ('opacity' in child.material) child.material.opacity = 0.45;
        if ('depthWrite' in child.material) child.material.depthWrite = false;
      }
    });
    m.userData.__type = currentType;
    m.rotation.y = rotY;
    worldGroup.add(m);
    preview = m;
  }

  // --- public API: pentru UI / scene ---
  function updatePreviewAt(clientX, clientY) {
    if (mode !== 'place') return;
    ensurePreview();
    if (!preview) return;

    const hit = getGroundHit(clientX, clientY);
    if (!hit) return;
    lastHit = hit.point;

    const x = snap(hit.point.x);
    const z = snap(hit.point.z);
    preview.position.set(x, 0, z);
    preview.rotation.y = rotY;
  }

  function updatePreview() {
    // no-op; păstrat pentru bucla de animare
  }

  // IMPORTANT: nu mai plasăm la click “oriunde”.
  // Plasarea se face DOAR dacă UI a chemat armPlace() înainte.
  function clickAt(clientX, clientY) {
    if (mode === 'remove') {
      // remove selectiv sub cursor
      const rect = domElement.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(worldGroup.children, true);
      if (!hits.length) return;

      let target = hits[0].object;
      while (target && !target.userData?.__propId && target.parent) target = target.parent;
      const propId = target?.userData?.__propId;
      if (!propId) return;

      // ștergem
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

    if (mode === 'place' && placeArmed) {
      placeNow(); // plasăm exact la ultimul hit/preview
    }
  }

  function armPlace() { placeArmed = true; }
  function placeNow() {
    if (mode !== 'place') return;
    ensurePreview();
    if (!preview || !lastHit) return;

    const x = snap(lastHit.x);
    const z = snap(lastHit.z);

    const mesh = createMeshFor(currentType);
    if (!mesh) return;
    mesh.position.set(x, 0, z);
    mesh.rotation.y = rotY;
    worldGroup.add(mesh);

    const item = addProp({
      type: currentType,
      pos: [x, 0, z],
      rotY,
      scale: [1, 1, 1],
      params: {},
    });
    mesh.userData.__propId = item.id;
    idToMesh.set(item.id, mesh);

    // auto-select noul obiect
    selectedId = item.id;
    highlightSelection();

    placeArmed = false; // consumat
  }

  function rotateStep(dir = 1) {
    rotY += dir * (Math.PI / 2);
    if (preview) preview.rotation.y = rotY;
    if (selectedId) {
      const mesh = idToMesh.get(selectedId);
      if (mesh) {
        mesh.rotation.y += dir * (Math.PI / 2);
        // sincronizăm store-ul
        const p = getProps().find(p => p.id === selectedId);
        if (p) p.rotY = mesh.rotation.y;
      }
    }
  }

  function setMode(next) {
    mode = next;
    ensurePreview();
  }

  function setType(t) {
    currentType = t;
    ensurePreview();
  }

  function setSelectedId(id) {
    selectedId = id || null;
    highlightSelection();
  }
  function getSelectedId() { return selectedId; }

  // mutare fină a obiectului selectat
  function nudgeSelected(dx = 0, dz = 0) {
    if (!selectedId) return;
    const mesh = idToMesh.get(selectedId);
    if (!mesh) return;
    mesh.position.x = snap(mesh.position.x + dx);
    mesh.position.z = snap(mesh.position.z + dz);
    const p = getProps().find(p => p.id === selectedId);
    if (p) p.pos = [mesh.position.x, mesh.position.y, mesh.position.z];
  }

  // încărcare în scenă a obiectelor din store (la deschiderea editorului)
  function mountExistingFromStore() {
    for (const p of getProps()) {
      if (idToMesh.has(p.id)) continue;
      const mesh = createMeshFor(p.type);
      mesh.position.set(p.pos[0], p.pos[1], p.pos[2]);
      mesh.rotation.y = p.rotY || 0;
      mesh.userData.__propId = p.id;
      worldGroup.add(mesh);
      idToMesh.set(p.id, mesh);
    }
    highlightSelection();
  }

  return {
    // moduri și tip
    setMode, setType, rotateStep,
    // plasare controlată
    armPlace, placeNow,
    // preview + input
    updatePreviewAt, clickAt, updatePreview,
    // selecție / mutare
    setSelectedId, getSelectedId, nudgeSelected,
    // încărcare “edits” în scenă
    mountExistingFromStore,
  };
}
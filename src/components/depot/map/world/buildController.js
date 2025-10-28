// src/components/depot/map/world/buildController.js
import * as THREE from 'three';
import { createMeshFor } from './propRegistry';
import { addProp, removeProp, getProps, updateProp, clearAllProps } from './worldStore';

export default function createBuildController({
  camera,
  domElement,
  worldGroup,
  groundMesh,
  grid = 1,
}) {
  // --- STATE INTERN ---
  let mode = 'place';                 // 'place' | 'remove'
  let currentType = 'road.segment';   // tipul curent
  let preview = null;                 // mesh fantomă
  let rotY = 0;                       // rotația curentă
  let lastHit = null;                 // ultima poziție pe sol
  let placeArmed = false;             // se plasează doar dacă e „armat”

  // management obiecte
  const idToMesh = new Map();         // id (store) → mesh
  let selectedId = null;              // id-ul selectat (pentru mutare/rotire)

  // three.js helpers
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const snap = (v) => Math.round(v / grid) * grid;

  // ========================
  //       UTILITARE
  // ========================

  function getGroundHit(clientX, clientY) {
    const rect = domElement.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObject(groundMesh, true);
    return hits?.[0] || null;
  }

  function highlightSelection() {
    // elimină highlight-ul de pe toate
    idToMesh.forEach((m) => {
      m.traverse((c) => {
        if (c.isMesh && c.material?.userData?.__origEmissive) {
          c.material.emissive?.copy(c.material.userData.__origEmissive);
        }
      });
    });

    // evidențiază selectatul
    if (!selectedId) return;
    const m = idToMesh.get(selectedId);
    if (!m) return;
    m.traverse((c) => {
      if (!c.isMesh) return;
      if (!c.material.userData) c.material.userData = {};
      if (!c.material.userData.__origEmissive) {
        const base = c.material.emissive || new THREE.Color(0x000000);
        c.material.userData.__origEmissive = base.clone
          ? base.clone()
          : new THREE.Color(0x000000);
      }
      if (!c.material.emissive) c.material.emissive = new THREE.Color(0x000000);
      c.material.emissive.setHex(0x22aaff);
    });
  }

  // ========================
  //   CREARE / PREVIEW
  // ========================

  function ensurePreview() {
    if (mode !== 'place') {
      if (preview) preview.visible = false;
      return;
    }

    if (preview && preview.userData.__type === currentType) {
      preview.visible = true;
      return;
    }

    if (preview) {
      worldGroup.remove(preview);
      preview = null;
    }

    const m = createMeshFor(currentType);
    if (!m) return;

    // setare fantomă
    m.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        child.material.transparent = true;
        child.material.opacity = 0.45;
        child.material.depthWrite = false;
      }
    });

    m.userData.__type = currentType;
    m.rotation.y = rotY;
    worldGroup.add(m);
    preview = m;
  }

  // repoziționează preview-ul în funcție de poziția pe ecran
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
    // pentru animații viitoare (deocamdată gol)
  }

  // ========================
  //   PLASARE / ȘTERGERE
  // ========================

  function armPlace() {
    placeArmed = true;
  }

  function disarmPlace() {
    placeArmed = false;
  }

  function placeNow() {
    if (mode !== 'place' || !lastHit) return;
    ensurePreview();
    if (!preview) return;

    const x = snap(lastHit.x);
    const z = snap(lastHit.z);

    const mesh = createMeshFor(currentType);
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

    selectedId = item.id;
    highlightSelection();
    disarmPlace();
  }

  function clickAt(clientX, clientY) {
    if (mode === 'remove') {
      const rect = domElement.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(worldGroup.children, true);
      if (!hits.length) return;

      let target = hits[0].object;
      while (target && !target.userData?.__propId && target.parent)
        target = target.parent;

      const propId = target?.userData?.__propId;
      if (!propId) return;

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

    if (mode === 'place' && placeArmed) placeNow();
  }

  // ========================
  //   MUTARE / ROTIRE
  // ========================

  function rotateStep(dir = 1) {
    rotY += dir * (Math.PI / 2);
    if (preview) preview.rotation.y = rotY;

    if (selectedId) {
      const mesh = idToMesh.get(selectedId);
      if (mesh) {
        mesh.rotation.y += dir * (Math.PI / 2);
        updateProp(selectedId, { rotY: mesh.rotation.y });
      }
    }
  }

  function nudgeSelected(dx = 0, dz = 0) {
    if (!selectedId) return;
    const mesh = idToMesh.get(selectedId);
    if (!mesh) return;

    mesh.position.x = snap(mesh.position.x + dx);
    mesh.position.z = snap(mesh.position.z + dz);
    updateProp(selectedId, {
      pos: [mesh.position.x, mesh.position.y, mesh.position.z],
    });
  }

  // ========================
  //    SELECȚIE / STORE
  // ========================

  function setSelectedId(id) {
    selectedId = id || null;
    highlightSelection();
  }

  function getSelectedId() {
    return selectedId;
  }

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

  function clearAllFromScene() {
    idToMesh.forEach((m) => worldGroup.remove(m));
    idToMesh.clear();
    clearAllProps();
    selectedId = null;
    highlightSelection();
    ensurePreview();
  }

  // ========================
  //   SCHIMBARE MOD / TIP
  // ========================

  function setMode(next) {
    mode = next;
    ensurePreview();
  }

  function setType(t) {
    currentType = t;
    ensurePreview();
  }

  // ========================
  //       API PUBLIC
  // ========================

  return {
    // moduri și tipuri
    setMode,
    setType,
    rotateStep,

    // preview + input
    updatePreviewAt,
    clickAt,
    updatePreview,

    // plasare controlată
    armPlace,
    disarmPlace,
    placeNow,

    // selecție & mișcare
    setSelectedId,
    getSelectedId,
    nudgeSelected,

    // încărcare & resetare
    mountExistingFromStore,
    clearAllFromScene,
  };
}
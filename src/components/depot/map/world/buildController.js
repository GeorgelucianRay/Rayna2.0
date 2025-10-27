// src/components/depot/map/world/buildController.js
import * as THREE from 'three';
import { createMeshFor } from './propRegistry';
import { getProps, addProp, removeProp, saveWorldEdits } from './worldStore';

export default function createBuildController({
  camera,
  domElement,
  worldGroup,
  groundMesh,
  grid = 1,           // mărimea grilei de snap
  stepRot = Math.PI/2 // rotire în pași de 90°
}) {
  // --- stare internă ---
  const raycaster = new THREE.Raycaster();
  const mouseNDC = new THREE.Vector2();
  let mode = 'place';          // 'place' | 'remove'
  let currentType = 'road.segment';
  let preview = null;          // mesh fantomă
  let previewRotY = 0;
  let selectedId = null;

  // indexăm obiectele plasate în scenă
  const idToMesh = new Map();

  // un plan “invizibil” peste ground pentru intersecții mai robuste (opțional)
  const groundTarget = groundMesh;

  // ---------- utilitare ----------
  function setMode(newMode) {
    mode = newMode === 'remove' ? 'remove' : 'place';
    // la remove, ascundem preview (nu e nevoie de fantomă)
    if (mode === 'remove') {
      if (preview && worldGroup) worldGroup.remove(preview);
      preview = null;
    } else {
      ensurePreview();
    }
  }

  function setType(typeKey) {
    currentType = typeKey;
    // recreăm preview pentru noul tip
    if (mode === 'place') {
      remakePreview();
    }
  }

  function rotateStep(dir = 1) {
    // în “place”, rotește preview
    if (mode === 'place' && preview) {
      previewRotY = normalizeAngle(previewRotY + dir * stepRot);
      preview.rotation.y = previewRotY;
    }
    // dacă e selectat un prop existent, îl rotim și îl salvăm în store
    if (selectedId) {
      const m = idToMesh.get(selectedId);
      if (m) {
        m.rotation.y = normalizeAngle(m.rotation.y + dir * stepRot);
        persistMeshTransform(m);
      }
    }
  }

  function normalizeAngle(a) {
    // aduce la interval [-PI, PI] ca să nu “explodeze” numeric
    let x = a;
    while (x > Math.PI) x -= Math.PI * 2;
    while (x < -Math.PI) x += Math.PI * 2;
    return x;
  }

  function screenToWorldOnGround(clientX, clientY) {
    // coordonate normalizate ecran
    const rect = domElement.getBoundingClientRect();
    mouseNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouseNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouseNDC, camera);
    const hits = raycaster.intersectObject(groundTarget, false);
    if (!hits || !hits.length) return null;

    const p = hits[0].point.clone();
    // snap la grilă
    p.x = Math.round(p.x / grid) * grid;
    p.z = Math.round(p.z / grid) * grid;
    p.y = 0; // ținem pe planul solului
    return p;
  }

  function ensurePreview() {
    if (preview) return;
    preview = safeCreateMesh(currentType);
    if (!preview) return;
    previewRotY = 0;
    makeGhost(preview);
    worldGroup.add(preview);
  }

  function remakePreview() {
    if (preview) {
      worldGroup.remove(preview);
      preview = null;
    }
    ensurePreview();
  }

  function makeGhost(mesh) {
    // “fantomă” (wireframe / transparent)
    mesh.traverse((obj) => {
      if (obj.isMesh) {
        const mat = obj.material;
        // clone ușor, fără a pierde textura (dacă există)
        obj.material = Array.isArray(mat)
          ? mat.map(cloneToGhost)
          : cloneToGhost(mat);
        obj.renderOrder = 999; // deasupra
      }
    });
    function cloneToGhost(m) {
      const mm = m.clone();
      mm.transparent = true;
      mm.opacity = 0.5;
      // mic accent
      if (!mm.emissive) mm.emissive = new THREE.Color(0x00ff00);
      else mm.emissive = new THREE.Color(0x00ff00);
      mm.emissiveIntensity = 0.15;
      return mm;
    }
  }

  function safeCreateMesh(typeKey, params = {}) {
    try {
      const mesh = createMeshFor(typeKey, params);
      mesh.userData.__type = typeKey;
      return mesh;
    } catch (e) {
      console.warn('[buildController] cannot create mesh for', typeKey, e);
      return null;
    }
  }

  function placeAt(point) {
    const mesh = safeCreateMesh(currentType);
    if (!mesh) return;

    mesh.position.copy(point);
    mesh.rotation.y = previewRotY;

    // persistă în store
    const item = addProp({
      type: currentType,
      pos: [mesh.position.x, mesh.position.y, mesh.position.z],
      rotY: mesh.rotation.y,
      scale: [1, 1, 1],
      params: {}
    });
    mesh.userData.__propId = item.id;

    idToMesh.set(item.id, mesh);
    worldGroup.add(mesh);

    // după plasare, preview rămâne (poți continua să pui)
  }

  function tryRemoveAt(point) {
    // căutăm cel mai apropiat mesh (într-un rayon mic) sau raycast direct pe worldGroup
    raycaster.setFromCamera(mouseNDC, camera);
    const hits = raycaster.intersectObjects(worldGroup.children, true);
    // ignoră preview-ul
    const hit = hits.find(h => h.object && !isPreviewChild(h.object));
    if (!hit) return;

    // urcă până la root-ul props-ului care are __propId
    const target = findMeshWithPropId(hit.object);
    if (!target) return;

    const id = target.userData.__propId;
    if (!id) return;

    // ștergem din scenă + store
    worldGroup.remove(target);
    idToMesh.delete(id);
    removeProp(id);
    // dacă era selectat, deselectăm
    if (selectedId === id) selectedId = null;
  }

  function isPreviewChild(obj) {
    if (!preview) return false;
    let o = obj;
    while (o) {
      if (o === preview) return true;
      o = o.parent;
    }
    return false;
  }

  function findMeshWithPropId(obj) {
    let o = obj;
    while (o) {
      if (o.userData && o.userData.__propId) return o;
      o = o.parent;
    }
    return null;
  }

  function updatePreviewAt(clientX, clientY) {
    if (mode !== 'place') return; // doar în place
    ensurePreview();
    const p = screenToWorldOnGround(clientX, clientY);
    if (!p || !preview) return;
    preview.position.copy(p);
    preview.rotation.y = previewRotY;
  }

  function clickAt(clientX, clientY) {
    const p = screenToWorldOnGround(clientX, clientY);
    if (!p) return;
    if (mode === 'place') {
      placeAt(p);
    } else {
      tryRemoveAt(p);
    }
  }

  function updatePreview() {
    // opțional, dacă vrei să rulezi ceva în bucla de animare
    // (momentan gol; “previewAt” este condus de evenimente de pointer)
  }

  // ---------- selecție + manipulare ----------
  function setSelectedId(id) {
    selectedId = id || null;
    highlightSelected();
  }

  function getSelectedId() { return selectedId; }

  function highlightSelected() {
    // scoatem highlight de pe toate
    idToMesh.forEach((m) => {
      setOutline(m, false);
    });
    if (!selectedId) return;
    const m = idToMesh.get(selectedId);
    if (m) setOutline(m, true);
  }

  function setOutline(mesh, on) {
    mesh.traverse((o) => {
      if (!o.isMesh) return;
      if (on) {
        if (!o.userData.__origMat) o.userData.__origMat = o.material;
        const outline = new THREE.MeshBasicMaterial({ color: 0x22c55e });
        o.material = outline;
      } else {
        if (o.userData.__origMat) {
          o.material = o.userData.__origMat;
          o.userData.__origMat = null;
        }
      }
    });
  }

  function nudgeSelected(dx = 0, dz = 0) {
    if (!selectedId) return;
    const m = idToMesh.get(selectedId); if (!m) return;
    m.position.x = Math.round((m.position.x + dx) / grid) * grid;
    m.position.z = Math.round((m.position.z + dz) / grid) * grid;
    persistMeshTransform(m);
  }

  function rotateSelected(dir = 1) {
    if (!selectedId) return;
    const m = idToMesh.get(selectedId); if (!m) return;
    m.rotation.y = normalizeAngle(m.rotation.y + dir * stepRot);
    persistMeshTransform(m);
  }

  function persistMeshTransform(mesh) {
    // actualizează în store item-ul cu id = __propId
    const id = mesh.userData.__propId;
    if (!id) return;
    const props = getProps();
    const it = props.find(p => p.id === id);
    if (!it) return;
    it.pos = [mesh.position.x, mesh.position.y, mesh.position.z];
    it.rotY = mesh.rotation.y;
    // (scale/params rămân la fel)
    saveWorldEdits();
  }

  function syncFromStore() {
    // golim tot ce avem în scenă (dar păstrăm preview dacă e)
    const toRemove = [];
    worldGroup.children.forEach(ch => {
      if (ch !== preview) toRemove.push(ch);
    });
    toRemove.forEach(ch => worldGroup.remove(ch));
    idToMesh.clear();

    // rebuild din store
    const props = getProps();
    props.forEach(p => {
      const mesh = safeCreateMesh(p.type, p.params);
      if (!mesh) return;
      mesh.position.set(p.pos[0], p.pos[1], p.pos[2]);
      mesh.rotation.y = p.rotY || 0;
      mesh.userData.__propId = p.id;
      idToMesh.set(p.id, mesh);
      worldGroup.add(mesh);
    });

    // re-highlight dacă mai e selectat ceva
    highlightSelected();
  }

  // construim inițial din store (dacă ai deja obiecte salvate)
  syncFromStore();

  return {
    // mod & tip
    setMode,
    setType,
    rotateStep,

    // interacțiune cursor
    updatePreviewAt,
    clickAt,
    updatePreview,

    // selecție & manipulare
    setSelectedId,
    getSelectedId,
    nudgeSelected,
    rotateSelected,

    // sync
    syncFromStore,
  };
}
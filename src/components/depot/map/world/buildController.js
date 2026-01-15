// src/components/depot/map/world/buildController.js
import * as THREE from "three";
import { createMeshFor } from "./propRegistry";
import { addProp, removeProp, getProps, updateProp, subscribe } from "./worldStore";

/**
 * BuildController (v2)
 * - modes: "place" | "select" | "remove"
 * - preview only in "place"
 * - select by click/tap OR by crosshair (camera center)
 * - remove by click/tap OR removeById
 * - store sync: adds/updates/removes meshes if store changes outside controller
 */
export default function createBuildController({
  camera,
  domElement,
  worldGroup,
  groundMesh,
  grid = 1,
}) {
  // ---------------- STATE ----------------
  let mode = "place"; // "place" | "select" | "remove"
  let currentType = "road.segment";
  let preview = null;
  let rotY = 0;
  let lastHit = null;

  const idToMesh = new Map();
  let selectedId = null;

  // anti-dubluri (pointerdown + touchstart)
  let lastPlaceTs = 0;
  const PLACE_COOLDOWN = 150;

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const snap = (v) => Math.round(v / grid) * grid;

  // ---------------- HELPERS ----------------
  function _safeCloneMat(child) {
    if (!child?.material) return;
    // uneori material poate fi array
    if (Array.isArray(child.material)) {
      child.material = child.material.map((m) => (m?.clone ? m.clone() : m));
    } else if (child.material?.clone) {
      child.material = child.material.clone();
    }
  }

  function _setEmissive(mesh, hex) {
    mesh.traverse((c) => {
      if (!c.isMesh) return;

      if (!_hasEmissive(c.material)) return;

      if (!c.material.userData) c.material.userData = {};
      if (!c.material.userData.__origEmissive) {
        const base = c.material.emissive || new THREE.Color(0x000000);
        c.material.userData.__origEmissive =
          base?.clone?.() || new THREE.Color(0x000000);
      }

      if (!c.material.emissive) c.material.emissive = new THREE.Color(0x000000);
      c.material.emissive.setHex(hex);
    });
  }

  function _restoreEmissive(mesh) {
    mesh.traverse((c) => {
      if (!c.isMesh) return;
      if (!c.material?.userData?.__origEmissive) return;
      if (!_hasEmissive(c.material)) return;
      c.material.emissive?.copy(c.material.userData.__origEmissive);
    });
  }

  function _hasEmissive(mat) {
    // MeshStandardMaterial / MeshLambert etc au emissive; Basic nu.
    // verificăm defensiv
    return !!mat && ("emissive" in mat || typeof mat?.emissive !== "undefined");
  }

  function getGroundHit(clientX, clientY) {
    const rect = domElement.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObject(groundMesh, true);
    return hits?.[0] || null;
  }

  function getPropHitByScreen(clientX, clientY) {
    const rect = domElement.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    return _getPropHitFromRaycaster();
  }

  function getPropHitFromCenter() {
    // crosshair: NDC 0,0
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    return _getPropHitFromRaycaster();
  }

  function _getPropHitFromRaycaster() {
    // excludem preview-ul
    const valid = worldGroup.children.filter((o) => !o.userData?.__isPreview);
    const hits = raycaster.intersectObjects(valid, true);
    if (!hits.length) return null;

    let target = hits[0].object;
    while (target && !target.userData?.__propId && target.parent) target = target.parent;

    const propId = target?.userData?.__propId || null;
    return propId ? { propId, hit: hits[0], object: target } : null;
  }

  function highlightSelection() {
    // reset highlight pentru toate
    idToMesh.forEach((m) => _restoreEmissive(m));

    if (!selectedId) return;

    const m = idToMesh.get(selectedId);
    if (!m) return;

    _setEmissive(m, 0x22c55e); // verde selecție
  }

  function ensurePreview() {
    if (mode !== "place") {
      if (preview) preview.visible = false;
      return;
    }

    // același tip -> doar arată
    if (preview && preview.userData?.__type === currentType) {
      preview.visible = true;
      return;
    }

    // alt tip -> înlocuiește
    if (preview) {
      worldGroup.remove(preview);
      preview = null;
    }

    const m = createMeshFor(currentType);
    if (!m) return;

    // preview "fantomă"
    m.traverse((child) => {
      if (!child.isMesh) return;
      _safeCloneMat(child);
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of mats) {
        if (!mat) continue;
        mat.transparent = true;
        mat.opacity = 0.5;
        mat.depthWrite = false;
      }
    });

    m.userData.__type = currentType;
    m.userData.__isPreview = true;
    m.rotation.y = rotY;

    worldGroup.add(m);
    preview = m;
  }

  function _createRealMesh(type, x, y, z, rot) {
    const mesh = createMeshFor(type);
    if (!mesh) return null;

    mesh.position.set(x, y, z);
    mesh.rotation.y = rot;

    // mark mesh tree with propId later
    return mesh;
  }

  function _attachPropId(mesh, propId) {
    mesh.userData.__propId = propId;
    mesh.traverse((c) => {
      if (!c?.userData) c.userData = {};
      c.userData.__propId = propId;
    });
  }

  function _removeMeshOnly(propId) {
    const mesh = idToMesh.get(propId);
    if (mesh) {
      worldGroup.remove(mesh);
      idToMesh.delete(propId);
    }
  }

  // ---------------- STORE SYNC ----------------
  // dacă store se schimbă în afara controllerului, sincronizăm scena
  const unsubStore = subscribe((s) => {
    const props = s?.props || [];

    // 1) dacă e gol: curățăm scena
    if (props.length === 0) {
      idToMesh.forEach((m) => worldGroup.remove(m));
      idToMesh.clear();
      selectedId = null;
      if (preview) preview.visible = false;
      return;
    }

    // 2) remove meshes care nu mai există în store
    const alive = new Set(props.map((p) => p.id));
    [...idToMesh.keys()].forEach((id) => {
      if (!alive.has(id)) {
        _removeMeshOnly(id);
        if (selectedId === id) selectedId = null;
      }
    });

    // 3) add/update meshes
    for (const p of props) {
      const existing = idToMesh.get(p.id);
      if (!existing) {
        const mesh = _createRealMesh(p.type, p.pos[0], p.pos[1], p.pos[2], p.rotY || 0);
        if (!mesh) continue;
        _attachPropId(mesh, p.id);
        worldGroup.add(mesh);
        idToMesh.set(p.id, mesh);
      } else {
        // update transform dacă diferă (toleranță mică)
        const [x, y, z] = p.pos || [existing.position.x, existing.position.y, existing.position.z];
        if (
          Math.abs(existing.position.x - x) > 1e-6 ||
          Math.abs(existing.position.y - y) > 1e-6 ||
          Math.abs(existing.position.z - z) > 1e-6
        ) {
          existing.position.set(x, y, z);
        }
        const ry = p.rotY || 0;
        if (Math.abs(existing.rotation.y - ry) > 1e-6) {
          existing.rotation.y = ry;
        }
      }
    }

    highlightSelection();
  });

  // ---------------- POINTER / ACTIONS ----------------
  function updatePreviewAt(clientX, clientY) {
    if (mode !== "place") return;
    ensurePreview();
    if (!preview) return;

    const hit = getGroundHit(clientX, clientY);
    if (!hit) return;

    lastHit = hit.point;

    const x = snap(hit.point.x);
    const z = snap(hit.point.z);
    const y = hit.point.y + 0.05;

    preview.position.set(x, y, z);
    preview.rotation.y = rotY;
  }

  function updatePreview() {
    if (mode === "place" && preview && lastHit) {
      const x = snap(lastHit.x);
      const z = snap(lastHit.z);
      const y = lastHit.y + 0.05;
      preview.position.set(x, y, z);
      preview.rotation.y = rotY;
    }
  }

  function _selectByRayScreen(clientX, clientY) {
    const hit = getPropHitByScreen(clientX, clientY);
    selectedId = hit?.propId || null;
    highlightSelection();
    return selectedId;
  }

  function selectFromCenter() {
    const hit = getPropHitFromCenter();
    selectedId = hit?.propId || null;
    highlightSelection();
    return selectedId;
  }

  function _removeByRayScreen(clientX, clientY) {
    const hit = getPropHitByScreen(clientX, clientY);
    if (!hit?.propId) return;

    removeById(hit.propId);
  }

  function clickAt(clientX, clientY) {
    if (mode === "remove") {
      _removeByRayScreen(clientX, clientY);
      return;
    }
    if (mode === "select") {
      _selectByRayScreen(clientX, clientY);
      return;
    }
    if (mode === "place") {
      placeNow();
      return;
    }
  }

  // ---------------- PLACE ----------------
  function placeNow() {
    const now =
      typeof performance !== "undefined" && performance.now
        ? performance.now()
        : Date.now();

    if (now - lastPlaceTs < PLACE_COOLDOWN) return;
    lastPlaceTs = now;

    if (mode !== "place") return;

    ensurePreview();
    if (!preview) return;
    if (!lastHit) return;

    const x = snap(lastHit.x);
    const z = snap(lastHit.z);
    const y = lastHit.y + 0.05;

    const mesh = _createRealMesh(currentType, x, y, z, rotY);
    if (!mesh) return;

    worldGroup.add(mesh);

    const item = addProp({
      type: currentType,
      pos: [x, y, z],
      rotY,
      scale: [1, 1, 1],
      params: {},
    });

    _attachPropId(mesh, item.id);
    idToMesh.set(item.id, mesh);

    selectedId = item.id;
    highlightSelection();
  }

  // ---------------- TRANSFORM ----------------
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

  // ---------------- MODE / TYPE ----------------
  function setMode(next) {
    const n = String(next || "place").toLowerCase();
    mode = n === "remove" || n === "select" || n === "place" ? n : "place";
    ensurePreview();
  }

  function setType(t) {
    currentType = t || currentType;
    ensurePreview();
  }

  // ---------------- SELECT API ----------------
  function setSelectedId(id) {
    selectedId = id || null;
    highlightSelection();
  }

  function getSelectedId() {
    return selectedId;
  }

  // ---------------- STORE MOUNT (initial) ----------------
  function mountExistingFromStore() {
    const props = getProps() || [];
    for (const p of props) {
      if (idToMesh.has(p.id)) continue;

      const mesh = _createRealMesh(p.type, p.pos[0], p.pos[1], p.pos[2], p.rotY || 0);
      if (!mesh) continue;

      _attachPropId(mesh, p.id);
      worldGroup.add(mesh);
      idToMesh.set(p.id, mesh);
    }
    highlightSelection();
  }

  // ---------------- REMOVE API ----------------
  function removeFromScene(id) {
    if (!id) return;
    _removeMeshOnly(id);
    if (selectedId === id) selectedId = null;
    highlightSelection();
  }

  function removeById(id) {
    if (!id) return;
    removeFromScene(id); // scenă
    removeProp(id);      // store
  }

  function removeAllFromScene() {
    idToMesh.forEach((m) => worldGroup.remove(m));
    idToMesh.clear();
    selectedId = null;
    if (preview) preview.visible = false;
  }

  function armPlace() {
    // compat: nu mai e nevoie, placeNow se face în clickAt/placeNow
  }

  // ---------------- CLEANUP ----------------
  function dispose() {
    try {
      unsubStore?.();
    } catch {}
    if (preview) {
      try {
        worldGroup.remove(preview);
      } catch {}
      preview = null;
    }
    idToMesh.forEach((m) => worldGroup.remove(m));
    idToMesh.clear();
    selectedId = null;
  }

  // ---------------- PUBLIC API ----------------
  return {
    // mode/type
    setMode,
    setType,

    // place
    placeNow,
    updatePreviewAt,
    updatePreview,
    clickAt,

    // transform
    rotateStep,
    nudgeSelected,

    // select
    setSelectedId,
    getSelectedId,
    selectFromCenter,

    // mount/remove
    mountExistingFromStore,
    removeFromScene,
    removeById,
    removeAllFromScene,

    // compat
    armPlace,

    // cleanup
    dispose,
  };
}
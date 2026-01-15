// src/components/depot/map/world/buildController.js
// ASCII quotes only
import * as THREE from "three";
import { createMeshFor } from "./propRegistry";
import {
  addProp,
  removeProp,
  getProps,
  updateProp,
  subscribe,
  clearAllProps,
} from "./worldStore";

export default function createBuildController({
  camera,
  domElement,     // OPTIONAL (pt orbit mouse/tap)
  worldGroup,
  groundMesh,
  grid = 1,
}) {
  // ============================================================
  // 0) CONSTANTE / UTILITARE
  // ============================================================
  const raycaster = new THREE.Raycaster();
  const mouseNdc = new THREE.Vector2();
  const camDir = new THREE.Vector3();
  const camPos = new THREE.Vector3();

  const snap = (v) => Math.round(v / grid) * grid;

  // anti double tap / double trigger
  let lastActionTs = 0;
  const ACTION_COOLDOWN = 160;

  function cooldownOk() {
    const now = (typeof performance !== "undefined" && performance.now)
      ? performance.now()
      : Date.now();
    if (now - lastActionTs < ACTION_COOLDOWN) return false;
    lastActionTs = now;
    return true;
  }

  // ============================================================
  // 1) STATE INTERN
  // ============================================================
  let enabled = false;              // master switch
  let mode = "place";               // "place" | "select" | "remove"
  let currentType = "road.segment"; // prop type key
  let rotY = 0;

  let preview = null;               // ghost mesh
  let lastGroundPoint = null;       // THREE.Vector3 (ultimul hit pe ground)

  let selectedId = null;            // prop id selectat
  const idToMesh = new Map();       // prop id -> root mesh

  // ============================================================
  // 2) STORE SYNC (dacă store e gol -> curățăm scena)
  // ============================================================
  const unsubStore = subscribe((s) => {
    if (!s.props || s.props.length === 0) {
      idToMesh.forEach((m) => worldGroup.remove(m));
      idToMesh.clear();
      selectedId = null;
      if (preview) preview.visible = false;
    }
  });

  // ============================================================
  // 3) PREVIEW (ghost) + HIGHLIGHT
  // ============================================================
  function ensurePreview() {
    if (!enabled || mode !== "place") {
      if (preview) preview.visible = false;
      return;
    }

    // același tip -> doar arătăm
    if (preview && preview.userData.__type === currentType) {
      preview.visible = true;
      return;
    }

    // alt tip -> înlocuim
    if (preview) {
      worldGroup.remove(preview);
      preview = null;
    }

    const m = createMeshFor(currentType);
    if (!m) return;

    // ghost material
    m.traverse((child) => {
      if (!child.isMesh) return;
      child.material = child.material.clone();
      child.material.transparent = true;
      child.material.opacity = 0.45;
      child.material.depthWrite = false;
    });

    m.userData.__type = currentType;
    m.userData.__isPreview = true;
    m.rotation.y = rotY;

    worldGroup.add(m);
    preview = m;
  }

  function setPreviewAtPoint(point) {
    if (!preview) return;
    preview.position.set(
      snap(point.x),
      point.y + 0.05,
      snap(point.z)
    );
    preview.rotation.y = rotY;
  }

  function clearHighlightAll() {
    idToMesh.forEach((m) => {
      m.traverse((c) => {
        if (c.isMesh && c.material?.userData?.__origEmissive) {
          c.material.emissive?.copy(c.material.userData.__origEmissive);
        }
      });
    });
  }

  function highlightSelection() {
    clearHighlightAll();
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
      c.material.emissive.setHex(0x22c55e); // verde
    });
  }

  // ============================================================
  // 4) RAYCAST HELPERS (GROUND / PROPS)
  // ============================================================
  function getGroundHitFromCamera(cam, maxDist = 250) {
    if (!cam || !groundMesh) return null;
    cam.getWorldPosition(camPos);
    cam.getWorldDirection(camDir);
    raycaster.set(camPos, camDir);
    raycaster.far = maxDist;

    const hits = raycaster.intersectObject(groundMesh, true);
    return hits?.[0] || null;
  }

  function getPropHitFromCamera(cam, maxDist = 250) {
    if (!cam) return null;
    cam.getWorldPosition(camPos);
    cam.getWorldDirection(camDir);
    raycaster.set(camPos, camDir);
    raycaster.far = maxDist;

    // ignoră preview-ul
    const targets = worldGroup.children.filter((o) => !o.userData?.__isPreview);
    const hits = raycaster.intersectObjects(targets, true);
    if (!hits.length) return null;

    let t = hits[0].object;
    while (t && !t.userData?.__propId && t.parent) t = t.parent;

    const propId = t?.userData?.__propId || null;
    if (!propId) return null;

    return { propId, object: t };
  }

  function getGroundHitFromPointer(clientX, clientY) {
    if (!domElement || !groundMesh) return null;

    const rect = domElement.getBoundingClientRect();
    mouseNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouseNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouseNdc, camera);
    const hits = raycaster.intersectObject(groundMesh, true);
    return hits?.[0] || null;
  }

  function getPropHitFromPointer(clientX, clientY) {
    if (!domElement) return null;

    const rect = domElement.getBoundingClientRect();
    mouseNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouseNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouseNdc, camera);

    const targets = worldGroup.children.filter((o) => !o.userData?.__isPreview);
    const hits = raycaster.intersectObjects(targets, true);
    if (!hits.length) return null;

    let t = hits[0].object;
    while (t && !t.userData?.__propId && t.parent) t = t.parent;

    const propId = t?.userData?.__propId || null;
    if (!propId) return null;

    return { propId, object: t };
  }

  // ============================================================
  // 5) MUTATORS (PLACE / REMOVE / SELECT)
  // ============================================================
  function placeAtPoint(point) {
    const x = snap(point.x);
    const z = snap(point.z);
    const y = point.y + 0.05;

    const mesh = createMeshFor(currentType);
    if (!mesh) return;

    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    worldGroup.add(mesh);

    const item = addProp({
      type: currentType,
      pos: [x, y, z],
      rotY,
      scale: [1, 1, 1],
      params: {},
    });

    mesh.userData.__propId = item.id;
    idToMesh.set(item.id, mesh);

    selectedId = item.id;
    highlightSelection();
  }

  function removeById(id) {
    const mesh = idToMesh.get(id);
    if (mesh) {
      worldGroup.remove(mesh);
      idToMesh.delete(id);
    }
    removeProp(id);

    if (selectedId === id) selectedId = null;
    highlightSelection();
  }

  function selectById(id) {
    selectedId = id || null;
    highlightSelection();
  }

  // ============================================================
  // 6) ACTION PRIMARY (Minecraft E / Select button)
  // ============================================================
  function actionPrimaryFromCamera(cam) {
    if (!enabled) return;
    if (!cooldownOk()) return;

    if (mode === "place") {
      const hit = getGroundHitFromCamera(cam, 250);
      if (!hit) return;

      ensurePreview();
      lastGroundPoint = hit.point.clone();
      if (preview) setPreviewAtPoint(lastGroundPoint);

      placeAtPoint(hit.point);
      return;
    }

    if (mode === "select") {
      const hit = getPropHitFromCamera(cam, 250);
      if (!hit) {
        selectById(null);
        return;
      }
      selectById(hit.propId);
      return;
    }

    if (mode === "remove") {
      const hit = getPropHitFromCamera(cam, 250);
      if (!hit) return;
      removeById(hit.propId);
      return;
    }
  }

  function actionPrimaryFromPointer(clientX, clientY) {
    if (!enabled) return;
    if (!cooldownOk()) return;

    if (mode === "place") {
      const hit = getGroundHitFromPointer(clientX, clientY);
      if (!hit) return;

      ensurePreview();
      lastGroundPoint = hit.point.clone();
      if (preview) setPreviewAtPoint(lastGroundPoint);

      placeAtPoint(hit.point);
      return;
    }

    if (mode === "select") {
      const hit = getPropHitFromPointer(clientX, clientY);
      if (!hit) {
        selectById(null);
        return;
      }
      selectById(hit.propId);
      return;
    }

    if (mode === "remove") {
      const hit = getPropHitFromPointer(clientX, clientY);
      if (!hit) return;
      removeById(hit.propId);
      return;
    }
  }

  // ============================================================
  // 7) PUBLIC API (ce va folosi useDepotScene + BuildPalette)
  // ============================================================

  // --- Enable/Disable ---
  function setEnabled(v) {
    enabled = !!v;
    ensurePreview();
    if (!enabled && preview) preview.visible = false;
  }
  function getEnabled() {
    return enabled;
  }

  // --- Mode/Type ---
  function setMode(next) {
    mode = next;
    ensurePreview();
  }
  function getMode() {
    return mode;
  }
  function setType(t) {
    currentType = t;
    ensurePreview();
  }

  // --- Rotate ---
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

  // --- Move fine (nudge) ---
  function nudgeSelected(dx = 0, dz = 0, dy = 0) {
    if (!selectedId) return;
    const mesh = idToMesh.get(selectedId);
    if (!mesh) return;

    mesh.position.x = snap(mesh.position.x + dx);
    mesh.position.z = snap(mesh.position.z + dz);
    mesh.position.y = mesh.position.y + dy;

    updateProp(selectedId, {
      pos: [mesh.position.x, mesh.position.y, mesh.position.z],
    });
  }

  // --- Selectors ---
  function setSelectedId(id) {
    selectById(id);
  }
  function getSelectedId() {
    return selectedId;
  }

  // --- Mount existing props ---
  function mountExistingFromStore() {
    const props = getProps() || [];
    for (const p of props) {
      if (idToMesh.has(p.id)) continue;

      const mesh = createMeshFor(p.type);
      if (!mesh) continue;

      mesh.position.set(p.pos[0], p.pos[1], p.pos[2]);
      mesh.rotation.y = p.rotY || 0;
      mesh.userData.__propId = p.id;

      worldGroup.add(mesh);
      idToMesh.set(p.id, mesh);
    }
    highlightSelection();
  }

  // --- Clear all ---
  function clearAll() {
    clearAllProps(); // store
    idToMesh.forEach((m) => worldGroup.remove(m));
    idToMesh.clear();

    selectedId = null;
    if (preview) preview.visible = false;
  }

  // ============================================================
  // 8) COMPAT LAYER (orbit + FP bridge)
  // ============================================================

  // Orbit / mouse:
  function updatePreviewAt(clientX, clientY) {
    if (!enabled || mode !== "place") return;
    ensurePreview();
    if (!preview) return;

    const hit = getGroundHitFromPointer(clientX, clientY);
    if (!hit) return;

    lastGroundPoint = hit.point.clone();
    setPreviewAtPoint(lastGroundPoint);
  }

  function clickAt(clientX, clientY) {
    actionPrimaryFromPointer(clientX, clientY);
  }

  // FP / camera:
  function updatePreviewFromCamera(cam) {
    if (!enabled || mode !== "place") return;
    ensurePreview();
    if (!preview) return;

    const hit = getGroundHitFromCamera(cam, 250);
    if (!hit) return;

    lastGroundPoint = hit.point.clone();
    setPreviewAtPoint(lastGroundPoint);
  }

  function clickFromCamera(cam) {
    actionPrimaryFromCamera(cam);
  }

  // (Optional) tick helper dacă vrei să “țină” preview-ul lipit
  function updatePreview() {
    if (!enabled || mode !== "place") return;
    if (!preview || !lastGroundPoint) return;
    setPreviewAtPoint(lastGroundPoint);
  }

  // ============================================================
  // 9) RETURN API
  // ============================================================
  return {
    // state
    setEnabled,
    getEnabled,
    setMode,
    getMode,
    setType,
    rotateStep,

    // primary action (Minecraft)
    actionPrimary: () => actionPrimaryFromCamera(camera),

    // orbit/touch
    updatePreviewAt,
    clickAt,

    // FP bridge (explicit)
    updatePreviewFromCamera,
    clickFromCamera,

    // selection + move
    setSelectedId,
    getSelectedId,
    nudgeSelected,

    // scene/store
    mountExistingFromStore,
    clearAll,

    // optional
    updatePreview,
    dispose: () => unsubStore?.(),
  };
}
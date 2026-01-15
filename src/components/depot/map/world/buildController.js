// src/components/depot/map/world/buildController.js
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
  worldGroup,
  groundMesh,
  grid = 1,
}) {
  // ---------------- STATE ----------------
  let enabled = false;              // Build Master Switch
  let mode = "place";               // place | select | remove
  let currentType = "road.segment"; // prop type
  let preview = null;
  let rotY = 0;

  let selectedId = null;
  const idToMesh = new Map();

  // FP raycast settings
  const raycaster = new THREE.Raycaster();
  const camDir = new THREE.Vector3();
  const camPos = new THREE.Vector3();

  // anti double tap
  let lastActionTs = 0;
  const ACTION_COOLDOWN = 160;

  const snap = (v) => Math.round(v / grid) * grid;

  // ---------------- STORE SYNC ----------------
  const unsubStore = subscribe((s) => {
    // dacă store gol -> curăță scena
    if (!s.props || s.props.length === 0) {
      idToMesh.forEach((m) => worldGroup.remove(m));
      idToMesh.clear();
      selectedId = null;
      if (preview) preview.visible = false;
    }
  });

  // ---------------- HELPERS ----------------
  function ensurePreview() {
    if (!enabled || mode !== "place") {
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

    // ghost
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

  function highlightSelection() {
    // reset emissive
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
      if (!c.isMesh) return;
      if (!c.material.userData) c.material.userData = {};
      if (!c.material.userData.__origEmissive) {
        const base = c.material.emissive || new THREE.Color(0x000000);
        c.material.userData.__origEmissive = base.clone
          ? base.clone()
          : new THREE.Color(0x000000);
      }
      if (!c.material.emissive) c.material.emissive = new THREE.Color(0x000000);
      c.material.emissive.setHex(0x22c55e);
    });
  }

  // Ray din cameră spre ground
  function getGroundHitFromCamera(maxDist = 200) {
    camera.getWorldPosition(camPos);
    camera.getWorldDirection(camDir);
    raycaster.set(camPos, camDir);
    raycaster.far = maxDist;
    const hits = raycaster.intersectObject(groundMesh, true);
    return hits?.[0] || null;
  }

  // Ray din cameră spre props (select/remove)
  function getPropHitFromCamera(maxDist = 200) {
    camera.getWorldPosition(camPos);
    camera.getWorldDirection(camDir);
    raycaster.set(camPos, camDir);
    raycaster.far = maxDist;

    // ignoră preview
    const targets = worldGroup.children.filter((o) => !o.userData?.__isPreview);
    const hits = raycaster.intersectObjects(targets, true);
    if (!hits.length) return null;

    let target = hits[0].object;
    while (target && !target.userData?.__propId && target.parent) target = target.parent;

    const propId = target?.userData?.__propId || null;
    if (!propId) return null;

    return { propId, object: target };
  }

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

  // ---------------- CORE ACTION (Minecraft “SELECT”) ----------------
  function actionPrimary() {
    const now = performance?.now?.() ?? Date.now();
    if (now - lastActionTs < ACTION_COOLDOWN) return;
    lastActionTs = now;

    if (!enabled) return;

    if (mode === "place") {
      const hit = getGroundHitFromCamera(250);
      if (!hit) return;
      ensurePreview();
      if (preview) {
        // ține preview lipit de sol
        preview.position.set(snap(hit.point.x), hit.point.y + 0.05, snap(hit.point.z));
        preview.rotation.y = rotY;
      }
      placeAtPoint(hit.point);
      return;
    }

    if (mode === "select") {
      const hit = getPropHitFromCamera(250);
      if (!hit) {
        selectedId = null;
        highlightSelection();
        return;
      }
      selectedId = hit.propId;
      highlightSelection();
      return;
    }

    if (mode === "remove") {
      const hit = getPropHitFromCamera(250);
      if (!hit) return;
      removeById(hit.propId);
      return;
    }
  }

  // ---------------- PUBLIC CONTROLS ----------------
  function setEnabled(v) {
    enabled = !!v;
    ensurePreview();
    if (!enabled) {
      if (preview) preview.visible = false;
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

  // Nudge (pentru “mutări fine”)
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

  function setSelectedId(id) {
    selectedId = id || null;
    highlightSelection();
  }

  function getSelectedId() {
    return selectedId;
  }

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

  function clearAll() {
    // store + scene
    clearAllProps();
    idToMesh.forEach((m) => worldGroup.remove(m));
    idToMesh.clear();
    selectedId = null;
    if (preview) preview.visible = false;
  }

  return {
    // state
    setEnabled,
    setMode,
    setType,
    rotateStep,

    // minecraft action
    actionPrimary,

    // selection + move
    setSelectedId,
    getSelectedId,
    nudgeSelected,

    // scene/store sync
    mountExistingFromStore,
    clearAll,

    // optional cleanup
    dispose: () => unsubStore?.(),
  };
}
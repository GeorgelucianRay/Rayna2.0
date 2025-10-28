// buildController.js – fără JSX, ASCII quotes only
import * as THREE from 'three';
import { createMeshFor } from './propRegistry';
import { addProp, removeProp, getProps, updateProp } from './worldStore';

export default function createBuildController({
  camera,
  domElement,
  worldGroup,
  groundMesh,
  grid = 1,
}) {
  let mode = 'place';
  let currentType = 'road.segment';
  let preview = null;
  let rotY = 0;
  let lastHit = null;
  const idToMesh = new Map();
  let selectedId = null;

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const snap = (v) => Math.round(v / grid) * grid;

  function getGroundHit(clientX, clientY) {
    const rect = domElement.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObject(groundMesh, true);
    return hits?.[0] || null;
  }

  function highlightSelection() {
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
          const base = c.material.emissive || new THREE.Color(0x000000);
          c.material.userData.__origEmissive = base.clone ? base.clone() : new THREE.Color(0x000000);
        }
        if (!c.material.emissive) c.material.emissive = new THREE.Color(0x000000);
        c.material.emissive.setHex(0x22c55e);
      }
    });
  }

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
    m.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        child.material.transparent = true;
        child.material.opacity = 0.5;
        child.material.depthWrite = false;
      }
    });
    m.userData.__type = currentType;
    m.userData.__isPreview = true;
    m.rotation.y = rotY;
    worldGroup.add(m);
    preview = m;
  }

  function updatePreviewAt(clientX, clientY) {
    if (mode !== 'place') return;
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
    if (mode === 'place' && preview && lastHit) {
      const x = snap(lastHit.x);
      const z = snap(lastHit.z);
      const y = lastHit.y + 0.05;
      preview.position.set(x, y, z);
    }
  }

  function _removeByRay(clientX, clientY) {
    const rect = domElement.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const valid = worldGroup.children.filter(o => !o.userData?.__isPreview);
    const hits = raycaster.intersectObjects(valid, true);
    if (!hits.length) return;
    let target = hits[0].object;
    while (target && !target.userData?.__propId && target.parent) target = target.parent;
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
  }

  function clickAt(clientX, clientY) {
    if (mode === 'remove') {
      _removeByRay(clientX, clientY);
      return;
    }
    if (mode === 'place') {
      placeNow();
    }
  }

  function placeNow() {
    if (mode !== 'place') return;
    ensurePreview();
    if (!preview) return;
    if (!lastHit) return;
    const x = snap(lastHit.x);
    const z = snap(lastHit.z);
    const y = lastHit.y + 0.05;
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

  function setMode(next) { mode = next; ensurePreview(); }
  function setType(t) { currentType = t; ensurePreview(); }
  function setSelectedId(id) { selectedId = id || null; highlightSelection(); }
  function getSelectedId() { return selectedId; }

  function nudgeSelected(dx = 0, dz = 0) {
    if (!selectedId) return;
    const mesh = idToMesh.get(selectedId);
    if (!mesh) return;
    mesh.position.x = snap(mesh.position.x + dx);
    mesh.position.z = snap(mesh.position.z + dz);
    updateProp(selectedId, { pos: [mesh.position.x, mesh.position.y, mesh.position.z] });
  }

  function mountExistingFromStore() {
    const props = getProps();
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

  function removeFromScene(id) {
    const mesh = idToMesh.get(id);
    if (mesh) {
      worldGroup.remove(mesh);
      idToMesh.delete(id);
      if (selectedId === id) selectedId = null;
      highlightSelection();
    }
  }

  function armPlace() {
    // păstrat doar pentru compatibilitate — nu e necesar cu clickAt direct
  }

  return {
    setMode,
    setType,
    rotateStep,
    armPlace,
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
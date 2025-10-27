// src/components/depot/map/world/buildController.js
import * as THREE from 'three';
import { createMeshFor, ROT_STEP } from './propRegistry.js';
import { addProp, removeProp } from './worldStore.js';

/**
 * Controller simplu pentru modul Build:
 *  - raycast pe groundMesh
 *  - snap la grid
 *  - preview "fantomă"
 *  - place/remove + rotație în pași de 90°
 */
export default function createBuildController({
  camera,
  domElement,
  worldGroup,
  groundMesh,
  grid = 1,
}) {
  if (!camera || !domElement || !worldGroup || !groundMesh) {
    console.warn('[buildController] Missing params (camera/domElement/worldGroup/groundMesh)');
  }

  // ----- state -----
  let mode = 'place';          // 'place' | 'remove'
  let type = 'road.segment';   // cheie din PROP_TYPES
  let rotY = 0;

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const lastPointer = { x: null, y: null };

  // preview
  let preview = null;

  function ensurePreview() {
    if (preview && preview.userData.__type === type) return preview;
    // șterge vechiul preview
    if (preview) {
      worldGroup.remove(preview);
      preview.traverse(o => o.geometry?.dispose?.());
      preview = null;
    }
    // creează noul
    preview = createMeshFor(type);
    preview.userData.__preview = true;
    preview.userData.__type = type;
    preview.renderOrder = 1;
    // material "ghosty" (unde se poate)
    preview.traverse(o => {
      if (o.isMesh) {
        const m = o.material;
        if (m && !Array.isArray(m)) {
          o.userData.__orig = {
            transparent: m.transparent,
            opacity: m.opacity,
            depthWrite: m.depthWrite,
          };
          m.transparent = true;
          m.opacity = 0.5;
          m.depthWrite = false;
        }
      }
    });
    worldGroup.add(preview);
    return preview;
  }

  function disposePreview() {
    if (!preview) return;
    preview.traverse(o => {
      const m = o.material;
      if (m && o.userData.__orig && !Array.isArray(m)) {
        m.transparent = o.userData.__orig.transparent;
        m.opacity = o.userData.__orig.opacity;
        m.depthWrite = o.userData.__orig.depthWrite;
      }
    });
    worldGroup.remove(preview);
    preview = null;
  }

  // utilitare
  function setFromClient(x, y) {
    const r = domElement.getBoundingClientRect();
    ndc.x = ((x - r.left) / r.width) * 2 - 1;
    ndc.y = -((y - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
  }

  function snap(v) {
    if (!isFinite(grid) || grid <= 0) return v;
    v.x = Math.round(v.x / grid) * grid;
    v.z = Math.round(v.z / grid) * grid;
    return v;
  }

  function intersectGround(x, y) {
    setFromClient(x, y);
    const hits = raycaster.intersectObject(groundMesh, true);
    return hits[0] || null;
  }

  function intersectPlaced(x, y) {
    setFromClient(x, y);
    const hits = raycaster.intersectObject(worldGroup, true);
    // filtrăm preview-ul
    return hits.find(h => !h.object.userData.__preview) || null;
  }

  // ----- API public -----
  function setMode(newMode) {
    mode = newMode === 'remove' ? 'remove' : 'place';
    if (mode === 'remove') {
      disposePreview();
    } else if (lastPointer.x != null) {
      updatePreviewAt(lastPointer.x, lastPointer.y);
    }
  }

  function setTypeKey(k) {
    type = k;
    if (mode === 'place') {
      ensurePreview();
      if (lastPointer.x != null) updatePreviewAt(lastPointer.x, lastPointer.y);
    }
  }

  function rotateStep(dir = 1) {
    rotY += (dir >= 0 ? +1 : -1) * ROT_STEP;
    if (preview) preview.rotation.y = rotY;
  }

  function updatePreviewAt(x, y) {
    if (mode !== 'place') return;
    lastPointer.x = x; lastPointer.y = y;

    const hit = intersectGround(x, y);
    if (!hit) return;

    const p = snap(hit.point.clone());
    const ghost = ensurePreview();
    ghost.position.set(p.x, p.y, p.z);
    ghost.rotation.set(0, rotY, 0);
  }

  function updatePreview() {
    if (lastPointer.x == null || mode !== 'place') return;
    updatePreviewAt(lastPointer.x, lastPointer.y);
  }

  function clickAt(x, y) {
    if (mode === 'place') {
      const hit = intersectGround(x, y);
      if (!hit) return;

      const pos = snap(hit.point.clone());
      const obj = createMeshFor(type);
      obj.position.set(pos.x, pos.y, pos.z);
      obj.rotation.set(0, rotY, 0);
      worldGroup.add(obj);

      // înregistrăm în store
      const id = addProp({
        type,
        pos: [obj.position.x, obj.position.y, obj.position.z],
        rotY: obj.rotation.y,
      });
      obj.userData.propId = id;

      // repoziționează preview-ul imediat (efect "continuu")
      updatePreviewAt(x, y);
    } else {
      // remove
      const hit = intersectPlaced(x, y);
      if (!hit) return;
      const target = hit.object;
      const root = target; // plasăm direct pe mesh; dacă ai grupuri, urcă din parent până găsești propId
      const id = root.userData.propId;
      if (id) {
        removeProp(id);
      }
      // elimină din scenă
      (root.parent || worldGroup).remove(root);
      root.traverse(o => o.geometry?.dispose?.());
    }
  }

  function enable() {/* lăsat pentru compatibilitate */}
  function disable() { disposePreview(); }

  return {
    setMode,
    setType: setTypeKey,
    rotateStep,
    updatePreviewAt,
    updatePreview,
    clickAt,
    enable,
    disable,
  };
}
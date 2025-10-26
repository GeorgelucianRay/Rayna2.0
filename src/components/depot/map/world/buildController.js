// src/components/depot/map/world/buildController.js
import * as THREE from 'three';
import { createMeshFor } from './propRegistry';
import { addProp, removeProp } from './worldStore';

export default function createBuildController({
  camera,
  domElement,
  worldGroup,
  groundMesh,      // ideal: chiar mesh-ul planului de asfalt (nu un Group)
  grid = 1
}) {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  let mode = 'place';           // 'place' | 'remove'
  let currentType = 'road.segment';
  let rotY = 0;

  let preview = null;

  const snap = (v) => Math.round(v / grid) * grid;

  function setType(t) {
    currentType = t;
    if (preview) { worldGroup.remove(preview); preview = null; }
  }

  function setMode(m) { mode = m; }

  function rotateStep(dir = 1) {
    rotY = (rotY + dir * Math.PI * 0.5) % (Math.PI * 2);
    if (preview) preview.rotation.y = rotY;
  }

  function ndcFromClient(clientX, clientY) {
    // !!! FOLOSEȘTE RECT-UL CANVAS-ULUI
    const rect = domElement.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  function raycast(clientX, clientY) {
    ndcFromClient(clientX, clientY);
    raycaster.setFromCamera(mouse, camera);
    // recursive = true ca să intre în copii din worldGroup/ground
    const roots = [worldGroup];
    if (groundMesh) roots.push(groundMesh);
    const hits = raycaster.intersectObjects(roots, true);
    return hits;
  }

  function ensurePreview() {
    if (preview) return preview;
    const m = createMeshFor(currentType, {});
    if (!m) return null;

    // Încearcă să “semi-transparențezi” materialul indiferent de tip
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    mats.forEach((mat) => {
      if (!mat) return;
      if (mat.clone) {
        const c = mat.clone();
        c.transparent = true;
        c.opacity = 0.5;
        m.material = Array.isArray(m.material) ? [...mats] : c;
      } else {
        // fallback simplu
        m.material = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.5 });
      }
    });

    m.userData.__preview = true;
    worldGroup.add(m);
    preview = m;
    return preview;
  }

  function updatePreviewAt(clientX, clientY) {
    if (!currentType) return;
    const hits = raycast(clientX, clientY);
    if (!hits.length) return;

    const hit = hits[0];
    const p = hit.point;
    const pos = new THREE.Vector3(snap(p.x), snap(p.y), snap(p.z));

    const g = ensurePreview();
    if (!g) return;

    g.position.copy(pos);
    g.rotation.y = rotY;
  }

  function clickAt(clientX, clientY) {
    const hits = raycast(clientX, clientY);
    if (!hits.length) return;

    const hit = hits[0];

    if (mode === 'remove') {
      // urcă până la copil direct al worldGroup
      let o = hit.object;
      while (o && o.parent && o.parent !== worldGroup) o = o.parent;
      if (o && o.parent === worldGroup && !o.userData.__preview && o.userData.__propId) {
        const id = o.userData.__propId;
        removeProp(id);
        worldGroup.remove(o);
      }
      return;
    }

    // place
    const p = hit.point;
    const pos = [snap(p.x), snap(p.y), snap(p.z)];
    const added = addProp({ type: currentType, pos, rotY, scale: [1,1,1], params: {} });

    const mesh = createMeshFor(currentType, {});
    mesh.position.set(...pos);
    mesh.rotation.y = rotY;
    mesh.userData.__propId = added.id;
    worldGroup.add(mesh);
  }

  return {
    setType,
    setMode,
    rotateStep,
    updatePreviewAt,
    clickAt,
  };
}
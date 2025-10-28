import * as THREE from 'three';
import { createMeshFor } from './propRegistry';
import { addProp, removeProp, getProps, getPropById, updateProp } from './worldStore';

export default function createBuildController({
  camera,
  domElement,
  worldGroup,
  groundMesh,
  grid = 1,
}) {
  // --- state intern ---
  let mode = 'place';                 // 'place' | 'remove'
  let currentType = 'road.segment';   // tipul curent ales în UI
  let preview = null;                 // mesh fantomă
  let rotY = 0;                       // rotația curentă a preview-ului
  let lastHit = null;                 // ultima poziție de intersecție pe sol (vec3)
  let selectedId = null;              // id-ul prop-ului selectat (din store)
  const idToMesh = new Map();         // map id -> mesh

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  // util: snap pe grilă
  const snap = (v) => Math.round(v / grid) * grid;

  // intersecție cu ground de la coordonate ecran
  function getGroundHit(clientX, clientY) {
    const rect = domElement.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObject(groundMesh, true);
    return hits?.[0] || null;
  }

  // highlight simplu la selecție (schimbă ușor materialul)
  function setHighlighted(mesh, on) {
    mesh.traverse(child => {
      if (!child.isMesh) return;
      if (on) {
        if (!child.userData.__origMat) child.userData.__origMat = child.material;
        const mat = child.material.clone();
        if ('emissive' in mat) {
          mat.emissive = new THREE.Color(0x22c55e);
          mat.emissiveIntensity = 0.35;
        } else {
          if ('color' in mat) mat.color = new THREE.Color(0x22c55e);
        }
        child.material = mat;
      } else {
        if (child.userData.__origMat) {
          child.material = child.userData.__origMat;
          child.userData.__origMat = null;
        }
      }
    });
  }

  function clearSelection() {
    if (!selectedId) return;
    const m = idToMesh.get(selectedId);
    if (m) setHighlighted(m, false);
    selectedId = null;
  }

  function setSelectedId(id) {
    if (selectedId === id) return;
    clearSelection();
    const m = idToMesh.get(id);
    if (m) {
      selectedId = id;
      setHighlighted(m, true);
    } else {
      selectedId = null;
    }
  }

  function getSelectedId() {
    return selectedId;
  }

  // creează/actualizează mesh-ul de preview
  function ensurePreview() {
    if (mode !== 'place') { // ascundem preview când nu suntem în place
      if (preview) preview.visible = false;
      return;
    }
    if (preview && preview.userData.__type === currentType) {
      preview.visible = true;
      return;
    }
    if (preview) {
      worldGroup.remove(preview);
      preview.geometry?.dispose?.();
    }
    const m = createMeshFor(currentType);
    if (!m) return;
    // stil “fantomă”
    m.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        if ('transparent' in child.material) child.material.transparent = true;
        if ('opacity' in child.material) child.material.opacity = 0.5;
        if ('depthWrite' in child.material) child.material.depthWrite = false;
      }
    });
    m.userData.__type = currentType;
    m.rotation.y = rotY;
    worldGroup.add(m);
    preview = m;
  }

  // repoziționare preview la coordonate ecran
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
    // lăsat gol pentru extensii/animații
  }

  // reconstruiește scena din store (la init)
  function rebuildFromStore() {
    // curăță tot ce știm că e prop (nu atinge alte grupuri)
    for (const [id, mesh] of idToMesh.entries()) {
      worldGroup.remove(mesh);
    }
    idToMesh.clear();
    clearSelection();

    const items = getProps() || [];
    for (const it of items) {
      const mesh = createMeshFor(it.type);
      if (!mesh) continue;
      mesh.position.set(it.pos[0], it.pos[1], it.pos[2]);
      mesh.rotation.y = it.rotY || 0;
      mesh.userData.__propId = it.id;
      idToMesh.set(it.id, mesh);
      worldGroup.add(mesh);
    }
  }

  // plasare / ștergere
  function clickAt(clientX, clientY) {
    const rect = domElement.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    if (mode === 'place') {
      // dacă dăm click fără pointermove, calculăm acum hit-ul
      if (!lastHit) {
        const hit = getGroundHit(clientX, clientY);
        if (!hit) return;
        lastHit = hit.point;
      }
      ensurePreview();
      if (!preview || !lastHit) return;

      const x = snap(lastHit.x);
      const z = snap(lastHit.z);

      // creează mesh “real”
      const mesh = createMeshFor(currentType);
      if (!mesh) return;
      mesh.position.set(x, 0, z);
      mesh.rotation.y = rotY;

      // salvează în store și pune id
      const item = addProp({
        type: currentType,
        pos: [x, 0, z],
        rotY,
        scale: [1, 1, 1],
        params: {},
      });
      mesh.userData.__propId = item.id;

      // atașează în scenă și map
      worldGroup.add(mesh);
      idToMesh.set(item.id, mesh);

      // selectăm automat ce-am pus
      setSelectedId(item.id);

    } else if (mode === 'remove') {
      // hit pe obiecte din worldGroup
      const hits = raycaster.intersectObjects(worldGroup.children, true);
      if (!hits.length) return;

      // găsește mesh-ul cu __propId
      let target = hits[0].object;
      while (target && !target.userData?.__propId && target.parent) target = target.parent;
      const propId = target?.userData?.__propId;
      if (!propId) return;

      // deselect dacă e selectat
      if (selectedId === propId) clearSelection();

      // elimină din scenă + map + store
      const m = idToMesh.get(propId);
      if (m) {
        setHighlighted(m, false);
        worldGroup.remove(m);
        idToMesh.delete(propId);
      }
      removeProp(propId);
    }
  }

  function rotateStep(dir = 1) {
    rotY += dir * (Math.PI / 2);
    if (preview) preview.rotation.y = rotY;
  }

  function setMode(next) {
    mode = next;
    // ascunde/arată preview după mod
    if (mode !== 'place' && preview) preview.visible = false;
    if (mode === 'place' && preview) preview.visible = true;
  }

  function setType(t) {
    currentType = t;
    ensurePreview();
  }

  // mișcă în pași (săgeți) obiectul selectat
  function nudgeSelected(dx = 0, dz = 0) {
    if (!selectedId) return;
    const mesh = idToMesh.get(selectedId);
    if (!mesh) return;
    const nx = snap(mesh.position.x + dx);
    const nz = snap(mesh.position.z + dz);
    mesh.position.set(nx, 0, nz);
    updateProp(selectedId, { pos: [nx, 0, nz] });
  }

  function rotateSelected(dir = 1) {
    if (!selectedId) return;
    const mesh = idToMesh.get(selectedId);
    if (!mesh) return;
    const r = (mesh.rotation.y || 0) + dir * (Math.PI / 2);
    mesh.rotation.y = r;
    updateProp(selectedId, { rotY: r });
  }

  // INIT: reconstruiește din store
  rebuildFromStore();

  // API public
  return {
    setMode,
    setType,
    rotateStep,
    updatePreviewAt,
    clickAt,
    updatePreview,

    // selecție & control
    setSelectedId,
    getSelectedId,
    nudgeSelected,
    rotateSelected,
  };
}
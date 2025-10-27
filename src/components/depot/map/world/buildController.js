// src/components/depot/map/world/buildController.js
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
  // --- state intern ---
  let mode = 'place';                 // 'place' | 'remove'
  let currentType = 'road.segment';   // tipul curent ales în UI
  let preview = null;                 // mesh fantomă
  let rotY = 0;                       // rotația curentă a preview-ului
  let lastHit = null;                 // ultima poziție de intersecție pe sol (vec3)
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

  // creează/actualizează mesh-ul de preview
  function ensurePreview() {
    if (preview && preview.userData.__type === currentType) return;
    if (preview) {
      worldGroup.remove(preview);
      preview.geometry?.dispose?.();
      // materialul poate fi reutilizat; nu-l distrugem neapărat
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
    if (mode !== 'place') return; // doar în place arătăm fantoma
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

  // “menține” preview-ul (opțional, pentru animații)
  function updatePreview() {
    // momentan nu e nevoie să facă nimic la fiecare frame
  }

  // plasare / ștergere
  function clickAt(clientX, clientY) {
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
      worldGroup.add(mesh);

      // salvează în store
      const item = addProp({
        type: currentType,
        pos: [x, 0, z],
        rotY,
        scale: [1, 1, 1],
        params: {},
      });
      // ținem id pe mesh pentru eventual remove selectiv
      mesh.userData.__propId = item.id;

    } else if (mode === 'remove') {
      // căutăm prop în worldGroup sub cursor
      const rect = domElement.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const hits = raycaster.intersectObjects(worldGroup.children, true);
      if (!hits.length) return;

      // găsește mesh-ul cu __propId
      let target = hits[0].object;
      while (target && !target.userData?.__propId && target.parent) target = target.parent;
      const propId = target?.userData?.__propId;
      if (!propId) return;

      // elimină din scenă
      worldGroup.remove(target);
      // elimină din store
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

  // API public
  return {
    setMode,
    setType,
    rotateStep,
    updatePreviewAt,
    clickAt,
    updatePreview,
  };
}
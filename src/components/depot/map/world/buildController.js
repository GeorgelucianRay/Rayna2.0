// src/components/depot/map/world/buildController.js
import * as THREE from 'three';
import { createMeshFor } from './propRegistry';
import { addProp, removeProp } from './worldStore';

export default function createBuildController({
  camera,
  domElement,
  worldGroup,
  groundMesh,
  grid = 1
}) {
  const raycaster = new THREE.Raycaster();
  // NU MAI FOLOSIM 'mouse', vom folosi un Vector2 static
  const crosshair = new THREE.Vector2(0, 0); // (0, 0) = centrul ecranului

  let mode = 'place';
  let currentType = 'road.segment';
  let rotY = 0;
  let preview = null;

  const snap = (v) => Math.round(v / grid) * grid;

  // ===== PASUL 1: BUG-UL REZOLVAT =====
  // Adăugăm ensurePreview() la final
  function setType(t) {
    currentType = t;
    rotY = 0; // Resetăm rotația
    if (preview) { worldGroup.remove(preview); preview = null; }
    ensurePreview(); // <-- CREEAZĂ NOUA FANTOMĂ IMEDIAT
  }

  function setMode(m) { mode = m; }

  function rotateStep(dir = 1) {
    rotY = (rotY + dir * Math.PI * 0.5) % (Math.PI * 2);
    if (preview) preview.rotation.y = rotY;
  }

  // ===== PASUL 2: LOGICA DE ȚINTIRE (Raycasting) =====
  
  // NU mai folosim clientX/clientY
  function raycastFromCenter() {
    raycaster.setFromCamera(crosshair, camera); // Țintește din centru
    const roots = [worldGroup];
    if (groundMesh) roots.push(groundMesh);
    const hits = raycaster.intersectObjects(roots, true);
    return hits;
  }

  function ensurePreview() {
    if (preview) return preview;
    const m = createMeshFor(currentType, {});
    if (!m) return null;

    [span_0](start_span)// ... (codul tău de semi-transparență este OK) ... [cite: 72-74]
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    mats.forEach((mat) => {
      if (!mat) return;
      if (mat.clone) {
        const c = mat.clone();
        c.transparent = true;
        c.opacity = 0.5;
        m.material = Array.isArray(m.material) ? [...mats] : c;
      } else {
        m.material = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.5 });
      }
    });

    m.userData.__preview = true;
    m.visible = false; // Începe ascuns
    worldGroup.add(m);
    preview = m;
    return preview;
  }

  // ===== PASUL 3: FUNCȚII NOI (fără clientX/Y) =====

  // Această funcție va fi chemată în bucla 'animate'
  function updatePreview() {
    if (mode !== 'place') {
      if (preview) preview.visible = false;
      return;
    }
    
    // Asigură-te că există o fantomă (dacă nu a fost creată de setType)
    const g = ensurePreview();
    if (!g) return;

    const hits = raycastFromCenter();
    if (!hits.length) {
      g.visible = false; // Ascunde dacă nu țintim nimic
      return;
    }

    const hit = hits[0];
    const p = hit.point;
    const pos = new THREE.Vector3(snap(p.x), snap(p.y), snap(p.z));

    g.position.copy(pos);
    g.rotation.y = rotY;
    g.visible = true;
  }

  // Această funcție va fi chemată la click
  function placeOrRemoveObject() {
    const hits = raycastFromCenter();
    if (!hits.length) return;

    const hit = hits[0];

    if (mode === 'remove') {
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
    if (mode === 'place' && preview && preview.visible) {
      // Folosim poziția fantomei
      const pos = [preview.position.x, preview.position.y, preview.position.z];
      const added = addProp({ type: currentType, pos, rotY, scale: [1,1,1], params: {} });

      const mesh = createMeshFor(currentType, {});
      mesh.position.set(...pos);
      mesh.rotation.y = rotY;
      mesh.userData.__propId = added.id;
      worldGroup.add(mesh);
    }
  }

  return {
    setType,
    setMode,
    rotateStep,
    updatePreview,      // <-- Nume nou
    placeOrRemoveObject, // <-- Nume nou
  };
}

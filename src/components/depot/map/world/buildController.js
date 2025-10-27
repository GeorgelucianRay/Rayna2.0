import * as THREE from 'three';
import { createMeshFor } from './propRegistry';
import { addProp, removeProp } from './worldStore';

export default function createBuildController({
  camera,
  domElement,
  worldGroup,
  groundMesh,      // ideal: mesh-ul plăcii de asfalt
  grid = 1
}) {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  let mode = 'place';                 // 'place' | 'remove'
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
    const rect = domElement.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  function raycast(clientX, clientY) {
    ndcFromClient(clientX, clientY);
    raycaster.setFromCamera(mouse, camera);
    const roots = [worldGroup];
    if (groundMesh) roots.push(groundMesh);
    return raycaster.intersectObjects(roots, true);
  }

  function ensurePreview() {
    if (preview) return preview;
    const m = createMeshFor(currentType, {});
    if (!m) return null;

    // fă-l semitransparent (indiferent de material)
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    const cloned = mats.map(mat => {
      const c = mat?.clone ? mat.clone() : new THREE.MeshBasicMaterial({ color: 0x00ffff });
      c.transparent = true; c.opacity = 0.5;
      return c;
    });
    m.material = Array.isArray(m.material) ? cloned : cloned[0];

    m.userData.__preview = true;
    worldGroup.add(m);
    preview = m;
    return preview;
  }

  // === preview “la mișcare” (din pointermove)
  function updatePreviewAt(clientX, clientY) {
    if (!currentType) return;
    const hits = raycast(clientX, clientY);
    if (!hits.length) return;
    const hit = hits[0];
    const p = hit.point;
    const pos = new THREE.Vector3(snap(p.x), snap(p.y + 0.02), snap(p.z));

    const g = ensurePreview();
    if (!g) return;

    g.position.copy(pos);
    g.rotation.y = rotY;
  }

  // === preview “keep alive” (chemat în animate)
  function updatePreview() {
    if (!preview || !groundMesh) return;
    // Tragem o rază din centrul ecranului ca fallback (sau poți stoca ultimul mouse)
    mouse.set(0, 0);
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObject(groundMesh, true);
    if (!hits.length) return;
    const p = hits[0].point;
    const pos = new THREE.Vector3(snap(p.x), snap(p.y + 0.02), snap(p.z));
    preview.position.copy(pos);
    preview.rotation.y = rotY;
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
    updatePreview,
    clickAt,
  };
}
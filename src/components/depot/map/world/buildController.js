// world/buildController.js
import * as THREE from 'three';
import { createMeshFor } from './propRegistry';
import { addProp, removeProp } from './worldStore';

export function createBuildController({ camera, domElement, worldGroup, groundMesh, grid=1 }) {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  let mode = 'place';         // 'place' | 'remove'
  let currentType = 'road.segment';
  let rotY = 0;

  let preview = null;
  function setType(t) {
    currentType = t;
    if (preview) { worldGroup.remove(preview); preview = null; }
  }
  function setMode(m) { mode = m; }
  function rotateStep(dir=1) { rotY = (rotY + dir * Math.PI/2) % (Math.PI*2); if (preview) preview.rotation.y = rotY; }

  function snap(v) { return Math.round(v / grid) * grid; }

  function updatePreview(clientX, clientY) {
    if (!currentType) return;
    mouse.x = (clientX / domElement.clientWidth) * 2 - 1;
    mouse.y = -(clientY / domElement.clientHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const hits = raycaster.intersectObjects([groundMesh, worldGroup], true);
    if (!hits.length) return;

    const hit = hits[0];
    const p = hit.point;
    const target = new THREE.Vector3(snap(p.x), snap(p.y), snap(p.z));

    if (!preview) {
      preview = createMeshFor(currentType, {});
      if (!preview) return;
      preview.material = preview.material.clone();
      preview.material.transparent = true;
      preview.material.opacity = 0.5;
      preview.userData.__preview = true;
      worldGroup.add(preview);
    }
    preview.position.copy(target);
    preview.rotation.y = rotY;
  }

  function click(clientX, clientY) {
    mouse.x = (clientX / domElement.clientWidth) * 2 - 1;
    mouse.y = -(clientY / domElement.clientHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects([groundMesh, worldGroup], true);
    if (!hits.length) return;

    const hit = hits[0];
    if (mode === 'remove') {
      // găsim mesh editabil din worldGroup
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
    const added = addProp({ type: currentType, pos, rotY, scale:[1,1,1], params:{} });
    const mesh = createMeshFor(currentType, {});
    mesh.position.set(...pos);
    mesh.rotation.y = rotY;
    mesh.userData.__propId = added.id;
    worldGroup.add(mesh);
  }

  // bindere simple pentru mouse/touch — le apelezi din Map3DPage
  return {
    setType, setMode, rotateStep,
    updatePreviewAt: updatePreview,
    clickAt: click,
  };
}
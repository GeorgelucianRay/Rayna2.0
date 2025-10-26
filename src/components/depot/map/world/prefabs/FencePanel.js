// src/components/depot/map/world/prefabs/FencePanel.js
import * as THREE from 'three';

export function makeFencePanel({ L=2, H=1.6 } = {}) {
  const g = new THREE.Group();

  // stâlpi
  const postGeo = new THREE.CylinderGeometry(0.05, 0.05, H, 12);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x3e454d, roughness: 0.9, metalness: 0.1 });
  const p1 = new THREE.Mesh(postGeo, postMat);
  const p2 = new THREE.Mesh(postGeo, postMat);
  p1.position.set(-L/2, H/2, 0);
  p2.position.set( L/2, H/2, 0);
  g.add(p1, p2);

  // plasa (textură cu transparență)
  const tex = new THREE.TextureLoader().load('/textures/lume/gard_textura.png');
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;

  const wire = new THREE.Mesh(
    new THREE.PlaneGeometry(L, H*0.9),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
  );
  wire.position.set(0, H*0.55, 0);
  g.add(wire);

  return g;
}
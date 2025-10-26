// src/components/threeWorld/createLandscape.js
import * as THREE from 'three';
const TEX_MUNTE = '/textures/lume/munte_textura.jpg';

export default function createLandscape(cfg) {
  const W = cfg?.ground?.width ?? 90;
  const D = cfg?.ground?.depth ?? 60;
  const R = Math.max(W, D) * 6;

  const outer = new THREE.Shape();
  outer.absellipse(0, 0, R, R, 0, Math.PI * 2);

  const hole = new THREE.Path();
  hole.moveTo(-W/2 - 2, -D/2 - 2);
  hole.lineTo( W/2 + 2, -D/2 - 2);
  hole.lineTo( W/2 + 2,  D/2 + 2);
  hole.lineTo(-W/2 - 2,  D/2 + 2);
  hole.closePath();
  outer.holes.push(hole);

  const geo = new THREE.ShapeGeometry(outer, 1);

  // UV planar
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const size = new THREE.Vector2(bb.max.x - bb.min.x, bb.max.y - bb.min.y);
  const uvs = [];
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    uvs.push((x - bb.min.x) / size.x, (y - bb.min.y) / size.y);
  }
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

  const tex = new THREE.TextureLoader().load(TEX_MUNTE, t => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(6, 6);
    t.anisotropy = 4;
  });

  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0 });
  const land = new THREE.Mesh(geo, mat);
  land.rotation.x = -Math.PI / 2;
  land.position.y = -0.04;        // deasupra soil (-0.10), sub asfalt (-0.02)
  land.receiveShadow = true;

  // relief discret
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const d = Math.hypot(x, y), innerR = Math.max(W, D) / 2;
    const k = THREE.MathUtils.clamp((d - innerR) / (R - innerR), 0, 1);
    pos.setZ(i, Math.sin(k * Math.PI) * 0.6);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();

  return land;
}
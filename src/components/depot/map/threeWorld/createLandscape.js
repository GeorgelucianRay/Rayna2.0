// src/components/threeWorld/createLandscape.js
import * as THREE from 'three';

const TEX_MUNTE = '/textures/lume/munte_textura.jpg';

/**
 * Creează un „inel” de teren în jurul curții (curtea rămâne decupată).
 * @param {{ground:{width:number, depth:number}}} cfg  – pasează CFG.ground din Map3D
 */
export default function createLandscape(cfg) {
  const W = cfg?.ground?.width  ?? 90;
  const D = cfg?.ground?.depth  ?? 60;
  const R = Math.max(W, D) * 6;        // rază exterioară (mult în afara curții)

  // formă exterioară (cerc) + gaură pentru curte (dreptunghi ușor mai mare)
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

  // UV-uri planar pe XY, normalizate în [0..1]
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const size = new THREE.Vector2(bb.max.x - bb.min.x, bb.max.y - bb.min.y);
  const uvs = [];
  for (let i = 0; i < geo.attributes.position.count; i++) {
    const x = geo.attributes.position.getX(i);
    const y = geo.attributes.position.getY(i);
    uvs.push((x - bb.min.x) / size.x, (y - bb.min.y) / size.y);
  }
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

  const tex = new THREE.TextureLoader().load(TEX_MUNTE, t => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    // mai multe tile-uri pentru detaliu
    t.repeat.set(6, 6);
    t.anisotropy = 4;
  });

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.95,
    metalness: 0.0
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.061; // puțin sub asfalt
  mesh.receiveShadow = true;

  // „relief” ușor: unduim marginile (fără a atinge curtea)
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const d = Math.hypot(x, y);
    const k = THREE.MathUtils.clamp((d - Math.max(W,D)/2) / (R - Math.max(W,D)/2), 0, 1);
    const bump = Math.sin(k * Math.PI) * 0.6; // ~60cm relief
    pos.setZ(i, bump);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();

  return mesh;
}
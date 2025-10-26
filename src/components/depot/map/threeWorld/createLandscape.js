// src/components/threeWorld/createLandscape.js
import * as THREE from 'three';

function makeMountainStrip({
  width = 520, baseH = 12, peakH = 55, depth = 90, segX = 120,
  tex
}) {
  // pornim de la un "bloc" lung și modelăm doar fața de sus ca relief
  const geo = new THREE.BoxGeometry(width, baseH, depth, segX, 6, 1);

  // ondulăm doar partea superioară
  const pos = geo.getAttribute('position');
  const topY = baseH / 2;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) >= topY - 1e-3) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const n1 = Math.sin(x * 0.020) * Math.cos(x * 0.008);
      const n2 = Math.sin(z * 0.015) * 0.5;
      const offs = (n1 + n2) * peakH;
      pos.setY(i, topY + offs);
    }
  }
  geo.computeVertexNormals();

  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(width / 40, depth / 40); // tile fin

  const mat = new THREE.MeshStandardMaterial({
    map: tex, roughness: 1, metalness: 0, flatShading: true,
    depthWrite: false // nu blochează obiectele din față
  });

  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true;
  m.renderOrder = -999;       // după cer, înaintea scenei
  return m;
}

export default function createLandscape({
  texturePath = '/textures/lume/munte_textura.jpg'
} = {}) {
  const g = new THREE.Group();
  const tex = new THREE.TextureLoader().load(texturePath);
  tex.colorSpace = THREE.SRGBColorSpace;

  // spate (nord)
  const back = makeMountainStrip({ tex });
  back.position.set(0, 10, -170);
  g.add(back);

  // stânga (vest)
  const left = makeMountainStrip({ tex, width: 420, depth: 100 });
  left.rotation.y = Math.PI / 2;
  left.position.set(-260, 10, 0);
  g.add(left);

  // dreapta (est)
  const right = makeMountainStrip({ tex, width: 420, depth: 100 });
  right.rotation.y = -Math.PI / 2;
  right.position.set(260, 10, 0);
  g.add(right);

  return g;
}
// src/components/threeWorld/createGround.js
import * as THREE from 'three';

const TEX_ASPHALT = '/textures/lume/asphalt_curte_textura.PNG';

export default function createGround({ width, depth, color, abcOffsetX = 0 }) {
  const group = new THREE.Group();

  // soil doar puțin mai mare decât curtea (nu pe toată lumea)
  const soil = new THREE.Mesh(
    new THREE.PlaneGeometry(width + 6, depth + 6),
    new THREE.MeshStandardMaterial({ color: 0x78904c, roughness: 1 })
  );
  soil.rotation.x = -Math.PI / 2;
  soil.position.y = -0.10;     // MAI jos decât muntele și asfaltul
  soil.receiveShadow = true;
  group.add(soil);

  // asfalt
  const tex = new THREE.TextureLoader().load(TEX_ASPHALT, t => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(Math.max(1, width / 10), Math.max(1, depth / 10));
    t.anisotropy = 4;
  });

  const slab = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0 })
  );
  slab.rotation.x = -Math.PI / 2;
  slab.position.y = -0.02;     // deasupra soil
  slab.receiveShadow = true;
  group.add(slab);

  // ——— marcajele (două benzi + contur) ———
  const markings = new THREE.Group();

  // contur subtil
  const borderGeo = new THREE.RingGeometry(
    Math.min(width, depth) * 0.499, Math.min(width, depth) * 0.5, 4
  );
  const border = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.12, transparent: true })
  );
  border.rotation.x = -Math.PI / 2;
  border.position.y = 0.001;
  markings.add(border);

  // două benzi gri-deschis (ajustează lățimea după cum vrei)
  const laneMat = new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.18, transparent: true });
  const laneW = 4.5;
  const laneL = depth - 4;

  const lane1 = new THREE.Mesh(new THREE.PlaneGeometry(laneL, laneW), laneMat);
  const lane2 = new THREE.Mesh(new THREE.PlaneGeometry(laneL, laneW), laneMat);

  lane1.rotation.x = lane2.rotation.x = -Math.PI / 2;
  lane1.position.set(0, 0.002, - (width * 0.25));
  lane2.position.set(0, 0.002,   (width * 0.25));

  markings.add(lane1, lane2);
  group.add(markings);

  return group;
}
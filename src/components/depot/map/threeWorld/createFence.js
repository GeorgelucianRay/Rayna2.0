// src/pages/Depot/threeWorld/createFence.js
import * as THREE from 'three';

export default function createFence({
  width = 90,
  depth = 60,
  margin = 2,
  postEvery = 10,
  gate = { side: 'west', width: 10, centerZ: 0, tweakZ: 0 }
} = {}) {

  const g = new THREE.Group();

  const W = width + margin * 2;
  const D = depth + margin * 2;
  const H = 2.3;        // înălțimea plasei
  const railY = 0.1;    // grosimea șinei de sus/jos
  const postH = 2.6;

  // --- TEXTURA PLASĂ ---
  const meshTex = new THREE.TextureLoader().load('/textures/lume/gard_textura.png');
  meshTex.colorSpace = THREE.SRGBColorSpace;
  meshTex.wrapS = meshTex.wrapT = THREE.RepeatWrapping;
  meshTex.center.set(0.5, 0.5);
  // Romboidele vertical-orientate:
  meshTex.rotation = Math.PI * 0.5; // rotește 90°
  // repetarea o setăm pe fiecare segment în funcție de lungime

  const matMesh = new THREE.MeshBasicMaterial({
    map: meshTex,
    transparent: true,
    alphaTest: 0.3,    // taie zonele negre ale PNG-ului
    depthWrite: false, // previne artefacte de transparență
    side: THREE.DoubleSide
  });

  const matMetal = new THREE.MeshStandardMaterial({
    color: 0x8a8f95, metalness: 0.7, roughness: 0.45
  });

  // posturi
  const postGeo = new THREE.CylinderGeometry(0.05, 0.05, postH, 12);
  const post = new THREE.Mesh(postGeo, matMetal);
  post.position.y = postH / 2;
  post.castShadow = post.receiveShadow = true;

  // șine sus / jos
  const railGeo = new THREE.BoxGeometry(0.05, railY, 1);
  const rail = new THREE.Mesh(railGeo, matMetal);
  rail.castShadow = rail.receiveShadow = true;

  // plasă (plan subțire)
  const mkMeshPanel = (len) => {
    const geo = new THREE.PlaneGeometry(len, H, Math.max(1, Math.round(len*2)), 1);
    const m = new THREE.Mesh(geo, matMesh.clone());
    // setează repetarea în funcție de lungime (1 unitate ≈ 1m)
    m.material.map = m.material.map.clone();
    m.material.map.repeat.set(len * 0.6, H * 0.6);
    m.frustumCulled = false;
    return m;
  };

  // helper pentru fiecare latură
  function addSide(dir, len, x, z, rotY){
    // plasă
    const meshPanel = mkMeshPanel(len);
    meshPanel.position.set(x, H/2, z);
    meshPanel.rotation.y = rotY;
    g.add(meshPanel);

    // șine
    const topRail = rail.clone();
    topRail.scale.z = len;
    topRail.position.set(x, H+railY/2, z);
    topRail.rotation.y = rotY;
    g.add(topRail);

    const botRail = rail.clone();
    botRail.scale.z = len;
    botRail.position.set(x, railY/2, z);
    botRail.rotation.y = rotY;
    g.add(botRail);

    // posturi
    const nPosts = Math.floor(len / postEvery) + 1;
    for (let i=0; i<=nPosts; i++){
      const t = (i / nPosts - 0.5) * len;
      const p = post.clone();
      if (Math.abs(rotY) < 1e-3) p.position.set(x + t, postH/2, z);
      else                       p.position.set(x, postH/2, z + t);
      g.add(p);
    }
  }

  // laturi (centrat în (0,0))
  addSide('north', W, 0,  D/2, 0);
  addSide('south', W, 0, -D/2, 0);
  addSide('east',  D,  W/2, 0, Math.PI/2);
  addSide('west',  D, -W/2, 0, Math.PI/2);

  return g;
}
// src/components/depot/map/world/prefabs/Roundabout.js
import * as THREE from 'three';

/**
 * Sens giratoriu: inel asfalt + overlay marcaje + insulă centrală
 * outerR = raza exterioară (m)
 * ringW  = lățimea carosabilului (m)
 * h      = grosimea virtuală (doar pt. ordinea pe Y)
 * y      = offset pe Y (deasupra plăcii) – mic pentru a nu se suprapune
 * asphaltTexPath = textura de asfalt (fără marcaje), ex: '/textures/lume/road_asphalt.jpg'
 * tileLen = pasul dorit al tiling-ului pe circumferință (m)
 * tileWidth = pasul dorit al tiling-ului pe lățime (m)
 */
export function makeRoundabout({
  outerR = 20,
  ringW = 12,
  h = 0.02,
  y = 0.015,
  asphaltTexPath = '/textures/lume/Drumuri.jpg', // poți folosi aceeași dacă e asfalt simplu
  tileLen = 6,
  tileWidth = 6,
  islandTexPath = null, // dacă vrei textură de iarbă; altfel culoare
} = {}) {
  const g = new THREE.Group();

  const innerR = Math.max(outerR - ringW, 0.5);
  const midR   = (outerR + innerR) / 2;
  const circ   = 2 * Math.PI * midR;

  // ---------- 1) Inel asfalt (RingGeometry) ----------
  const ringGeo = new THREE.RingGeometry(innerR, outerR, 128);
  // RingGeometry e în plan XY; îl așezăm în XZ (ca solul)
  ringGeo.rotateX(-Math.PI / 2);

  const asphaltMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, // va fi suprascris de map
    roughness: 0.9,
    metalness: 0.0,
  });

  // textură asfalt
  const loader = new THREE.TextureLoader();
  const tex = loader.load(asphaltTexPath);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;

  // Tiling: vrem ca pe circumferință să repetăm în funcție de lungime,
  // iar pe lățime în funcție de ringW. La RingGeometry, axele UV sunt radial (u) și unghiular (v).
  // Ca să “alergăm” textura corect în jurul cercului, rotim textura cu 90°.
  const repeatAround = Math.max(1, Math.round(circ / tileLen));
  const repeatAcross = Math.max(1, Math.round(ringW / tileWidth));
  tex.repeat.set(repeatAround, repeatAcross);
  tex.center.set(0.5, 0.5);
  tex.rotation = Math.PI / 2;

  asphaltMat.map = tex;

  const asphalt = new THREE.Mesh(ringGeo, asphaltMat);
  asphalt.position.y = y;          // puțin deasupra plăcii
  asphalt.receiveShadow = true;
  g.add(asphalt);

  // ---------- 2) Overlay marcaje (CanvasTexture) ----------
  // Desenăm linii circulare pe un canvas cu fundal transparent.
  const S = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, S, S);

  // ajutoare pt. conversie: raze -> pixeli
  const pxPerUnit = (S / 2) / outerR; // raport pixel/metru pe raza exterioară
  const center = S / 2;

  function drawCircle(radiusM, { color = '#ffffff', lineWidthM = 0.25, dashed = false, dashLenDeg = 12, gapDeg = 12 } = {}) {
    const rPx = radiusM * pxPerUnit;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, lineWidthM * pxPerUnit);

    if (!dashed) {
      ctx.beginPath();
      ctx.arc(center, center, rPx, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // desenăm linii întrerupte prin arc-uri scurte
      const step = (dashLenDeg + gapDeg) * Math.PI / 180;
      const dashAngle = dashLenDeg * Math.PI / 180;
      for (let a = 0; a < Math.PI * 2; a += step) {
        ctx.beginPath();
        ctx.arc(center, center, rPx, a, a + dashAngle);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Linii exterioară/interioară continue (bordură carosabil)
  drawCircle(outerR - 0.3, { color: '#ffffff', lineWidthM: 0.20, dashed: false });
  drawCircle(innerR + 0.3, { color: '#ffffff', lineWidthM: 0.20, dashed: false });

  // Linie mediană întreruptă (opțional, dacă vrei o bandă indicativă)
  const midLineR = innerR + ringW * 0.5;
  drawCircle(midLineR, { color: '#ffffff', lineWidthM: 0.12, dashed: true, dashLenDeg: 8, gapDeg: 12 });

  const markingsTex = new THREE.CanvasTexture(c);
  markingsTex.colorSpace = THREE.SRGBColorSpace;
  markingsTex.wrapS = markingsTex.wrapT = THREE.ClampToEdgeWrapping;

  const markingsMat = new THREE.MeshBasicMaterial({
    map: markingsTex,
    transparent: true,
    opacity: 1,
    depthWrite: false,
  });

  const markings = new THREE.Mesh(ringGeo.clone(), markingsMat);
  markings.position.y = y + h * 0.51; // puțin deasupra asfaltului ca să nu pâlpâie
  g.add(markings);

  // ---------- 3) Bordură interioară + insulă ----------
  // Bordură mică (inel îngust)
  const curbGeo = new THREE.RingGeometry(innerR - 0.4, innerR, 64);
  curbGeo.rotateX(-Math.PI / 2);
  const curbMat = new THREE.MeshStandardMaterial({ color: 0xd9d9d6, roughness: 1 });
  const curb = new THREE.Mesh(curbGeo, curbMat);
  curb.position.y = y + h * 0.6;
  g.add(curb);

  // Insulă centrală
  const islandR = Math.max(innerR - 0.5, 0.5);
  const islandGeo = new THREE.CircleGeometry(islandR, 64);
  islandGeo.rotateX(-Math.PI / 2);
  let islandMat;
  if (islandTexPath) {
    const islandTex = loader.load(islandTexPath);
    islandTex.wrapS = islandTex.wrapT = THREE.RepeatWrapping;
    islandTex.repeat.set(islandR / 2, islandR / 2);
    islandMat = new THREE.MeshStandardMaterial({ map: islandTex, roughness: 1 });
  } else {
    islandMat = new THREE.MeshStandardMaterial({ color: 0x3c7a3b, roughness: 1 }); // verde iarbă
  }
  const island = new THREE.Mesh(islandGeo, islandMat);
  island.position.y = y + h * 0.55;
  g.add(island);

  // Umbre/recepție
  [curb, island, markings].forEach(m => (m.receiveShadow = true));
  [asphalt, curb, island].forEach(m => (m.castShadow = false));

  return g;
}
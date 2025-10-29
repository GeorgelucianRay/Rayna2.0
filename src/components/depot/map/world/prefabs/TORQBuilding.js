// ASCII only
import * as THREE from 'three';

/**
 * makeTORQBuilding – cladire stil "TORQ", low-poly, cu colt rotunjit.
 *
 * Params:
 *  H         – inaltime totala (m)
 *  Wl, Wr    – latimea aripilor stanga/dreapta (m)
 *  D         – adancimea aripilor (m)
 *  R         – raza coltzului rotunjit (m)
 *  thetaDeg  – deschiderea coltzului (grade) ~ 90..140
 *  wallColor / plinthColor / glassColor – fallback colors daca nu se trimit texturi
 *  logoMapPath – PNG cu alfa (plasat pe fatada curba, optional)
 *  useTextures – { wall, plinth, frame } cai spre imagini din /public (optional)
 */
export function makeTORQBuilding({
  H = 8.5,
  Wl = 16,
  Wr = 20,
  D  = 10,
  R  = 6,
  thetaDeg = 110,
  wallColor = 0xf3f4f6,
  plinthColor = 0xbbb8ae,
  glassColor = 0x2a3740,
  logoMapPath,
  useTextures
} = {}) {
  const g = new THREE.Group();
  g.userData.collider = 'solid'; // pentru FP

  // --- materiale ---
  const textureLoader = new THREE.TextureLoader();

  const wallMat = new THREE.MeshStandardMaterial({
    color: wallColor,
    roughness: 0.95,
    metalness: 0.0
  });
  const plinthMat = new THREE.MeshStandardMaterial({
    color: plinthColor,
    roughness: 1.0,
    metalness: 0.0
  });

  // texturi optionale (trimise din propRegistry)
  if (useTextures && useTextures.wall) {
    const tex = textureLoader.load(useTextures.wall);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    // tiling aproximativ in functie de dimensiuni
    tex.repeat.set((Wl + Wr + R) / 6, H / 3);
    tex.anisotropy = 4;
    wallMat.map = tex;
    wallMat.needsUpdate = true;
  }
  if (useTextures && useTextures.plinth) {
    const texp = textureLoader.load(useTextures.plinth);
    texp.colorSpace = THREE.SRGBColorSpace;
    texp.wrapS = texp.wrapT = THREE.RepeatWrapping;
    texp.repeat.set(2, 0.5);
    texp.anisotropy = 4;
    plinthMat.map = texp;
    plinthMat.needsUpdate = true;
  }

  const glassMat = new THREE.MeshStandardMaterial({
    color: glassColor,
    roughness: 0.15,
    metalness: 0.1,
    transparent: true,
    opacity: 0.75,
    envMapIntensity: 0.6
  });

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x9aa0a6,
    roughness: 0.8,
    metalness: 0.0
  });

  // --- soclu (zid mic jos) 0.6 m ---
  const socluH = 0.6;
  const soclu = new THREE.Group();

  // aripa stanga
  const boxL = new THREE.Mesh(new THREE.BoxGeometry(Wl, H, D), wallMat);
  boxL.castShadow = true; boxL.receiveShadow = true;
  boxL.position.set(Wl / 2, H / 2, -D / 2);

  const socluL = new THREE.Mesh(new THREE.BoxGeometry(Wl, socluH, D), plinthMat);
  socluL.position.set(Wl / 2, socluH / 2, -D / 2);

  // aripa dreapta
  const startXRight = Wl + R;
  const boxR = new THREE.Mesh(new THREE.BoxGeometry(Wr, H, D), wallMat);
  boxR.castShadow = true; boxR.receiveShadow = true;
  boxR.position.set(startXRight + Wr / 2, H / 2, -D / 2);

  const socluR = new THREE.Mesh(new THREE.BoxGeometry(Wr, socluH, D), plinthMat);
  socluR.position.set(startXRight + Wr / 2, socluH / 2, -D / 2);

  soclu.add(socluL, socluR);
  g.add(boxL, boxR, soclu);

  // --- colt rotunjit: sector cilindru ---
  const theta = THREE.MathUtils.degToRad(thetaDeg);
  const cyl = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, H, 28, 1, true, Math.PI / 2 - theta / 2, theta),
    wallMat
  );
  cyl.castShadow = true; cyl.receiveShadow = true;
  cyl.position.set(Wl + R, H / 2, 0);
  g.add(cyl);

  const socluC = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, socluH, 28, 1, true, Math.PI / 2 - theta / 2, theta),
    plinthMat
  );
  socluC.position.set(Wl + R, socluH / 2, 0);
  g.add(socluC);

  // --- ferestre: benzi simple pe aripi + pe arc ---
  const winH = 1.2;
  const winY = 3.4;
  const winInset = 0.05;

  function addWindowBandBox(target, W) {
    // rama orizontala subtire
    const frame = new THREE.Mesh(new THREE.BoxGeometry(W, 0.12, 0.02), frameMat);
    // panou sticla
    const band = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.4, winH), glassMat);
    band.position.set(0, 0, winInset);

    const group = new THREE.Group();
    group.add(band, frame);

    // aliniere cu muchia frontala a volumului (fata la z = -D)
    group.position.set(target.position.x, winY, -D + winInset);
    g.add(group);
  }

  addWindowBandBox(boxL, Wl);
  addWindowBandBox(boxR, Wr);

  // ferestre pe arc: plane-uri tangente aproximativ egale
  const segs = 10;
  for (let i = 0; i < segs; i++) {
    const a0 = (Math.PI / 2 - theta / 2) + (i + 0.15) * (theta / segs);
    const a1 = (Math.PI / 2 - theta / 2) + (i + 0.85) * (theta / segs);
    const a  = (a0 + a1) / 2;
    const x  = Wl + R * Math.cos(a);
    const z  = R * Math.sin(a);
    const w  = R * (a1 - a0) * 2.0; // aproximare chord width

    const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, winH), glassMat);
    pane.position.set(x, winY, z);
    pane.rotation.y = -a; // perpendicular pe raza catre centru
    g.add(pane);
  }

  // --- logo (optional) ---
  if (logoMapPath) {
    const logoTex = textureLoader.load(logoMapPath);
    logoTex.colorSpace = THREE.SRGBColorSpace;

    const logoMat = new THREE.MeshBasicMaterial({ map: logoTex, transparent: true });
    const logoW = 4.5, logoH = 1.2;
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(logoW, logoH), logoMat);

    const aLogo = THREE.MathUtils.degToRad(0);
    const xL = Wl + R * Math.cos(aLogo);
    const zL = R * Math.sin(aLogo);
    logo.position.set(xL, H - 1.6, zL + 0.03);
    logo.rotation.y = -aLogo;

    g.add(logo);
  }

  // --- umbre ---
  g.traverse(o => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  return g;
}
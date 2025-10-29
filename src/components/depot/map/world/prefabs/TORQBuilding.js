// src/components/depot/map/world/prefabs/TORQBuilding.js
// ASCII only
import * as THREE from 'three';

export function makeTORQBuilding({
  // dimensiuni generale
  H = 8.5,             // înălțime
  R = 7,               // raza cilindrului (fațada curbată)
  arcDeg = 120,        // deschiderea fațadei cilindrice
  wedgeBack = 16,      // lățimea „spatelui” triunghiului (marginea dreaptă)
  wedgeDepth = 18,     // adâncimea triunghiului (vârful spre cilindru)
  D = 10,              // adâncimea volumelor (gross depth pentru muchii/zone plane)
  // materiale / texturi
  wallColor = 0xf3f4f6,
  plinthColor = 0xbbb8ae,
  glassColor = 0x2a3740,
  textures = {
    wall:  '/textures/models/white_plaster.jpg',
    plinth:'/textures/models/concrete.jpg'
  },
  logo = {
    map: '/textures/models/torq.png', // PNG cu alfa, fără spații/dublu .png
    width: 5.5,
    height: 1.6,
    arcDeg: 26,     // cât „din arc” ocupă banda logo
    y: null         // dacă e null se pune automat aproape de cornișă
  }
} = {}) {
  const g = new THREE.Group();
  g.userData.collider = 'solid';

  const T = new THREE.TextureLoader();

  // materiale
  const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.95 });
  if (textures?.wall) {
    const t = T.load(textures.wall);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set( (Math.PI * R * (arcDeg/360)) / 3, H/3 );
    wallMat.map = t; wallMat.needsUpdate = true;
  }
  const plinthMat = new THREE.MeshStandardMaterial({ color: plinthColor, roughness: 1 });
  if (textures?.plinth) {
    const t = T.load(textures.plinth);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 0.6);
    plinthMat.map = t; plinthMat.needsUpdate = true;
  }
  const glassMat = new THREE.MeshStandardMaterial({
    color: glassColor, roughness: 0.15, metalness: 0.1,
    transparent: true, opacity: 0.75, envMapIntensity: 0.6
  });

  // === 1) Fațada cilindrică ===
  const theta = THREE.MathUtils.degToRad(arcDeg);
  const cyl = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, H, 48, 1, true, Math.PI/2 - theta/2, theta),
    wallMat
  );
  // punem centrul fațadei la (0, 0, 0); fața curbată „privind” spre +Z/−Z
  cyl.position.set(0, H/2, 0);
  g.add(cyl);

  // soclu mic pentru cilindru
  const socluH = 0.6;
  const cylPlinth = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, socluH, 48, 1, true, Math.PI/2 - theta/2, theta),
    plinthMat
  );
  cylPlinth.position.set(0, socluH/2, 0);
  g.add(cylPlinth);

  // === 2) Prisma triunghiulară (plan „din top”: triunghi cu vârful spre cilindru) ===
  // desenăm triunghiul în plan XY și îl extrudăm pe Z, apoi îl rotim ca Y să fie înălțimea
  const s = new THREE.Shape();
  // (0,0) – vârful (înspre cilindru), (wedgeBack,0) – muchia dreaptă,
  // (0,wedgeDepth) – muchia stângă (formând un triunghi dreptunghic)
  s.moveTo(0, 0);
  s.lineTo(wedgeBack, 0);
  s.lineTo(0, wedgeDepth);
  s.lineTo(0, 0);

  const wedgeGeo = new THREE.ExtrudeGeometry(s, { depth: H, bevelEnabled: false });
  // Extrudarea e pe +Z; rotim ca +Z să devină +Y
  wedgeGeo.rotateX(-Math.PI / 2);
  // centru pe verticală
  wedgeGeo.translate(0, H/2, 0);

  const wedge = new THREE.Mesh(wedgeGeo, wallMat);
  // poziționăm astfel încât vârful triunghiului să intre în cilindru aproape de „est”
  // adică tangenta pe arc înspre +X.
  const tipOffset = R - 0.05;  // puțin "înăuntru" să nu apară goluri
  wedge.position.set(tipOffset, 0, 0);
  // împingem partea lată înspre dreapta (pozitiv X) și puțin în spate (−Z) pentru aspect
  // dacă vrei să rotești întregul volum, ajustează aici:
  // wedge.rotation.y = -Math.PI/12;
  g.add(wedge);

  // soclu pentru prisma
  const wedgeBase = wedgeGeo.clone();
  // o versiune scurtă (doar soclul)
  const boxBase = new THREE.Mesh(
    new THREE.BoxGeometry(wedgeBack, socluH, wedgeDepth),
    plinthMat
  );
  // aliniază cu marginea „din spate” a triunghiului
  boxBase.position.set(tipOffset + (wedgeBack/2), socluH/2, wedgeDepth/2);
  g.add(boxBase);

  // === 3) O bandă de ferestre pe cilindru + pe prismă (simplificat) ===
  const winH = 1.2, winY = 3.5;
  // ferestre cilindru – împărțim arcul în panouri
  const segs = 10;
  for (let i = 0; i < segs; i++) {
    const a0 = (Math.PI/2 - theta/2) + (i+0.08) * (theta/segs);
    const a1 = (Math.PI/2 - theta/2) + (i+0.92) * (theta/segs);
    const a  = (a0 + a1) / 2;
    const w  = R * (a1 - a0) * 2.0;
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, winH), glassMat);
    pane.position.set(R * Math.cos(a), winY, R * Math.sin(a));
    pane.rotation.y = -a;
    g.add(pane);
  }
  // ferestre pe muchia „lată” a prismei – ca o bandă
  const band = new THREE.Mesh(new THREE.PlaneGeometry(wedgeBack - 0.5, winH), glassMat);
  // banda la marginea exterioară (fața lată)
  band.position.set(tipOffset + (wedgeBack/2), winY, -0.05);
  g.add(band);

  // === 4) LOGO curbat pe cilindru ===
  if (logo?.map) {
    const tex = T.load(logo.map); tex.colorSpace = THREE.SRGBColorSpace;
    const logoMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    const arcLogo = THREE.MathUtils.degToRad(logo.arcDeg || 24);
    const logoR = R + 0.03; // puțin în fața peretelui ca să nu „clipească”
    const logoBand = new THREE.Mesh(
      new THREE.CylinderGeometry(logoR, logoR, logo.height, 48, 1, true,
        Math.PI/2 - arcLogo/2, arcLogo),
      logoMat
    );
    logoBand.position.y = (logo.y ?? (H - 1.7));
    // centrăm pe fața cilindrului
    logoBand.position.x = 0;
    logoBand.position.z = 0;
    g.add(logoBand);
  }

  // umbre
  g.traverse(o => { if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });

  return g;
}
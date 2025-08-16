import * as THREE from 'three';

function makeSpriteLabel(text, color = '#ffffff', size = 1.6) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,256,256);
  ctx.fillStyle = color;
  ctx.font = 'bold 160px Inter, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 140);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(size, size, size);
  return sprite;
}

export default function createGround({
  width = 300,
  depth = 180,
  color = 0x9aa0a6,        // gri mai curat
} = {}) {
  const g = new THREE.Group();

  // Asfalt neted
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0.02 })
  );
  plane.rotation.x = -Math.PI / 2;
  g.add(plane);

  // —— Marcaje ABC (stânga): 3 rânduri aproape lipite (Z), 10 sloturi pe X
  const ABC_ORIGIN_X = -52;
  const ABC_ORIGIN_Z = 0;
  const ABC_ROW_GAP = 2.8;  // A/B/C apropiați
  const ABC_COL_GAP = 5.8;  // 10 sloturi

  const abcRows = ['A', 'B', 'C'];
  const abcRowZ = { A: +ABC_ROW_GAP, B: 0, C: -ABC_ROW_GAP };

  const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 });

  abcRows.forEach((r, ri) => {
    const z = ABC_ORIGIN_Z + abcRowZ[r];

    // linie subțire sub fiecare “șir”
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(ABC_ORIGIN_X - 2, 0.02, z),
      new THREE.Vector3(ABC_ORIGIN_X + (10 - 1) * ABC_COL_GAP + 2, 0.02, z),
    ]);
    g.add(new THREE.Line(geo, lineMat));

    // marcaje slot + numere sus
    for (let c = 1; c <= 10; c++) {
      const x = ABC_ORIGIN_X + (c - 1) * ABC_COL_GAP;
      const tickGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, 0.021, z - 1.2),
        new THREE.Vector3(x, 0.021, z + 1.2),
      ]);
      g.add(new THREE.Line(tickGeo, lineMat));

      if (ri === 0) {
        // numerotare doar o dată (deasupra rândului A)
        const sprite = makeSpriteLabel(String(c), '#ffffff', 1.4);
        sprite.position.set(x, 0.02, z + 2.1);
        g.add(sprite);
      }
    }

    // eticheta A/B/C în capătul stâng
    const letter = makeSpriteLabel(r, '#22d3ee', 1.8);
    letter.position.set(ABC_ORIGIN_X - 3.2, 0.02, z);
    g.add(letter);
  });

  // —— Marcaje DEF (dreapta): 3 rânduri pe X, 7 sloturi pe Z până la gard
  const DEF_ORIGIN_X = +36;
  const DEF_ORIGIN_Z = -18;     // 1 aproape de centru
  const DEF_ROW_GAP_X = 2.8;    // D/E/F apropiați pe X
  const DEF_COL_GAP_Z = 6.8;    // 7 sloturi pe Z

  const defRows = ['D', 'E', 'F'];
  const defRowX = { D: 0, E: +DEF_ROW_GAP_X, F: +DEF_ROW_GAP_X * 2 };

  defRows.forEach((r) => {
    const x = DEF_ORIGIN_X + defRowX[r];

    // linie verticală pentru fiecare rând
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, 0.02, DEF_ORIGIN_Z - 1.8),
      new THREE.Vector3(x, 0.02, DEF_ORIGIN_Z + (7 - 1) * DEF_COL_GAP_Z + 1.8),
    ]);
    g.add(new THREE.Line(geo, lineMat));

    for (let c = 1; c <= 7; c++) {
      const z = DEF_ORIGIN_Z + (c - 1) * DEF_COL_GAP_Z;
      const tickGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x - 1.2, 0.021, z),
        new THREE.Vector3(x + 1.2, 0.021, z),
      ]);
      g.add(new THREE.Line(tickGeo, lineMat));

      // numerotare doar pe rândul D (sus)
      if (r === 'D') {
        const sprite = makeSpriteLabel(String(c), '#ffffff', 1.4);
        sprite.position.set(x - 2.2, 0.02, z);
        g.add(sprite);
      }
    }

    // eticheta D/E/F la baza rândului
    const letter = makeSpriteLabel(r, '#22d3ee', 1.8);
    letter.position.set(x + 2.0, 0.02, DEF_ORIGIN_Z - 2.4);
    g.add(letter);
  });

  return g;
}
// src/components/threeWorld/createContainersLayerOptimized.js
import * as THREE from 'three';
import { slotToWorld } from './slotToWorld';

const NAVIERA_COLORS = {
  MAERSK: 0xbfc7cf, MSK: 0xbfc7cf,
  HAPAG: 0xf97316, MESSINA: 0xf97316,
  ONE: 0xec4899,
  EVERGREEN: 0x22c55e,
  ARCAS: 0x2563eb,
  OTROS: 0x8b5e3c
};

const SIZE_BY_TIPO = {
  '20':        { L: 6.06,  H: 2.59, W: 2.44 },
  '20opentop': { L: 6.06,  H: 2.59, W: 2.44 },
  '40alto':    { L: 12.19, H: 2.89, W: 2.44 },
  '40bajo':    { L: 12.19, H: 2.59, W: 2.44 },
  '40opentop': { L: 12.19, H: 2.59, W: 2.44 },
  '45':        { L: 13.72, H: 2.89, W: 2.44 },
};

/* -------------------------- TEXTURES (Maersk) -------------------------- */

const TEXROOT = '/textures/contenedores';
const textureLoader = new THREE.TextureLoader();
const textureCache = new Map();

function loadTex(path) {
  if (textureCache.has(path)) return textureCache.get(path);
  const t = textureLoader.load(path);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = 4;
  textureCache.set(path, t);
  return t;
}

function normBrand(name = '') {
  const s = String(name).toLowerCase();
  if (s.includes('maersk') || s.includes('msk')) return 'maersk';
  // TODO: adaugă aici și alte branduri când ai texturile lor
  return 'generic';
}

// materiale pentru BoxGeometry (6 fețe) — set Maersk 40/20
function makeMaterialsFor(brand, sizeFt = 40) {
  const fallback = new THREE.MeshStandardMaterial({
    color: 0x8b5e3c, metalness: 0.1, roughness: 0.7
  });
  if (brand !== 'maersk') {
    // 6 materiale identice (BoxGeometry are groups → necesită array de 6)
    return [fallback, fallback, fallback, fallback, fallback, fallback];
  }

  const dir = `${TEXROOT}/maersk`;
  const side = loadTex(`${dir}/maersk_40_side_texture.png`);
  const front = loadTex(`${dir}/maersk_40_front_texture.png`);
  const back  = loadTex(`${dir}/maersk_40_back_texture.png`);
  const top   = loadTex(`${dir}/maersk_40_top_texture.png`);

  // ordine materiale pentru BoxGeometry:
  // 0=right, 1=left, 2=top, 3=bottom, 4=front, 5=back
  return [
    new THREE.MeshStandardMaterial({ map: side,  metalness: 0.1, roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ map: side,  metalness: 0.1, roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ map: top,   metalness: 0.1, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ color: 0x8a8f95, metalness: 0.1, roughness: 0.9 }), // bottom simplu
    new THREE.MeshStandardMaterial({ map: front, metalness: 0.1, roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ map: back,  metalness: 0.1, roughness: 0.8 }),
  ];
}

/* -------------------------- LAYER PRINCIPAL --------------------------- */

/**
 * Optimized container layer using instanced meshes for better performance
 */
export default function createContainersLayerOptimized(data, layout) {
  const layer = new THREE.Group();
  const allContainers = data?.containers || [];

  if (allContainers.length === 0) {
    console.log('No containers to render');
    return layer;
  }

  // Group pentru instancing (acum ținem cont și de brand)
  const containerGroups = new Map();

  // Parse position helper
  function parsePos(any) {
    const s = String(any || '').trim().toUpperCase();
    const m = s.match(/^([A-F])(\d{1,2})([A-Z])?$/);
    if (!m) return null;
    return { band: m[1], index: Number(m[2]), level: m[3] || 'A' };
  }

  // Grupare
  allContainers.forEach(rec => {
    const parsed = parsePos(rec.pos ?? rec.posicion);
    if (!parsed) return;

    const tipo = (rec.tipo || '40bajo').toLowerCase();
    const isRoto = rec.__source === 'rotos';
    const isProgramado = rec.__source === 'programados';

    const navieraRaw = (rec.naviera || '').trim().toUpperCase();
    const brand = normBrand(navieraRaw);

    // culoare de fallback (doar pentru branduri fără texturi)
    let colorHex;
    if (isRoto) {
      colorHex = 0xef4444;
    } else {
      const base = NAVIERA_COLORS[navieraRaw] ?? NAVIERA_COLORS.OTROS;
      if (isProgramado) {
        const c = new THREE.Color(base);
        c.offsetHSL(0, 0, 0.10);
        colorHex = c.getHex();
      } else {
        colorHex = base;
      }
    }

    // cheie de grup — includem brand (ca să putem da material diferit)
    const groupKey = `${tipo}_${brand}_${isProgramado}`;

    if (!containerGroups.has(groupKey)) {
      containerGroups.set(groupKey, {
        tipo,
        brand,
        isProgramado,
        colorHex,       // păstrăm pentru fallback
        containers: []
      });
    }

    containerGroups.get(groupKey).containers.push({ parsed, record: rec });
  });

  // Instanced meshes per grup
  containerGroups.forEach(group => {
    const count = group.containers.length;
    if (count === 0) return;

    const dims = SIZE_BY_TIPO[group.tipo] || SIZE_BY_TIPO['40bajo'];
    const geometry = new THREE.BoxGeometry(dims.L, dims.H, dims.W);

    // materiale: texturi dacă avem set pentru brand; altfel vopsit
    let materials;
    if (group.brand === 'maersk') {
      const sizeFt = group.tipo.startsWith('20') ? 20 : 40;
      materials = makeMaterialsFor(group.brand, sizeFt);
    } else {
      const fallbackMat = new THREE.MeshStandardMaterial({
        color: group.colorHex, metalness: 0.1, roughness: 0.7
      });
      materials = [fallbackMat, fallbackMat, fallbackMat, fallbackMat, fallbackMat, fallbackMat];
    }

    const mesh = new THREE.InstancedMesh(geometry, materials, count);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // set matrix per instance
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);

    group.containers.forEach((container, i) => {
      const { parsed } = container;

      // calculează world position din slot (helper-ul tău)
      const worldPos = slotToWorld(
        { lane: parsed.band, index: parsed.index, tier: parsed.level },
        { ...layout, abcNumbersReversed: true }
      );

      position.copy(worldPos.position);
      quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), worldPos.rotationY);

      if (group.isProgramado) {
        const pulseScale = 1 + Math.sin(Math.random() * Math.PI * 2) * 0.05;
        scale.set(1, pulseScale, 1);
      } else {
        scale.set(1, 1, 1);
      }

      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(i, matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;

    if (group.isProgramado) {
      mesh.userData.isProgramado = true;
      mesh.userData.pulsePhases = new Float32Array(count);
      for (let i = 0; i < count; i++) mesh.userData.pulsePhases[i] = Math.random() * Math.PI * 2;
    }

    layer.add(mesh);
  });

  // Animation tick pentru puls
  layer.userData.tick = () => {
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    layer.children.forEach(mesh => {
      if (!mesh.userData.isProgramado) return;

      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, matrix);
        matrix.decompose(position, quaternion, scale);

        mesh.userData.pulsePhases[i] += 0.04;
        const pulseScale = 1 + Math.sin(mesh.userData.pulsePhases[i]) * 0.05;
        scale.set(1, pulseScale, 1);

        matrix.compose(position, quaternion, scale);
        mesh.setMatrixAt(i, matrix);
      }

      mesh.instanceMatrix.needsUpdate = true;
    });
  };

  // LOD
  const lod = new THREE.LOD();
  lod.addLevel(layer, 0);

  const lowDetailLayer = createLowDetailContainers(allContainers, layout);
  lod.addLevel(lowDetailLayer, 100);

  return lod;
}

/* ---------------------- Low-detail (fallback LOD) ---------------------- */
function createLowDetailContainers(containers, layout) {
  const layer = new THREE.Group();
  // Poți păstra implementarea ta simplificată aici
  // (box-uri fără texturi, grupate pe culoare)
  return layer;
}
// src/components/threeWorld/createContainersLayer.js
import * as THREE from 'three';
import { slotToWorld } from './slotToWorld';

/* — culori naviera — */
const NAVIERA_COLORS = {
  MAERSK: 0xbfc7cf, MSK: 0xbfc7cf,
  HAPAG: 0xf97316, MESSINA: 0xf97316,
  ONE: 0xec4899,
  EVERGREEN: 0x22c55e,
  ARCAS: 0x2563eb,
  OTROS: 0x8b5e3c
};

/* — dimensiuni containere — */
const SIZE_BY_TIPO = {
  '20': { L: 6.06, H: 2.59, W: 2.44 },
  '20opentop': { L: 6.06, H: 2.59, W: 2.44 },
  '40alto': { L: 12.19, H: 2.89, W: 2.44 },
  '40bajo': { L: 12.19, H: 2.59, W: 2.44 },
  '40opentop': { L: 12.19, H: 2.59, W: 2.44 },
  '45': { L: 13.72, H: 2.89, W: 2.44 },
};

/* — utilitare — */
function pickColor(naviera = '', roto = false, programado = false) {
  if (roto) return 0xef4444;
  const key = (naviera || '').trim().toUpperCase();
  const base = NAVIERA_COLORS[key] ?? NAVIERA_COLORS.OTROS;
  if (!programado) return base;
  const c = new THREE.Color(base);
  c.offsetHSL(0, 0, 0.10);
  return c.getHex();
}

function parsePos(any) {
  const s = String(any || '').trim().toUpperCase();
  
  // Debug: log poziția originală
  console.log('📍 Parsing position:', s);
  
  // Format așteptat: A1, B10, C5A, D3B, etc.
  // Band (A-F) + Index (1-10 sau 1-7) + Nivel opțional (A,B,C...)
  const m = s.match(/^([A-F])(\d{1,2})([A-Z])?$/);
  
  if (!m) {
    console.warn(`❌ Invalid position format: "${s}"`);
    return null;
  }
  
  const band = m[1];
  const index = Number(m[2]);
  const levelLetter = m[3] || 'A'; // Default la nivelul A (sol)
  
  // Validare index
  const isABC = 'ABC'.includes(band);
  const maxIndex = isABC ? 10 : 7;
  
  if (index < 1 || index > maxIndex) {
    console.warn(`❌ Invalid index ${index} for band ${band}. Expected 1-${maxIndex}`);
    return null;
  }
  
  console.log(`✅ Parsed: band=${band}, index=${index}, level=${levelLetter}`);
  
  return { band, index, level: levelLetter };
}

/**
 * data = { containers: [] }
 * layout = { abcOffsetX, defOffsetX, abcToDefGap }
 */
export default function createContainersLayer(data, layout) {
  const layer = new THREE.Group();
  const allContainers = data?.containers || [];
  
  console.log(`🏗️ Creating container layer with ${allContainers.length} containers`);
  console.log('Layout config:', layout);

  // Statistici pentru debugging
  let successCount = 0;
  let failCount = 0;
  const failedPositions = [];

  const makeBox = (tipo, colorHex) => {
    const dims = SIZE_BY_TIPO[(tipo || '').toLowerCase()] || SIZE_BY_TIPO['40bajo'];
    const geo = new THREE.BoxGeometry(dims.L, dims.H, dims.W);
    const mat = new THREE.MeshStandardMaterial({ 
      color: colorHex,
      metalness: 0.1,
      roughness: 0.8
    });
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    m.userData.__dims = dims;
    return m;
  };

  const addRecord = (rec, index) => {
    // Extrage poziția din record
    const posValue = rec.pos || rec.posicion || '';
    
    if (!posValue) {
      console.warn(`⚠️ Container ${index} has no position:`, rec);
      failCount++;
      failedPositions.push({ index, record: rec, reason: 'No position field' });
      return;
    }

    const parsed = parsePos(posValue);
    if (!parsed) {
      failCount++;
      failedPositions.push({ index, record: rec, reason: 'Parse failed', position: posValue });
      return;
    }

    try {
      // Folosim slotToWorld pentru a calcula coordonatele
      const worldPos = slotToWorld(
        { 
          lane: parsed.band, 
          index: parsed.index, 
          tier: parsed.level // Acum trimitem direct litera
        },
        { 
          ...layout, 
          abcNumbersReversed: true 
        }
      );

      // Determinăm starea și culoarea
      const isRoto = rec.__source === 'rotos';
      const isProgramado = rec.__source === 'programados';
      const colorHex = pickColor(rec.naviera, isRoto, isProgramado);
      
      // Creăm mesh-ul
      const mesh = makeBox(rec.tipo, colorHex);
      mesh.position.copy(worldPos.position);
      mesh.rotation.y = worldPos.rotationY;

      // Adaugă animație pentru programados
      if (isProgramado) {
        mesh.userData.__pulse = { t: Math.random() * Math.PI * 2 };
      }
      
      // Salvează datele containerului pentru interacțiune ulterioară
      mesh.userData.__record = rec;
      mesh.userData.__parsed = parsed;
      
      layer.add(mesh);
      successCount++;
      
      console.log(`✅ Container ${index} placed at:`, {
        position: posValue,
        world: { x: worldPos.position.x, y: worldPos.position.y, z: worldPos.position.z },
        rotation: worldPos.rotationY
      });
      
    } catch (error) {
      console.error(`❌ Error placing container ${index}:`, error);
      failCount++;
      failedPositions.push({ index, record: rec, reason: error.message });
    }
  };

  // Procesează toate containerele
  allContainers.forEach((rec, idx) => addRecord(rec, idx));

  // Raport final
  console.log('📊 Container placement summary:');
  console.log(`   ✅ Success: ${successCount}/${allContainers.length}`);
  console.log(`   ❌ Failed: ${failCount}/${allContainers.length}`);
  
  if (failedPositions.length > 0) {
    console.log('Failed containers:', failedPositions);
  }

  // Adaugă markere de debug pentru poziții (opțional)
  if (layout.debug) {
    addDebugMarkers(layer, layout);
  }

  // Animație puls pentru programados
  layer.userData.tick = () => {
    for (const m of layer.children) {
      const p = m.userData.__pulse;
      if (!p) continue;
      p.t += 0.04;
      const s = 1 + Math.sin(p.t) * 0.05;
      m.scale.set(1, s, 1);
    }
  };

  return layer;
}

// Funcție helper pentru debugging - afișează markere la fiecare slot
function addDebugMarkers(layer, layout) {
  const markerMat = new THREE.MeshBasicMaterial({ 
    color: 0xff00ff, 
    transparent: true, 
    opacity: 0.5 
  });
  
  // Markere pentru ABC (10 sloturi fiecare)
  ['A', 'B', 'C'].forEach(band => {
    for (let i = 1; i <= 10; i++) {
      const worldPos = slotToWorld(
        { lane: band, index: i, tier: 'A' },
        { ...layout, abcNumbersReversed: true }
      );
      
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.2),
        markerMat
      );
      marker.position.copy(worldPos.position);
      marker.position.y = 0.1;
      layer.add(marker);
    }
  });
  
  // Markere pentru DEF (7 sloturi fiecare)
  ['D', 'E', 'F'].forEach(band => {
    for (let i = 1; i <= 7; i++) {
      const worldPos = slotToWorld(
        { lane: band, index: i, tier: 'A' },
        { ...layout, abcNumbersReversed: true }
      );
      
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.2),
        markerMat
      );
      marker.position.copy(worldPos.position);
      marker.position.y = 0.1;
      layer.add(marker);
    }
  });
}
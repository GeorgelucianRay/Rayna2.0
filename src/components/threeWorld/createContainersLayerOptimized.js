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
  '20': { L: 6.06, H: 2.59, W: 2.44 },
  '20opentop': { L: 6.06, H: 2.59, W: 2.44 },
  '40alto': { L: 12.19, H: 2.89, W: 2.44 },
  '40bajo': { L: 12.19, H: 2.59, W: 2.44 },
  '40opentop': { L: 12.19, H: 2.59, W: 2.44 },
  '45': { L: 13.72, H: 2.89, W: 2.44 },
};

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

  // Group containers by type and color for instancing
  const containerGroups = new Map();
  
  // Parse position helper
  function parsePos(any) {
    const s = String(any || '').trim().toUpperCase();
    const m = s.match(/^([A-F])(\d{1,2})([A-Z])?$/);
    if (!m) return null;
    return {
      band: m[1],
      index: Number(m[2]),
      level: m[3] || 'A'
    };
  }
  
  // Group containers by type for instancing
  allContainers.forEach(rec => {
    const parsed = parsePos(rec.pos ?? rec.posicion);
    if (!parsed) return;
    
    const tipo = (rec.tipo || '40bajo').toLowerCase();
    const isRoto = rec.__source === 'rotos';
    const isProgramado = rec.__source === 'programados';
    
    // Determine color
    const naviera = (rec.naviera || '').trim().toUpperCase();
    let colorHex;
    if (isRoto) {
      colorHex = 0xef4444;
    } else {
      const base = NAVIERA_COLORS[naviera] ?? NAVIERA_COLORS.OTROS;
      if (isProgramado) {
        const c = new THREE.Color(base);
        c.offsetHSL(0, 0, 0.10);
        colorHex = c.getHex();
      } else {
        colorHex = base;
      }
    }
    
    // Create group key
    const groupKey = `${tipo}_${colorHex}_${isProgramado}`;
    
    if (!containerGroups.has(groupKey)) {
      containerGroups.set(groupKey, {
        tipo,
        colorHex,
        isProgramado,
        containers: []
      });
    }
    
    containerGroups.get(groupKey).containers.push({
      parsed,
      record: rec
    });
  });

  // Create instanced meshes for each group
  containerGroups.forEach(group => {
    const count = group.containers.length;
    if (count === 0) return;
    
    // Get dimensions for this tipo
    const dims = SIZE_BY_TIPO[group.tipo] || SIZE_BY_TIPO['40bajo'];
    
    // Create geometry and material
    const geometry = new THREE.BoxGeometry(dims.L, dims.H, dims.W);
    const material = new THREE.MeshStandardMaterial({
      color: group.colorHex,
      metalness: 0.1,
      roughness: 0.7
    });
    
    // Create instanced mesh
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Set up matrix for each instance
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);
    
    group.containers.forEach((container, i) => {
      const { parsed } = container;
      
      // Calculate world position
      const worldPos = slotToWorld(
        {
          lane: parsed.band,
          index: parsed.index,
          tier: parsed.level
        },
        {
          ...layout,
          abcNumbersReversed: true
        }
      );
      
      // Set position
      position.copy(worldPos.position);
      
      // Set rotation
      quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), worldPos.rotationY);
      
      // Set scale (for pulsing programados)
      if (group.isProgramado) {
        const pulseScale = 1 + Math.sin(Math.random() * Math.PI * 2) * 0.05;
        scale.set(1, pulseScale, 1);
      }
      
      // Compose matrix
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(i, matrix);
    });
    
    // Update instance matrix
    mesh.instanceMatrix.needsUpdate = true;
    
    // Store metadata for animations
    if (group.isProgramado) {
      mesh.userData.isProgramado = true;
      mesh.userData.pulsePhases = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        mesh.userData.pulsePhases[i] = Math.random() * Math.PI * 2;
      }
    }
    
    layer.add(mesh);
  });

  // Animation tick function for pulsing programados
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
        
        // Update pulse
        mesh.userData.pulsePhases[i] += 0.04;
        const pulseScale = 1 + Math.sin(mesh.userData.pulsePhases[i]) * 0.05;
        scale.set(1, pulseScale, 1);
        
        matrix.compose(position, quaternion, scale);
        mesh.setMatrixAt(i, matrix);
      }
      
      mesh.instanceMatrix.needsUpdate = true;
    });
  };

  // Add LOD (Level of Detail) support
  const lod = new THREE.LOD();
  
  // High detail - full containers
  lod.addLevel(layer, 0);
  
  // Low detail - simplified boxes for distance viewing
  const lowDetailLayer = createLowDetailContainers(allContainers, layout);
  lod.addLevel(lowDetailLayer, 100);
  
  return lod;
}

// Create simplified geometry for distant viewing
function createLowDetailContainers(containers, layout) {
  const layer = new THREE.Group();
  
  // Use simpler geometry and merge by color
  const mergedGeometries = new Map();
  
  containers.forEach(rec => {
    // ... simplified geometry creation
    // This would create basic boxes without details
  });
  
  return layer;
}

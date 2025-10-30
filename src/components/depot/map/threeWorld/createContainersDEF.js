// DEF: lungime pe Z, dar FRONT/BACK rămân pe ±X
import * as THREE from 'three';
import { slotToWorld } from './slotToWorld';

const SIZE_BY_TIPO = {
  '20':        { L: 6.06,  H: 2.59, W: 2.44 },
  '20opentop': { L: 6.06,  H: 2.59, W: 2.44 },
  '40alto':    { L: 12.19, H: 2.89, W: 2.44 },
  '40bajo':    { L: 12.19, H: 2.59, W: 2.44 },
  '40opentop': { L: 12.19, H: 2.59, W: 2.44 },
  '45':        { L: 13.72, H: 2.89, W: 2.44 },
};

const TEXROOT = '/textures/contenedores';
const loader = new THREE.TextureLoader();
const tcache = new Map();

function loadTex(path){
  if (tcache.has(path)) return tcache.get(path);
  const t = loader.load(path);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy  = 4;
  t.minFilter   = THREE.LinearMipmapLinearFilter;
  t.magFilter   = THREE.LinearFilter;
  tcache.set(path, t);
  return t;
}
function brandTex(brand, which){
  const dir = `${TEXROOT}/${brand}`;
  for (const p of [
    `${dir}/${brand}_40_${which}_texture.png`,
    `${dir}/${brand}_40_${which}.png`,
    `${dir}/${brand}_40_${which}_texture.jpg`,
    `${dir}/${brand}_40_${which}.jpg`,
  ]) { try { return loadTex(p); } catch {} }
  return null;
}
function normBrand(name=''){
  const s = name.toLowerCase();
  if (s.includes('maersk') || s === 'msk') return 'maersk';
  if (s.includes('evergreen')) return 'evergreen';
  if (s.includes('hapag') || s.includes('hlag')) return 'hapag';
  if (s.includes('messina')) return 'messina';
  if (s.includes('one')) return 'one';
  if (s.includes('arkas') || s.includes('arcas')) return 'arkas';
  if (s.includes('msc')) return 'msc';
  if (s.includes('roto')) return 'roto';
  return 'neutru';
}

/**
 * FRONT/BACK pe ±X; lungimea e pe Z ⇒ rotim textura laterală 90°
 * Ordine BoxGeometry: [right +X, left -X, top +Y, bottom -Y, front +Z, back -Z]
 * => mFront -> index 0 (+X), mBack -> index 1 (-X); laterale -> index 4/5 (±Z)
 */
function makeMaterialsCapsOnX_ZLength(brand, L){
  const repeatL = Math.max(0.25, L / 12.19);

  const sideT  = brandTex(brand,'side');   const side  = sideT?.clone()  ?? null;
  const topT   = brandTex(brand,'top');    const top   = topT?.clone()   ?? null;
  const frontT = brandTex(brand,'front');  const front = frontT?.clone() ?? null;
  const backT  = brandTex(brand,'back');   const back  = backT?.clone()  ?? null;

  // LATERALE: rotim 90° ca să "curgă" de-a lungul Z
  if (side){
    side.wrapS = side.wrapT = THREE.ClampToEdgeWrapping;
    side.center.set(0.5, 0.5);
    side.rotation = Math.PI / 2;
    side.repeat.set(repeatL, 1);
  }
  // TOP: opțional îl rotim 90° ca să urmeze Z
  if (top){
    top.wrapS = top.wrapT = THREE.ClampToEdgeWrapping;
    top.center.set(0.5, 0.5);
    top.rotation = Math.PI / 2;
    top.repeat.set(repeatL, 1);
  }
  if (front){ front.wrapS = front.wrapT = THREE.ClampToEdgeWrapping; }
  if (back ){ back.wrapS  = back.wrapT  = THREE.ClampToEdgeWrapping; }

  const mSide   = new THREE.MeshStandardMaterial({ color: side?0xffffff:0x9aa0a6, map: side,  roughness:0.8,  metalness:0.1 });
  const mTop    = new THREE.MeshStandardMaterial({ color: top?0xffffff:0x8a8f95,   map: top,   roughness:0.85, metalness:0.1 });
  const mBottom = new THREE.MeshStandardMaterial({ color: 0x8a8f95, roughness:0.9, metalness:0.1 });
  const mFront  = new THREE.MeshStandardMaterial({ color: front?0xffffff:0xcccccc, map: front, roughness:0.8,  metalness:0.1 });
  const mBack   = new THREE.MeshStandardMaterial({ color: back?0xffffff:0xcccccc,  map: back,  roughness:0.8,  metalness:0.1 });

  // caps pe ±X, laterale pe ±Z
  return [mFront, mBack, mTop, mBottom, mSide, mSide];
}

function parsePosDEF(p){
  const s = String(p||'').trim().toUpperCase();
  const m = s.match(/^([D-F])(\d{1,2})([A-Z])?$/);
  return m ? { band:m[1], index:+m[2], level:m[3]||'A' } : null;
}

export default function createContainersDEF(data, layout){
  const layer = new THREE.Group();
  const list = (data?.containers||[])
    .map(r=>({rec:r, pos:parsePosDEF(r.pos ?? r.posicion)}))
    .filter(x=>x.pos);
  if (!list.length) return layer;

  // bucket pe (tipo, brand)
  const groups = new Map();
  for (const {rec,pos} of list){
    const tipo  = (rec.tipo||'40bajo').toLowerCase();
    const dims  = SIZE_BY_TIPO[tipo] || SIZE_BY_TIPO['40bajo'];
    const brand = normBrand(rec.naviera||'');
    const key = `${tipo}|${brand}`;
    if (!groups.has(key)) groups.set(key, { dims, brand, items: [] });
    groups.get(key).items.push(pos);
  }

  groups.forEach(g=>{
    // Geometria rămâne cu L pe X, dar instanța o rotim 90° Y ⇒ lungime efectivă pe Z
    const geom = new THREE.BoxGeometry(g.dims.L, g.dims.H, g.dims.W);
    const mats = makeMaterialsCapsOnX_ZLength(g.brand, g.dims.L);
    const mesh = new THREE.InstancedMesh(geom, mats, g.items.length);
    mesh.castShadow = mesh.receiveShadow = true;

    const M=new THREE.Matrix4(), P=new THREE.Vector3(), Q=new THREE.Quaternion(), S=new THREE.Vector3(1,1,1);
    g.items.forEach((slot,i)=>{
      const wp = slotToWorld({lane:slot.band,index:slot.index,tier:slot.level},{...layout,abcNumbersReversed:true});
      P.copy(wp.position);
      // rotY = PI/2 → lungime pe Z; caps rămân mapate pe ±X (fețele 0/1).
      Q.setFromAxisAngle(new THREE.Vector3(0,1,0), Math.PI/2);
      M.compose(P,Q,S);
      mesh.setMatrixAt(i,M);
    });

    layer.add(mesh);
  });

  layer.userData.solid = true;
  return layer;
}
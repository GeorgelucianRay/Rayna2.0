// src/components/depot/map/world/worldStore.js

// ===== MODIFICARE: Am șters importul 'uuid' care cauza eroarea =====
// import { v4 as uuidv4 } from 'uuid'; 

const LS_KEY = 'rayna.world.edits';

let state = {
  props: [], // [{id,type,pos:[x,y,z],rotY,scale:[sx,sy,sz], params:{...}}]
};

// ===== MODIFICARE: Funcție simplă pentru a înlocui uuidv4 =====
const simpleID = () => `id-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export function loadWorldEdits() {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(LS_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.props)) state = parsed;
    }
  } catch {}
  return state;
}

export function saveWorldEdits() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {}
}

export function addProp({ type, pos, rotY = 0, scale = [1,1,1], params = {} }) {
  // ===== MODIFICARE: Folosim noua funcție simpleID() =====
  const item = { id: simpleID(), type, pos, rotY, scale, params };
  state.props.push(item);
  saveWorldEdits();
  return item;
}

export function removeProp(id) {
  state.props = state.props.filter(p => p.id !== id);
  saveWorldEdits();
}

export function getProps() { return state.props; }

export function exportJSON() {
  return JSON.stringify(state, null, 2);
}

export function exportCSV() {
  // CSV simplu: id,type,x,y,z,rotY,sx,sy,sz,params(json)
  const rows = ['id,type,x,y,z,rotY,sx,sy,sz,params'];
  state.props.forEach(p => {
    const [x,y,z] = p.pos;
    const [sx,sy,sz] = p.scale ?? [1,1,1];
    // evităm virgule în câmpul params
    const paramsStr = JSON.stringify(p.params ?? {}).replaceAll(',', ';');
    rows.push(`${p.id},${p.type},${x},${y},${z},${p.rotY},${sx},${sy},${sz},${paramsStr}`);
  });
  return rows.join('\n');
}

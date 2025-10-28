// src/components/depot/map/world/worldStore.js
// ASCII quotes only
import { v4 as uuidv4 } from 'uuid';

const LS_KEY = 'rayna.world.edits';

// ---------------- State + pub/sub ----------------
let state = { props: [] };
const listeners = new Set();

function notify() { for (const fn of listeners) fn(state); }
export function subscribe(fn) { listeners.add(fn); fn(state); return () => listeners.delete(fn); }

// ---------------- Safe storage -------------------
const storage = {
  getItem: (k) => { try { return localStorage?.getItem(k); } catch { return null; } },
  setItem: (k, v) => { try { localStorage?.setItem(k, v); return true; } catch { return false; } },
  removeItem: (k) => { try { localStorage?.removeItem(k); } catch {} },
};

// ---------------- Load / Save --------------------
export function loadWorldEdits() {
  try {
    const raw = storage.getItem(LS_KEY);
    if (raw) state = JSON.parse(raw);
  } catch { state = { props: [] }; }
  notify();
  return state;
}
export function saveWorldEdits() { try { storage.setItem(LS_KEY, JSON.stringify(state)); } catch {} }

// init on import
loadWorldEdits();

// ---------------- Getters ------------------------
export function getProps() { return state.props; }
export function getPropById(id) { return state.props.find(p => p.id === id) || null; }
// (opțional, util la debug)
export function getState() { return state; }

// ---------------- Mutators -----------------------
export function addProp({ type, pos, rotY = 0, scale = [1, 1, 1], params = {} }) {
  const item = { id: uuidv4(), type, pos, rotY, scale, params, ts: Date.now() };
  state.props.push(item);
  saveWorldEdits(); notify();
  return item;
}

export function updateProp(id, partial) {
  const idx = state.props.findIndex(p => p.id === id);
  if (idx === -1) return;
  state.props[idx] = { ...state.props[idx], ...partial };
  saveWorldEdits(); notify();
}

export function removeProp(id) {
  state.props = state.props.filter(p => p.id !== id);
  saveWorldEdits(); notify();
}

export function clearAllProps() {
  state.props = [];
  saveWorldEdits(); notify();
}

// (opțional) înlocuiește toate props dintr-un foc
export function replaceAllProps(newProps) {
  state.props = Array.isArray(newProps) ? newProps : [];
  saveWorldEdits(); notify();
}

// ---------------- Export -------------------------
export function exportJSON() { return JSON.stringify(state, null, 2); }

export function exportCSV() {
  const rows = ['id,type,x,y,z,rotY,sx,sy,sz,params'];
  const safeReplace = (str) => {
    // în browsere vechi .replaceAll poate lipsi
    try { return str.replaceAll(',', ';'); } catch { return str.split(',').join(';'); }
  };

  state.props.forEach(p => {
    const [x, y, z] = p.pos;
    const [sx, sy, sz] = p.scale;
    const params = safeReplace(JSON.stringify(p.params));
    rows.push(`${p.id},${p.type},${x},${y},${z},${rotYToFixed(p.rotY)},${sx},${sy},${sz},"${params}"`);
  });
  return rows.join('\n');
}
function rotYToFixed(v) { const n = Number(v); return Number.isFinite(n) ? n.toFixed(4) : '0.0000'; }

// ---------------- Import (opțional) --------------
export function importJSON(jsonString) {
  try {
    const imported = JSON.parse(jsonString);
    if (!imported || !Array.isArray(imported.props)) throw new Error('Invalid format: missing "props" array');
    state = { props: imported.props };
    saveWorldEdits(); notify();
    return true;
  } catch (e) {
    console.warn('importJSON failed:', e);
    return false;
  }
}
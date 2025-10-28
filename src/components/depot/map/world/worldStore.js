// src/components/depot/map/world/worldStore.js
import { v4 as uuidv4 } from 'uuid';

const LS_KEY = 'rayna.world.edits';

// ------ state + pub/sub ------
let state = { props: [] };
const listeners = new Set();
const notify = () => { for (const fn of listeners) fn(state); };

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

// ------ load/save ------
export function loadWorldEdits() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) state = JSON.parse(raw); } catch {}
  notify(); return state;
}
function save() { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {} }

// init
loadWorldEdits();

// ------ getters ------
export const getProps = () => state.props;
export const getPropById = (id) => state.props.find(p => p.id === id) || null;

// ------ mutators ------
export function addProp({ type, pos, rotY = 0, scale = [1,1,1], params = {} }) {
  const item = { id: uuidv4(), type, pos, rotY, scale, params, ts: Date.now() };
  state.props.push(item); save(); notify(); return item;
}

export function updateProp(id, partial) {
  const i = state.props.findIndex(p => p.id === id);
  if (i === -1) return;
  state.props[i] = { ...state.props[i], ...partial, ts: state.props[i].ts ?? Date.now() };
  save(); notify();
}

export function removeProp(id) {
  state.props = state.props.filter(p => p.id !== id);
  save(); notify();
}

export function clearAllProps() { state.props = []; save(); notify(); }

// ------ export ------
export const exportJSON = () => JSON.stringify(state, null, 2);
export function exportCSV() {
  const rows = ['id,type,x,y,z,rotY,sx,sy,sz,params'];
  for (const p of state.props) {
    const [x,y,z] = p.pos, [sx,sy,sz] = p.scale;
    const params = JSON.stringify(p.params).replaceAll(',', ';');
    rows.push(`${p.id},${p.type},${x},${y},${z},${Number(p.rotY||0).toFixed(4)},${sx},${sy},${sz},${params}`);
  }
  return rows.join('\n');
}
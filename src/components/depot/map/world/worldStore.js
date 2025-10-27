// src/components/depot/map/world/worldStore.js
import { v4 as uuidv4 } from 'uuid';

const LS_KEY = 'rayna.world.edits';

// Structura de bază
let state = { props: [] };

// Încarcă din localStorage (la import)
export function loadWorldEdits() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) state = JSON.parse(raw);
  } catch {}
  return state;
}
loadWorldEdits();

export function saveWorldEdits() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {}
}

export function getProps() {
  return state.props;
}

export function addProp({ type, pos, rotY = 0, scale = [1, 1, 1], params = {} }) {
  const item = { id: uuidv4(), type, pos, rotY, scale, params };
  state.props.push(item);
  saveWorldEdits();
  return item;
}

export function removeProp(id) {
  state.props = state.props.filter(p => p.id !== id);
  saveWorldEdits();
}

export function clearAllProps() {
  state.props = [];
  saveWorldEdits();
}

// Exporturi
export function exportJSON() {
  return JSON.stringify(state, null, 2);
}

export function exportCSV() {
  const rows = ['id,type,x,y,z,rotY,sx,sy,sz,params'];
  state.props.forEach(p => {
    const [x, y, z] = p.pos;
    const [sx, sy, sz] = p.scale;
    const params = JSON.stringify(p.params).replaceAll(',', ';');
    rows.push(`${p.id},${p.type},${x},${y},${z},${rotYToFixed(p.rotY)},${sx},${sy},${sz},${params}`);
  });
  return rows.join('\n');
}

function rotYToFixed(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(4) : '0';
}
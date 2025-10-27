// src/components/depot/map/world/worldStore.js
import { v4 as uuidv4 } from 'uuid';

const LS_KEY = 'rayna.world.edits';

// Structura de bază: { props: [ {id,type,pos:[x,y,z],rotY,scale:[sx,sy,sz],params:{}} ] }
function readState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { props: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.props)) return { props: [] };
    return parsed;
  } catch {
    return { props: [] };
  }
}

function writeState(state) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {}
}

let state = readState();

/* ----------------- API principal (compat + extins) ----------------- */

// Lista curentă (copie)
export function getProps() {
  return state.props.slice();
}

// Adaugă un obiect nou în lume
// Acceptă fie obiect complet {id?, type, pos, rotY?, scale?, params?},
// fie semnătură "pe câmpuri" similară cu varianta ta veche.
export function addProp(arg) {
  let item;
  if (arg && arg.type && Array.isArray(arg.pos)) {
    // forma ta veche: { type, pos, rotY, scale, params }
    const {
      id = uuidv4(),
      type,
      pos,
      rotY = 0,
      scale = [1, 1, 1],
      params = {}
    } = arg;
    item = { id, type, pos, rotY, scale, params };
  } else {
    // fallback defensiv
    item = {
      id: uuidv4(),
      type: String(arg?.type || 'unknown'),
      pos: Array.isArray(arg?.pos) ? arg.pos : [0, 0, 0],
      rotY: Number(arg?.rotY || 0),
      scale: Array.isArray(arg?.scale) ? arg.scale : [1, 1, 1],
      params: arg?.params || {}
    };
  }

  state.props.push(item);
  writeState(state);
  return item;
}

// Șterge după id
export function removeProp(id) {
  state.props = state.props.filter(p => p.id !== id);
  writeState(state);
}

// Golește tot
export function clearAllProps() {
  state.props = [];
  writeState(state);
}

// Citește un prop după id
export function getPropById(id) {
  return state.props.find(p => p.id === id) || null;
}

// Update granular (poziție/rotație/scală/params/type)
export function updateProp(id, patch = {}) {
  const idx = state.props.findIndex(p => p.id === id);
  if (idx === -1) return false;

  const cur = state.props[idx];
  const next = { ...cur };

  if (patch.pos) {
    const [x = cur.pos?.[0] ?? 0, y = cur.pos?.[1] ?? 0, z = cur.pos?.[2] ?? 0] = patch.pos;
    next.pos = [x, y, z];
  }
  if (typeof patch.rotY === 'number') next.rotY = patch.rotY;

  if (patch.scale) {
    const [sx = cur.scale?.[0] ?? 1, sy = cur.scale?.[1] ?? 1, sz = cur.scale?.[2] ?? 1] = patch.scale;
    next.scale = [sx, sy, sz];
  }
  if (patch.params) {
    next.params = { ...(cur.params || {}), ...(patch.params || {}) };
  }
  if (typeof patch.type === 'string') next.type = patch.type;

  state.props[idx] = next;
  writeState(state);
  return true;
}

/* ----------------- Focus (pt. mișcare cu săgeți) ----------------- */

let focusedId = null;

export function setFocusedId(id) {
  focusedId = id ?? null;
}

export function getFocusedId() {
  return focusedId;
}

// Pas standard (metru) – folosit de controller/ArrowPad
export const DEFAULT_STEP = 1;

/* ----------------- Export ----------------- */

export function exportJSON() {
  return JSON.stringify(state, null, 2);
}

export function exportCSV() {
  const rows = ['id,type,x,y,z,rotY,sx,sy,sz,params'];
  state.props.forEach(p => {
    const [x = 0, y = 0, z = 0] = p.pos || [];
    const [sx = 1, sy = 1, sz = 1] = p.scale || [];
    const params = JSON.stringify(p.params || {}).replaceAll(',', ';');
    rows.push(`${p.id},${p.type},${x},${y},${z},${rotYToFixed(p.rotY)},${sx},${sy},${sz},${params}`);
  });
  return rows.join('\n');
}

function rotYToFixed(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(4) : '0.0000';
}
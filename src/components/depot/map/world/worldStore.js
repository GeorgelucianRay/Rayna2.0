// world/worldStore.js
import { nanoid } from 'uuid';

const LS_KEY = 'rayna.world.edits';

let state = {
  props: [], // [{id,type,pos:[x,y,z],rotY,scale:[sx,sy,sz], params:{...}}]
};

export function loadWorldEdits() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) state = JSON.parse(raw);
  } catch {}
  return state;
}
export function saveWorldEdits() {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

export function addProp({ type, pos, rotY=0, scale=[1,1,1], params={} }) {
  const item = { id: nanoid(), type, pos, rotY, scale, params };
  state.props.push(item);
  saveWorldEdits();
  return item;
}
export function removeProp(id) {
  state.props = state.props.filter(p => p.id !== id);
  saveWorldEdits();
}

export function getProps() { return state.props; }

// Exporturi
export function exportJSON() {
  return JSON.stringify(state, null, 2);
}
export function exportCSV() {
  // CSV simplu: id,type,x,y,z,rotY,sx,sy,sz,params(json)
  const rows = ['id,type,x,y,z,rotY,sx,sy,sz,params'];
  state.props.forEach(p => {
    const [x,y,z] = p.pos; const [sx,sy,sz] = p.scale;
    rows.push(`${p.id},${p.type},${x},${y},${z},${p.rotY},${sx},${sy},${sz},${JSON.stringify(p.params).replaceAll(',', ';')}`);
  });
  return rows.join('\n');
}
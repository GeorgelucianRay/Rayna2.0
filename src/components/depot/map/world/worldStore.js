// worldStore.js - Gestionare state pentru obiecte 3D
import { v4 as uuidv4 } from ‘uuid’;

const LS_KEY = ‘rayna.world.edits’;

// —— STATE + LISTENERS (pub-sub) ——
let state = { props: [] };
const listeners = new Set();

function notify() {
for (const fn of listeners) fn(state);
}

export function subscribe(fn) {
listeners.add(fn);
fn(state); // Trimite state-ul imediat la subscribe
return () => listeners.delete(fn);
}

// —— STORAGE WRAPPER (cu fallback) ——
const storage = {
getItem: (key) => {
try {
return localStorage?.getItem(key);
} catch (e) {
console.warn(‘localStorage.getItem failed:’, e);
return null;
}
},
setItem: (key, value) => {
try {
localStorage?.setItem(key, value);
return true;
} catch (e) {
console.warn(‘localStorage.setItem failed:’, e);
return false;
}
},
removeItem: (key) => {
try {
localStorage?.removeItem(key);
} catch (e) {
console.warn(‘localStorage.removeItem failed:’, e);
}
}
};

// —— LOAD / SAVE ——
export function loadWorldEdits() {
try {
const raw = storage.getItem(LS_KEY);
if (raw) {
state = JSON.parse(raw);
console.log(‘✅ Încărcat din localStorage:’, state.props.length, ‘obiecte’);
} else {
console.log(‘ℹ️ Nu există date salvate’);
}
} catch (e) {
console.error(‘❌ Eroare la încărcare:’, e);
state = { props: [] };
}
notify();
return state;
}

export function saveWorldEdits() {
try {
const success = storage.setItem(LS_KEY, JSON.stringify(state));
if (success) {
console.log(‘💾 Salvat în localStorage:’, state.props.length, ‘obiecte’);
}
} catch (e) {
console.error(‘❌ Eroare la salvare:’, e);
}
}

// Init la import
loadWorldEdits();

// —— GETTERS ——
export function getProps() {
return state.props;
}

export function getPropById(id) {
return state.props.find(p => p.id === id) || null;
}

// —— MUTATORS ——
export function addProp({ type, pos, rotY = 0, scale = [1, 1, 1], params = {} }) {
const item = {
id: uuidv4(),
type,
pos,
rotY,
scale,
params,
ts: Date.now()
};

state.props.push(item);
console.log(‘➕ Adăugat obiect:’, item);

saveWorldEdits();
notify();
return item;
}

export function updateProp(id, partial) {
const idx = state.props.findIndex(p => p.id === id);
if (idx === -1) {
console.warn(‘⚠️ Obiect inexistent pentru update:’, id);
return;
}

state.props[idx] = { …state.props[idx], …partial };
console.log(‘✏️ Actualizat obiect:’, id, partial);

saveWorldEdits();
notify();
}

export function removeProp(id) {
const oldLength = state.props.length;
state.props = state.props.filter(p => p.id !== id);

if (state.props.length < oldLength) {
console.log(‘🗑️ Șters obiect:’, id);
saveWorldEdits();
notify();
} else {
console.warn(‘⚠️ Obiect inexistent pentru ștergere:’, id);
}
}

export function clearAllProps() {
state.props = [];
console.log(‘🧹 Toate obiectele șterse’);
saveWorldEdits();
notify();
}

// —— EXPORT ——
export function exportJSON() {
if (state.props.length === 0) {
console.warn(‘⚠️ Nu există obiecte de exportat’);
}
return JSON.stringify(state, null, 2);
}

export function exportCSV() {
if (state.props.length === 0) {
console.warn(‘⚠️ Nu există obiecte de exportat’);
return ‘id,type,x,y,z,rotY,sx,sy,sz,params\n’;
}

const rows = [‘id,type,x,y,z,rotY,sx,sy,sz,params’];

state.props.forEach(p => {
const [x, y, z] = p.pos;
const [sx, sy, sz] = p.scale;
const params = JSON.stringify(p.params).replaceAll(’,’, ‘;’);
rows.push(
`${p.id},${p.type},${x},${y},${z},${rotYToFixed(p.rotY)},${sx},${sy},${sz},"${params}"`
);
});

return rows.join(’\n’);
}

function rotYToFixed(v) {
const n = Number(v);
return Number.isFinite(n) ? n.toFixed(4) : ‘0.0000’;
}

// —— IMPORT (bonus: poți importa JSON înapoi) ——
export function importJSON(jsonString) {
try {
const imported = JSON.parse(jsonString);
if (!imported.props || !Array.isArray(imported.props)) {
throw new Error(‘Format invalid: lipsește array-ul “props”’);
}

```
state = imported;
saveWorldEdits();
notify();
console.log('📥 Importat cu succes:', state.props.length, 'obiecte');
return true;
```

} catch (e) {
console.error(‘❌ Eroare import JSON:’, e);
return false;
}
}
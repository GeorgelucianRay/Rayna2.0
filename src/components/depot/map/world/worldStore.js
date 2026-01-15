// src/components/depot/map/world/worldStore.js
// ASCII quotes only
import { v4 as uuidv4 } from "uuid";

const LS_KEY = "rayna.world.edits";
const SCHEMA_VERSION = 1;

// ---------------- State + pub/sub ----------------
let state = { schemaVersion: SCHEMA_VERSION, props: [] };
const listeners = new Set();

function notify() {
  for (const fn of listeners) {
    try {
      fn(state);
    } catch (e) {
      console.warn("[worldStore] listener error:", e);
    }
  }
}

export function subscribe(fn) {
  listeners.add(fn);
  // push immediately
  try {
    fn(state);
  } catch (e) {
    console.warn("[worldStore] subscribe init error:", e);
  }
  return () => listeners.delete(fn);
}

// ---------------- Safe storage -------------------
const storage = {
  getItem: (k) => {
    try {
      return localStorage?.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      localStorage?.setItem(k, v);
      return true;
    } catch {
      return false;
    }
  },
  removeItem: (k) => {
    try {
      localStorage?.removeItem(k);
    } catch {}
  },
};

// ---------------- Validation helpers -------------
function isFiniteNum(n) {
  return Number.isFinite(Number(n));
}
function toNum(n, fallback = 0) {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}
function normVec3(v, fallback = [0, 0, 0]) {
  if (!Array.isArray(v) || v.length < 3) return fallback;
  const x = toNum(v[0], fallback[0]);
  const y = toNum(v[1], fallback[1]);
  const z = toNum(v[2], fallback[2]);
  return [x, y, z];
}
function normScale(v) {
  const s = normVec3(v, [1, 1, 1]);
  // prevent 0/negative weirdness
  return [Math.max(0.0001, s[0]), Math.max(0.0001, s[1]), Math.max(0.0001, s[2])];
}

function sanitizeProp(p) {
  if (!p || typeof p !== "object") return null;

  const id = String(p.id || "").trim() || uuidv4();
  const type = String(p.type || "").trim();
  if (!type) return null;

  const pos = normVec3(p.pos, [0, 0, 0]);
  const rotY = toNum(p.rotY, 0);
  const scale = normScale(p.scale || [1, 1, 1]);
  const params = p.params && typeof p.params === "object" ? p.params : {};
  const ts = isFiniteNum(p.ts) ? Number(p.ts) : Date.now();

  return { id, type, pos, rotY, scale, params, ts };
}

function sanitizeState(s) {
  const base = { schemaVersion: SCHEMA_VERSION, props: [] };

  if (!s || typeof s !== "object") return base;

  const propsRaw = Array.isArray(s.props) ? s.props : [];
  const cleaned = [];
  const seen = new Set();

  for (const p of propsRaw) {
    const sp = sanitizeProp(p);
    if (!sp) continue;
    if (seen.has(sp.id)) continue; // dedupe
    seen.add(sp.id);
    cleaned.push(sp);
  }

  // sort stable by ts asc (or keep insertion order if you prefer)
  cleaned.sort((a, b) => (a.ts || 0) - (b.ts || 0));

  return {
    schemaVersion: SCHEMA_VERSION,
    props: cleaned,
  };
}

// ---------------- Load / Save --------------------
export function loadWorldEdits() {
  try {
    const raw = storage.getItem(LS_KEY);
    if (!raw) {
      state = sanitizeState(state);
      notify();
      return state;
    }

    const parsed = JSON.parse(raw);
    state = sanitizeState(parsed);
  } catch {
    state = { schemaVersion: SCHEMA_VERSION, props: [] };
  }

  notify();
  return state;
}

export function saveWorldEdits() {
  try {
    storage.setItem(LS_KEY, JSON.stringify(state));
  } catch {}
}

// init on import
loadWorldEdits();

// ---------------- Getters ------------------------
export function getProps() {
  return state.props;
}

export function getPropById(id) {
  const k = String(id || "").trim();
  if (!k) return null;
  return state.props.find((p) => p.id === k) || null;
}

// optional debug
export function getState() {
  return state;
}

// ---------------- Mutators -----------------------
export function addProp({ type, pos, rotY = 0, scale = [1, 1, 1], params = {} }) {
  const item = sanitizeProp({
    id: uuidv4(),
    type,
    pos,
    rotY,
    scale,
    params,
    ts: Date.now(),
  });

  if (!item) return null;

  state.props.push(item);
  saveWorldEdits();
  notify();
  return item;
}

export function updateProp(id, partial) {
  const k = String(id || "").trim();
  if (!k) return;

  const idx = state.props.findIndex((p) => p.id === k);
  if (idx === -1) return;

  const prev = state.props[idx];
  const next = sanitizeProp({ ...prev, ...(partial || {}), id: prev.id, type: prev.type, ts: prev.ts });
  if (!next) return;

  state.props[idx] = next;
  saveWorldEdits();
  notify();
}

export function removeProp(id) {
  const k = String(id || "").trim();
  if (!k) return;

  state.props = state.props.filter((p) => p.id !== k);
  saveWorldEdits();
  notify();
}

export function clearAllProps() {
  state.props = [];
  saveWorldEdits();
  notify();
}

export function replaceAllProps(newProps) {
  const next = sanitizeState({ props: newProps });
  state = next;
  saveWorldEdits();
  notify();
}

// ---------------- Export -------------------------
export function exportJSON() {
  return JSON.stringify(state, null, 2);
}

export function exportCSV() {
  const rows = ["id,type,x,y,z,rotY,sx,sy,sz,params"];
  const safeReplace = (str) => {
    try {
      return String(str).replaceAll(",", ";");
    } catch {
      return String(str).split(",").join(";");
    }
  };

  for (const p of state.props) {
    const [x, y, z] = p.pos || [0, 0, 0];
    const [sx, sy, sz] = p.scale || [1, 1, 1];
    const params = safeReplace(JSON.stringify(p.params || {}));
    // ✅ FIX: folosim p.rotY, nu "rotY" inexistent
    rows.push(
      `${p.id},${p.type},${x},${y},${z},${rotYToFixed(p.rotY)},${sx},${sy},${sz},"${params}"`
    );
  }

  return rows.join("\n");
}

function rotYToFixed(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(4) : "0.0000";
}

// ---------------- Import -------------------------
export function importJSON(jsonString) {
  try {
    const imported = JSON.parse(jsonString);

    // acceptam fie {props:[...]}, fie {schemaVersion, props:[...]}
    if (!imported || !Array.isArray(imported.props)) {
      throw new Error('Invalid format: missing "props" array');
    }

    state = sanitizeState(imported);
    saveWorldEdits();
    notify();
    return true;
  } catch (e) {
    console.warn("[worldStore] importJSON failed:", e);
    return false;
  }
}
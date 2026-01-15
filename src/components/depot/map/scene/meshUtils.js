// src/components/depot/map/scene/meshUtils.js
export function collectMeshes(root, { excludeNameIncludes = [] } = {}) {
  const out = [];
  if (!root) return out;
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const nm = (obj.name || "").toLowerCase();
    for (const frag of excludeNameIncludes) {
      if (nm.includes(String(frag).toLowerCase())) return;
    }
    out.push(obj);
  });
  return out;
}

export function findUp(start, predicate) {
  let cur = start;
  while (cur) {
    if (predicate(cur)) return cur;
    cur = cur.parent;
  }
  return null;
}
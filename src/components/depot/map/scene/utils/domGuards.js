// src/components/depot/map/scene/utils/domGuards.js
// ASCII quotes only

export function isOverUIFromPoint(x, y, selector) {
  try {
    const el = document.elementFromPoint(x, y);
    if (!el) return false;
    return !!el.closest(selector);
  } catch {
    return false;
  }
}

export function isOverMapUI(x, y) {
  // Map UI: navbar/topmenu/zoom etc
  return isOverUIFromPoint(x, y, '[data-map-ui="1"]');
}

export function isOverBuildUI(x, y) {
  // Build UI: palette/pads/buttons
  return isOverUIFromPoint(x, y, '[data-build-ui="true"]');
}
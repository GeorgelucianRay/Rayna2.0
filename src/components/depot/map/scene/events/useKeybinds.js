// src/components/depot/map/scene/events/useKeybinds.js
// ASCII quotes only
import { useEffect } from 'react';

function isTypingTarget(e) {
  const t = e?.target;
  const tag = (t?.tagName || '').toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || t?.isContentEditable;
}

/**
 * @param {object} o
 * @param {boolean} o.enabled
 * @param {(e: KeyboardEvent) => void} o.onKeyDown
 */
export default function useKeybinds({ enabled, onKeyDown }) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e) => {
      if (isTypingTarget(e)) return;
      onKeyDown?.(e);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled, onKeyDown]);
}
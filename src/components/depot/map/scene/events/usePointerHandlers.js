// src/components/depot/map/scene/events/usePointerHandlers.js
// ASCII quotes only
import { useEffect, useCallback } from 'react';
import { isOverMapUI, isOverBuildUI } from '../utils/domGuards';

/**
 * @param {object} o
 * @param {HTMLElement|null} o.canvasEl
 * @param {() => boolean} o.getBuildActive
 * @param {(x:number,y:number) => void} o.onBuildMove
 * @param {(x:number,y:number) => void} o.onBuildClick
 * @param {(e:PointerEvent) => void} o.onPick
 */
export default function usePointerHandlers({
  canvasEl,
  getBuildActive,
  onBuildMove,
  onBuildClick,
  onPick,
}) {
  const handlePointerMove = useCallback(
    (e) => {
      if (!canvasEl) return;
      const x = e.clientX ?? 0;
      const y = e.clientY ?? 0;

      // Preview-ul build nu trebuie să “stea” peste UI build
      if (getBuildActive?.()) {
        if (isOverBuildUI(x, y)) return;
        onBuildMove?.(x, y);
      }
    },
    [canvasEl, getBuildActive, onBuildMove]
  );

  const handlePointerDown = useCallback(
    (e) => {
      if (!canvasEl) return;
      const x = e.clientX ?? 0;
      const y = e.clientY ?? 0;

      // Dacă e click pe UI map, nu pick/build
      if (isOverMapUI(x, y)) return;

      // Build are prioritate când e activ, dar ignoră click-ul pe UI build
      if (getBuildActive?.()) {
        if (isOverBuildUI(x, y)) return;
        onBuildClick?.(x, y);
        return;
      }

      // altfel -> picking normal
      onPick?.(e);
    },
    [canvasEl, getBuildActive, onBuildClick, onPick]
  );

  useEffect(() => {
    if (!canvasEl) return;

    canvasEl.addEventListener('pointermove', handlePointerMove, { passive: true });
    canvasEl.addEventListener('pointerdown', handlePointerDown, { passive: true });

    return () => {
      canvasEl.removeEventListener('pointermove', handlePointerMove);
      canvasEl.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [canvasEl, handlePointerMove, handlePointerDown]);
}
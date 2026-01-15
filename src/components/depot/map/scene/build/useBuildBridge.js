// src/components/depot/map/scene/build/useBuildBridge.js
// ASCII quotes only
import { useCallback, useMemo } from 'react';

/**
 * Bridge între:
 * - useDepotScene (FP/orbit state)
 * - buildController (raycast + preview + place/remove)
 *
 * @param {object} o
 * @param {() => any} o.getBuildController
 * @param {() => boolean} o.getIsFP
 * @param {() => any} o.getCamera
 */
export default function useBuildBridge({ getBuildController, getIsFP, getCamera }) {
  const onBuildMove = useCallback(
    (x, y) => {
      const bc = getBuildController?.();
      if (!bc) return;

      // Orbit/mouse preview
      bc.updatePreviewAt?.(x, y);
    },
    [getBuildController]
  );

  const onBuildClick = useCallback(
    (x, y) => {
      const bc = getBuildController?.();
      if (!bc) return;

      // Orbit click place/remove
      bc.clickAt?.(x, y);
    },
    [getBuildController]
  );

  // FP: preview + place din crosshair (nu folosește mouse x/y)
  const fpPreviewTick = useCallback(() => {
    const bc = getBuildController?.();
    const cam = getCamera?.();
    if (!bc || !cam) return;
    if (!getIsFP?.()) return;

    // Controller trebuie să implementeze metoda asta
    bc.updatePreviewFromCamera?.(cam);
  }, [getBuildController, getCamera, getIsFP]);

  const fpPlace = useCallback(() => {
    const bc = getBuildController?.();
    const cam = getCamera?.();
    if (!bc || !cam) return;

    // Controller trebuie să implementeze metoda asta
    bc.clickFromCamera?.(cam);
  }, [getBuildController, getCamera]);

  // Tastatură: în FP, E poate fi "place" când buildActive, sau "select" când build inactive
  const buildHotkeys = useMemo(() => {
    return {
      isBuildKey(e) {
        return e?.code === 'KeyE' || e?.code === 'Enter';
      },
    };
  }, []);

  return {
    onBuildMove,
    onBuildClick,
    fpPreviewTick,
    fpPlace,
    buildHotkeys,
  };
}
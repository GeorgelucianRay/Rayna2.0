// src/components/depot/map/scene/useContainersLayer.js
import { useCallback, useRef, useState } from "react";

import fetchContainers from "../threeWorld/fetchContainers";
import createContainersLayerOptimized from "../threeWorld/createContainersLayerOptimized";

/**
 * Gestionare layer containere:
 * - fetch din DB
 * - rebuild layer THREE
 * - expose refreshContainers()
 * - expose containers state
 *
 * Nu decide FP / Orbit / Build. Doar atașează layer-ul și returnează info.
 */
export function useContainersLayer({ depotGroupRef, cfg, fpRef, collidersRef }) {
  const [containers, setContainers] = useState([]);
  const layerRef = useRef(null);

  const detachOldLayer = useCallback(() => {
    const depotGroup = depotGroupRef?.current;
    if (!depotGroup) return;

    if (layerRef.current) {
      try {
        depotGroup.remove(layerRef.current);
      } catch {}
      layerRef.current = null;
    }
  }, [depotGroupRef]);

  const attachFP = useCallback(() => {
    const fp = fpRef?.current;
    const layerNow = layerRef.current;
    if (!fp || !layerNow) return;

    // 1) interactables (containere selectabile)
    const interactables = [];
    layerNow.traverse((o) => {
      if (o?.isInstancedMesh && o.userData?.records) interactables.push(o);
      if (o?.isMesh && o.userData?.__record) interactables.push(o);
    });

    fp.setInteractTargets?.(interactables);
    fp.setInteractables?.(interactables);
    fp.setRaycastTargets?.(interactables);

    // 2) colliders: base + (dacă există) layer.userData.colliders
    const baseCols = collidersRef?.current || [];
    const colGroup = layerNow?.userData?.colliders || null;

    const nextCols = colGroup ? [...baseCols, colGroup] : [...baseCols];

    fp.setColliders?.(nextCols);
    (fp.setCollisionTargets || fp.setColliders)?.(nextCols);
  }, [fpRef, collidersRef]);

  const refreshContainers = useCallback(async () => {
    const depotGroup = depotGroupRef?.current;
    if (!depotGroup) return [];

    try {
      const data = await fetchContainers();
      const list = data?.containers || [];
      setContainers(list);

      // rebuild layer
      detachOldLayer();
      const layer = createContainersLayerOptimized(data, cfg.ground);
      layerRef.current = layer;
      depotGroup.add(layer);

      // attach FP (cu retry mic dacă layer setează colliders async)
      const tryAttach = (triesLeft = 6) => {
        const hasCols = !!layerRef.current?.userData?.colliders;
        if (hasCols || triesLeft <= 0) {
          attachFP();
          return;
        }
        setTimeout(() => tryAttach(triesLeft - 1), 50);
      };
      tryAttach();

      return list;
    } catch (e) {
      console.warn("❌ refreshContainers error:", e);
      setContainers([]);
      detachOldLayer();
      return [];
    }
  }, [depotGroupRef, cfg, detachOldLayer, attachFP]);

  return {
    containers,
    containersLayerRef: layerRef,
    refreshContainers,
    detachOldLayer,
  };
}
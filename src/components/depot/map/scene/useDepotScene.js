// src/components/depot/map/scene/useDepotScene.js
// ASCII quotes only
import * as THREE from "three";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CFG, YARD_WIDTH, YARD_DEPTH, makeBounds, makeOrbitClamp } from "./sceneConfig";

import { useWorldBase } from "./useWorldBase";
import { useContainersLayer } from "./useContainersLayer";
import { useSelection } from "./useSelection";
import { useFirstPersonRig } from "./useFirstPersonRig";
import { useCameraModes } from "./useCameraModes";

import usePointerHandlers from "./events/usePointerHandlers";
import useKeybinds from "./events/useKeybinds";

import useBuildBridge from "./build/useBuildBridge";
import createBuildController from "../world/buildController";

export default function useDepotScene() {
  // ------------------------------------------------------------
  // 0) Mount
  // ------------------------------------------------------------
  const mountRef = useRef(null);

  // ------------------------------------------------------------
  // 1) Config + yard
  // ------------------------------------------------------------
  const cfg = CFG;

  const yard = useMemo(() => ({ width: YARD_WIDTH, depth: YARD_DEPTH }), []);
  const bounds = useMemo(() => makeBounds(), []);
  const clampOrbitFn = useMemo(() => makeOrbitClamp(), []);

  const yardBounds = useMemo(() => {
    return {
      yardMinX: -YARD_WIDTH / 2 + 0.5,
      yardMaxX: YARD_WIDTH / 2 - 0.5,
      yardMinZ: -YARD_DEPTH / 2 + 0.5,
      yardMaxZ: YARD_DEPTH / 2 - 0.5,
    };
  }, []);

  // ------------------------------------------------------------
  // 2) Base world (renderer/scene/camera/orbit + ground/fence + groups + LOOP)
  // ------------------------------------------------------------
  const world = useWorldBase({ mountRef, cfg, yard });

  const {
    rendererRef,
    sceneRef,
    cameraRef,
    controlsRef,
    depotGroupRef,
    worldGroupRef,
    groundMeshRef,
    baseCollidersRef,
  } = world;

  // ------------------------------------------------------------
  // 3) Build state
  // ------------------------------------------------------------
  const [buildActive, setBuildActive] = useState(false);
  const buildActiveRef = useRef(false);
  useEffect(() => {
    buildActiveRef.current = !!buildActive;
  }, [buildActive]);

  const [buildMode, setBuildMode] = useState("place"); // "place" | "select" | "remove"

  // ------------------------------------------------------------
  // 4) First person rig (createFirstPerson + attach)
  //     NOTE: nu folosim rig.setFPEnabled aici, pentru ca useCameraModes controleaza enable/disable.
  // ------------------------------------------------------------
  const fpRig = useFirstPersonRig({
    cameraRef,
    rendererRef,
    controlsRef,
    bounds,
    buildActiveRef,
  });

  // ------------------------------------------------------------
  // 5) Camera modes (FP enable/disable + orbitLibre + clamp)
  // ------------------------------------------------------------
  const camModes = useCameraModes({
    controlsRef,
    cameraRef,
    fpRef: fpRig.fpRef,
    yardBounds,
    clampOrbitFn,
    buildActive,
  });

  // ------------------------------------------------------------
  // 6) Containers layer (fetch + rebuild layer + attach FP targets/colliders)
  // ------------------------------------------------------------
  const containersLayer = useContainersLayer({
    depotGroupRef,
    cfg,
    fpRef: fpRig.fpRef,
    collidersRef: baseCollidersRef,
  });

  // auto refresh la mount (cand exista depotGroup)
  useEffect(() => {
    if (!depotGroupRef.current) return;
    containersLayer.refreshContainers?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depotGroupRef.current]);

  // ------------------------------------------------------------
  // 7) Selection (highlight + marker + FP select)
  // ------------------------------------------------------------
  const onSelectedRef = useRef(null);

  const selection = useSelection({
    sceneRef,
    cameraRef,
    fpRef: fpRig.fpRef,
    cfg,
    onSelectedRef,
  });

  const setOnContainerSelected = useCallback((fn) => {
    onSelectedRef.current = fn;
  }, []);

  // ------------------------------------------------------------
  // 8) Build controller + bridge
  // ------------------------------------------------------------
  const buildControllerRef = useRef(null);

  // create build controller when we have camera + dom + worldGroup + ground
  useEffect(() => {
    const cam = cameraRef.current;
    const dom = rendererRef.current?.domElement || null;
    const wg = worldGroupRef.current;
    const ground = groundMeshRef.current;

    if (!cam || !wg || !ground) return;
    if (buildControllerRef.current) return;

    buildControllerRef.current = createBuildController({
      camera: cam,
      domElement: dom,
      worldGroup: wg,
      groundMesh: ground,
      grid: 1,
    });

    // initial sync
    buildControllerRef.current.setEnabled?.(!!buildActiveRef.current);
    buildControllerRef.current.setMode?.(buildMode);
    buildControllerRef.current.mountExistingFromStore?.();

    return () => {
      try {
        buildControllerRef.current?.dispose?.();
      } catch {}
      buildControllerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraRef.current, rendererRef.current, worldGroupRef.current, groundMeshRef.current]);

  // keep build controller synced
  useEffect(() => {
    buildControllerRef.current?.setEnabled?.(!!buildActive);
  }, [buildActive]);

  useEffect(() => {
    buildControllerRef.current?.setMode?.(buildMode);
  }, [buildMode]);

  const buildBridge = useBuildBridge({
    getBuildController: () => buildControllerRef.current,
    getIsFP: () => camModes.isFPRef.current,
    getCamera: () => cameraRef.current,
  });

  // ------------------------------------------------------------
  // 9) Orbit pick (cand build nu e activ): raycast pe containersLayerRef
  // ------------------------------------------------------------
  const pickRaycasterRef = useRef(new THREE.Raycaster());
  const pickNdcRef = useRef(new THREE.Vector2());

  const onPick = useCallback(
    (e) => {
      const cam = cameraRef.current;
      const renderer = rendererRef.current;
      const layer = containersLayer.containersLayerRef.current;

      if (!cam || !renderer || !layer) {
        onSelectedRef.current?.(null);
        selection.clearHighlight?.();
        return;
      }

      const rect = renderer.domElement.getBoundingClientRect();
      const x = e.clientX ?? 0;
      const y = e.clientY ?? 0;

      pickNdcRef.current.x = ((x - rect.left) / rect.width) * 2 - 1;
      pickNdcRef.current.y = -((y - rect.top) / rect.height) * 2 + 1;

      const ray = pickRaycasterRef.current;
      ray.setFromCamera(pickNdcRef.current, cam);

      // Intersectăm DOAR layer-ul de containere (mai rapid și mai sigur)
      const hits = ray.intersectObject(layer, true);

      if (!hits.length) {
        onSelectedRef.current?.(null);
        selection.clearHighlight?.();
        return;
      }

      const hit = hits[0];
      const obj = hit.object;

      // instanced holder (records)
      const instHolder = selection.findUp(obj, (o) => !!o?.isInstancedMesh && !!o?.userData?.records);
      if (instHolder?.isInstancedMesh && hit.instanceId != null) {
        const rec = instHolder.userData.records?.[hit.instanceId] || null;
        onSelectedRef.current?.(rec);
        if (rec) {
          selection.highlightContainer?.({ ...hit, object: instHolder });
          selection.showSelectedMarker?.(rec);
        } else {
          selection.clearHighlight?.();
        }
        return;
      }

      // mesh __record
      const recordHolder = selection.findUp(obj, (o) => !!o?.userData?.__record);
      if (recordHolder?.userData?.__record) {
        const rec = recordHolder.userData.__record;
        onSelectedRef.current?.(rec);
        selection.highlightContainer?.({ ...hit, object: recordHolder });
        selection.showSelectedMarker?.(rec);
        return;
      }

      onSelectedRef.current?.(null);
      selection.clearHighlight?.();
    },
    [cameraRef, rendererRef, containersLayer.containersLayerRef, selection]
  );

  // ------------------------------------------------------------
  // 10) Pointer handlers (build priority, else pick)
  // ------------------------------------------------------------
  usePointerHandlers({
    canvasEl: rendererRef.current?.domElement || null,
    getBuildActive: () => buildActiveRef.current,
    onBuildMove: buildBridge.onBuildMove,
    onBuildClick: buildBridge.onBuildClick,
    onPick,
  });

  // ------------------------------------------------------------
  // 11) Keybinds:
  // - daca buildActive + FP => E/Enter = build place/select/remove (fpPlace)
  // - altfel => E = select container din crosshair (selection.selectFromCrosshair)
  // ------------------------------------------------------------
  const onKeyDown = useCallback(
    (e) => {
      if (!buildBridge.buildHotkeys.isBuildKey(e)) return;

      if (buildActiveRef.current && camModes.isFPRef.current) {
        buildBridge.fpPlace?.();
        return;
      }

      // fallback: select container din crosshair (FP) / nu afecteaza orbit
      selection.selectFromCrosshair?.();
    },
    [buildBridge, camModes.isFPRef, selection]
  );

  useKeybinds({ enabled: true, onKeyDown });

  // ------------------------------------------------------------
  // 12) TICK LOOP (fara render; render e deja in useWorldBase)
  // - FP update
  // - orbitLibre tick + clamp
  // - build fp preview tick
  // - marker pulse
  // ------------------------------------------------------------
  useEffect(() => {
    let raf = 0;
    const clock = new THREE.Clock();

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const delta = clock.getDelta();

      // orbit / orbitLibre tick (nu randam aici)
      camModes.tickCamera?.(delta);

      // FP update (doar daca e FP)
      if (camModes.isFPRef.current) {
        fpRig.fpRef.current?.update?.(delta);
      }

      // build preview in FP (crosshair)
      if (buildActiveRef.current && camModes.isFPRef.current) {
        buildBridge.fpPreviewTick?.();
      }

      // marker pulse
      selection.tickMarkerPulse?.(delta);
    };

    tick();
    return () => cancelAnimationFrame(raf);
  }, [camModes, fpRig.fpRef, buildBridge, selection]);

  // ------------------------------------------------------------
  // 13) Public API pentru componenta/UI
  // ------------------------------------------------------------
  return {
    // mount target
    mountRef,

    // base refs (optional)
    rendererRef,
    sceneRef,
    cameraRef,
    controlsRef,
    depotGroupRef,
    worldGroupRef,

    // containers
    containers: containersLayer.containers,
    refreshContainers: containersLayer.refreshContainers,

    // selection callback
    setOnContainerSelected,

    // camera modes
    isFP: camModes.isFP,
    setFPEnabled: camModes.setFPEnabled,
    orbitLibre: camModes.orbitLibre,
    startOrbitLibre: camModes.startOrbitLibre,
    stopOrbitLibre: camModes.stopOrbitLibre,

    // build
    buildActive,
    setBuildActive,
    buildMode,
    setBuildMode,
    buildController: buildControllerRef.current,
  };
}
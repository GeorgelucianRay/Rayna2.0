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

// IMPORTANT: Map3DPage face `import { useDepotScene } from "./scene/useDepotScene";`
export function useDepotScene({ mountRef }) {
  // ------------------------------------------------------------
  // 1) Config + yard
  // ------------------------------------------------------------
  const cfg = CFG;

  const yard = useMemo(() => ({ width: YARD_WIDTH, depth: YARD_DEPTH }), []);
  const bounds = useMemo(() => makeBounds(), []);
  const clampOrbitFn = useMemo(() => makeOrbitClamp(), []);

  const yardBounds = useMemo(() => {
    const pad = 0.5;
    return {
      yardMinX: -YARD_WIDTH / 2 + pad,
      yardMaxX: YARD_WIDTH / 2 - pad,
      yardMinZ: -YARD_DEPTH / 2 + pad,
      yardMaxZ: YARD_DEPTH / 2 - pad,
    };
  }, []);

  // ------------------------------------------------------------
  // 2) Base world (renderer/scene/camera/orbit + ground/fence + LOOP render)
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
  // 3) Build state (compat cu Map3DPage)
  // ------------------------------------------------------------
  const [buildActive, setBuildActive] = useState(false);
  const buildActiveRef = useRef(false);
  useEffect(() => {
    buildActiveRef.current = !!buildActive;
  }, [buildActive]);

  const [buildMode, setBuildMode] = useState("place"); // place | select | remove

  // ------------------------------------------------------------
  // 4) First person rig
  // ------------------------------------------------------------
  const fpRig = useFirstPersonRig({
    cameraRef,
    rendererRef,
    controlsRef,
    bounds,
    buildActiveRef,
  });

  // ------------------------------------------------------------
  // 5) Camera modes (FP + OrbitLibre + clamp)
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
  // 6) Containers layer (fetch + layer + attach FP targets/colliders)
  // ------------------------------------------------------------
  const containersLayer = useContainersLayer({
    depotGroupRef,
    cfg,
    fpRef: fpRig.fpRef,
    collidersRef: baseCollidersRef,
  });

  const [containers, setContainers] = useState([]);
  const refreshContainers = useCallback(async () => {
    const list = await containersLayer.refreshContainers?.();
    const next = Array.isArray(list) ? list : containersLayer.containers || [];
    setContainers(next);
    return next;
  }, [containersLayer]);

  // refresh at mount
  useEffect(() => {
    if (!depotGroupRef.current) return;
    refreshContainers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depotGroupRef.current]);

  // ------------------------------------------------------------
  // 7) Selection (FP crosshair + marker + highlight)
  // ------------------------------------------------------------
  const onSelectedRef = useRef(null);
  const setOnContainerSelected = useCallback((fn) => {
    onSelectedRef.current = fn;
  }, []);

  const selection = useSelection({
    sceneRef,
    cameraRef,
    fpRef: fpRig.fpRef,
    cfg,
    onSelectedRef,
  });

  // ------------------------------------------------------------
  // 8) Build controller + bridge (compat cu BuildPalette din Map3DPage)
  // ------------------------------------------------------------
  const buildControllerRef = useRef(null);

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

    // sync initial
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

  const buildApi = useMemo(() => {
    return {
      controller: buildControllerRef.current,
      active: buildActive,
      mode: buildMode,
      setMode: setBuildMode,
    };
  }, [buildActive, buildMode]);

  // ------------------------------------------------------------
  // 9) Orbit picking (cand build e OFF): raycast pe containersLayerRef
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

      const hits = ray.intersectObject(layer, true);
      if (!hits.length) {
        onSelectedRef.current?.(null);
        selection.clearHighlight?.();
        return;
      }

      const hit = hits[0];
      const obj = hit.object;

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
  // 11) Keybinds: E/Enter
  // - buildActive + FP => build action
  // - altfel => select container from crosshair
  // ------------------------------------------------------------
  const onKeyDown = useCallback(
    (e) => {
      if (!buildBridge.buildHotkeys.isBuildKey(e)) return;

      if (buildActiveRef.current && camModes.isFPRef.current) {
        buildBridge.fpPlace?.();
        return;
      }

      selection.selectFromCrosshair?.();
    },
    [buildBridge, camModes.isFPRef, selection]
  );

  useKeybinds({ enabled: true, onKeyDown });

  // ------------------------------------------------------------
  // 12) Tick loop (FARA render; render e deja in useWorldBase)
  // ------------------------------------------------------------
  useEffect(() => {
    let raf = 0;
    const clock = new THREE.Clock();

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const delta = clock.getDelta();

      camModes.tickCamera?.(delta);

      if (camModes.isFPRef.current) {
        fpRig.updateFP?.(delta);
      }

      if (buildActiveRef.current && camModes.isFPRef.current) {
        buildBridge.fpPreviewTick?.();
      }

      selection.tickMarkerPulse?.(delta);
    };

    tick();
    return () => cancelAnimationFrame(raf);
  }, [camModes, fpRig, buildBridge, selection]);

  // ------------------------------------------------------------
  // 13) UX helpers cerute de Map3DPage
  // ------------------------------------------------------------
  const zoomIn = useCallback(() => {
    const cam = cameraRef.current;
    const ctl = controlsRef.current;
    if (!cam || !ctl) return;
    if (camModes.isFPRef.current) return;

    const dir = new THREE.Vector3().subVectors(cam.position, ctl.target).normalize();
    const dist = cam.position.distanceTo(ctl.target);
    const next = Math.max(ctl.minDistance || 2, dist * 0.88);
    cam.position.copy(ctl.target).addScaledVector(dir, next);
    ctl.update();
  }, [cameraRef, controlsRef, camModes.isFPRef]);

  const zoomOut = useCallback(() => {
    const cam = cameraRef.current;
    const ctl = controlsRef.current;
    if (!cam || !ctl) return;
    if (camModes.isFPRef.current) return;

    const dir = new THREE.Vector3().subVectors(cam.position, ctl.target).normalize();
    const dist = cam.position.distanceTo(ctl.target);
    const next = Math.min(ctl.maxDistance || 200, dist * 1.12);
    cam.position.copy(ctl.target).addScaledVector(dir, next);
    ctl.update();
  }, [cameraRef, controlsRef, camModes.isFPRef]);

  const recenter = useCallback(() => {
    const cam = cameraRef.current;
    const ctl = controlsRef.current;
    if (!cam || !ctl) return;

    ctl.target.set(0, 1, 0);
    cam.position.set(20, 8, 20);
    ctl.update();
  }, [cameraRef, controlsRef]);

  const focusCameraOnContainer = useCallback(
    (c, { smooth = true } = {}) => {
      const cam = cameraRef.current;
      const ctl = controlsRef.current;
      if (!cam || !ctl) return;
      if (!c) return;

      const pos = c.posicion || c.pos;
      if (!pos || typeof pos !== "string") return;

      // daca ai slotToWorld deja in proiect, poti face conversie exacta;
      // aici pastram siguranta: daca record-ul are userData.worldPos, foloseste-l.
      // altfel: doar recentram usor la target curent.
      const target = new THREE.Vector3(0, 1, 0);
      if (c.worldPos && Array.isArray(c.worldPos) && c.worldPos.length >= 3) {
        target.set(Number(c.worldPos[0]) || 0, 1, Number(c.worldPos[2]) || 0);
      }

      const startTarget = ctl.target.clone();
      const startPos = cam.position.clone();

      const endTarget = target.clone();
      const endPos = target.clone().add(new THREE.Vector3(10, 7, 10));

      if (!smooth) {
        ctl.target.copy(endTarget);
        cam.position.copy(endPos);
        ctl.update();
        return;
      }

      let raf = 0;
      const t0 = performance.now();
      const dur = 420;

      const step = () => {
        const t = (performance.now() - t0) / dur;
        const k = t >= 1 ? 1 : t;

        ctl.target.lerpVectors(startTarget, endTarget, k);
        cam.position.lerpVectors(startPos, endPos, k);
        ctl.update();

        if (k < 1) raf = requestAnimationFrame(step);
      };

      raf = requestAnimationFrame(step);
      return () => cancelAnimationFrame(raf);
    },
    [cameraRef, controlsRef]
  );

  // Placeholder compat (Map3DPage le cheama)
  const openWorldItems = useCallback(() => {
    // Daca ai un modal separat, leaga-l aici.
    // Nu aruncam eroare ca sa nu-ti blocheze UI.
    console.warn("[useDepotScene] openWorldItems not wired yet.");
  }, []);

  // ------------------------------------------------------------
  // 14) Return EXACT cum cere Map3DPage
  // ------------------------------------------------------------
  return {
    // FP
    isFP: camModes.isFP,
    setFPEnabled: camModes.setFPEnabled,
    setForwardPressed: fpRig.setForwardPressed,
    setJoystick: fpRig.setJoystick,
    setLookJoystick: fpRig.setLookJoystick,
    selectFromCrosshair: selection.selectFromCrosshair,

    // Build
    setBuildActive,
    buildApi,

    // Containers
    containers,
    refreshContainers,

    // World items / selection wiring
    openWorldItems,
    setOnContainerSelected,
    focusCameraOnContainer,

    // Marker
    showSelectedMarker: selection.showSelectedMarker,

    // Zoom / recenter
    zoomIn,
    zoomOut,
    recenter,

    // OrbitLibre
    isOrbitLibre: camModes.orbitLibre,
    startOrbitLibre: camModes.startOrbitLibre,
    stopOrbitLibre: camModes.stopOrbitLibre,
  };
}
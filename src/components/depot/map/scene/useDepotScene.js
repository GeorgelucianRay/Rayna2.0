// src/components/depot/map/scene/useDepotScene.js
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

// config + utils
import { CFG, makeBounds } from "./sceneConfig";
import { collectMeshes } from "./meshUtils";

// core mounts
import useThreeMount from "./useThreeMount";
import useWorldBase from "./useWorldBase";
import useResize from "./useResize";

// rigs / modes
import useFirstPersonRig from "./useFirstPersonRig";
import useCameraModes from "./useCameraModes";

// selection + containers
import useContainersLayer from "./useContainersLayer";
import useSelection from "./useSelection";

// build integration
import useBuildBridge from "./build/useBuildBridge";

// events + guards
import useKeybinds from "./events/useKeybinds";
import usePointerHandlers from "./events/usePointerHandlers";
import { isOverMapUI, isOverBuildUI } from "./utils/domGuards";

export function useDepotScene({ mountRef }) {
  // ---------------------------
  // React state (UI-facing)
  // ---------------------------
  const [containers, setContainers] = useState([]);
  const [isFP, setIsFP] = useState(false);

  const [buildActive, setBuildActive] = useState(false);
  const buildActiveRef = useRef(false);
  useEffect(() => {
    buildActiveRef.current = buildActive;
  }, [buildActive]);

  const [buildMode, setBuildMode] = useState("place");

  const [orbitLibre, setOrbitLibre] = useState(false);
  const orbitLibreRef = useRef(false);
  useEffect(() => {
    orbitLibreRef.current = orbitLibre;
  }, [orbitLibre]);

  // ---------------------------
  // Shared refs (Three objects)
  // ---------------------------
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);

  const depotGroupRef = useRef(null);
  const worldGroupRef = useRef(null);

  const controlsRef = useRef(null); // OrbitControls
  const fpRef = useRef(null);       // FirstPerson rig controller
  const buildRef = useRef(null);    // Build controller bridge

  const markerRef = useRef(null);
  const selectedLightRef = useRef(null);

  const collidersRef = useRef([]);          // base colliders (static)
  const containersLayerRef = useRef(null);  // last containers layer group

  const clockRef = useRef(new THREE.Clock());
  const isFPRef = useRef(false);

  // bounds
  const bounds = useMemo(() => makeBounds(), []);

  // ---------------------------
  // 1) Three mount (renderer/scene/camera)
  // ---------------------------
  const three = useThreeMount({
    mountRef,
    sceneRef,
    cameraRef,
    rendererRef,
  });

  // ---------------------------
  // 2) Base world (ground, fence, sky, landscape, baseWorld etc.)
  // ---------------------------
  const world = useWorldBase({
    CFG,
    sceneRef,
    cameraRef,
    rendererRef,
    depotGroupRef,
    worldGroupRef,
  });

  // world should expose at least:
  // world.groundMesh
  // world.fence
  // world.baseWorld
  // world.landscape
  // world.depotGroup
  // world.worldGroup
  // world.walkables (optional)
  // world.raycastTargets (optional, for build)

  // ---------------------------
  // 3) First Person rig
  // ---------------------------
  const fp = useFirstPersonRig({
    cameraRef,
    rendererRef,
    bounds,
    // these may be optional in your implementation:
    collidersRef,
    setIsFP,
    isFPRef,
  });
  // expect: fp.enable(), fp.disable(), fp.update(delta)
  // + joystick setters, select ray helpers, etc.

  // ---------------------------
  // 4) Camera modes (Orbit vs FP, OrbitLibre, zoom/recenter)
  // ---------------------------
  const cameraModes = useCameraModes({
    cameraRef,
    rendererRef,
    controlsRef,
    fpRef,
    isFPRef,
    setIsFP,
    buildActiveRef,
    setBuildActive,
    orbitLibreRef,
    setOrbitLibre,
    bounds,
    CFG,
  });

  // expect from cameraModes:
  // setFPEnabled(enabled)
  // zoomIn/zoomOut/recenter
  // startOrbitLibre(opts)/stopOrbitLibre()
  // isOrbitLibre boolean handled outside (we store orbitLibre state here)

  // ---------------------------
  // 5) Build bridge (Build controller tied to world + FP crosshair)
  // ---------------------------
  const build = useBuildBridge({
    cameraRef,
    rendererRef,
    worldGroupRef,
    groundMeshRef: world?.groundMeshRef, // or world.groundMesh
    getGroundMesh: () => world?.groundMesh || world?.groundMeshRef?.current,
    buildRef,
    buildMode,
    setBuildMode,
    buildActive,
    setBuildActive,
    // optional: allow build to use FP ray (“minecraft select”)
    fpRef,
  });

  // build should expose:
  // buildApi (controller getter, setMode, setType, rotateStep, actionPrimary, nudgeSelected etc.)
  // and ensure buildRef.current is set

  // ---------------------------
  // 6) Containers layer (fetch + attach colliders + interact targets)
  // ---------------------------
  const containersLayer = useContainersLayer({
    CFG,
    depotGroupRef,
    containersLayerRef,
    collidersRef,
    fpRef,
    setContainers,
  });

  // expect:
  // refreshContainers(): reload + rebuild layer, sets containers state

  // initial load
  useEffect(() => {
    if (!depotGroupRef.current) return;
    containersLayer?.refreshContainers?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depotGroupRef.current]);

  // ---------------------------
  // 7) Selection (orbit pick + FP select + highlight + marker)
  // ---------------------------
  const selection = useSelection({
    CFG,
    cameraRef,
    rendererRef,
    depotGroupRef,
    containersLayerRef,
    markerRef,
    selectedLightRef,
    isFPRef,
    buildActiveRef,
    onIsUIHit: (evt) => {
      const x = evt?.clientX ?? 0;
      const y = evt?.clientY ?? 0;
      if (isOverMapUI(evt?.target)) return true;
      if (isOverBuildUI(x, y)) return true;
      return false;
    },
  });

  // expect:
  // setOnContainerSelected(fn)
  // selectFromCrosshair()
  // showSelectedMarker(container)
  // focusCameraOnContainer(container, opts)
  // clearHighlight()

  // ---------------------------
  // 8) Pointer handlers (route events between orbit pick / build)
  // ---------------------------
  usePointerHandlers({
    rendererRef,
    // guard functions
    isOverMapUI,
    isOverBuildUI,
    // state refs
    isFPRef,
    buildActiveRef,
    // actions
    onOrbitPick: selection?.onOrbitPick, // optional, if selection provides handler
    onBuildPointerMove: build?.onPointerMove, // optional
    onBuildPointerDown: build?.onPointerDown, // optional
  });

  // ---------------------------
  // 9) Keybinds (E = select / build primary etc.)
  // ---------------------------
  useKeybinds({
    enabled: true,
    isFPRef,
    buildActiveRef,
    // if build is active and you want minecraft-like action:
    onBuildPrimary: () => buildRef.current?.actionPrimary?.(),
    // if FP selection:
    onSelect: () => selection?.selectFromCrosshair?.(),
  });

  // ---------------------------
  // 10) Resize
  // ---------------------------
  useResize({
    mountRef,
    cameraRef,
    rendererRef,
  });

  // ---------------------------
  // 11) Animation loop (single)
  // ---------------------------
  useEffect(() => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!renderer || !scene || !camera) return;

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const delta = clockRef.current.getDelta();

      // update preview if build wants continuous updates
      if (buildActiveRef.current) {
        buildRef.current?.updatePreview?.();
      }

      // pulse marker if selection module uses it
      selection?.animateMarker?.(delta);

      // FP update
      if (isFPRef.current) {
        fpRef.current?.update?.(delta);
      } else {
        // Orbit update
        controlsRef.current?.update?.();
        cameraModes?.tickOrbitLibre?.(delta);
      }

      renderer.render(scene, camera);
    };

    tick();
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------
  // Exposed API (Map3DPage expects this)
  // ---------------------------
  const setFPEnabled = useCallback(
    (enabled) => cameraModes?.setFPEnabled?.(enabled),
    [cameraModes]
  );

  const buildApi = useMemo(() => {
    return {
      get mode() {
        return buildMode;
      },
      setMode: (m) => {
        setBuildMode(m);
        buildRef.current?.setMode?.(m);
      },
      rotateStep: (dir) => buildRef.current?.rotateStep?.(dir),
      setType: (t) => buildRef.current?.setType?.(t),
      get controller() {
        return buildRef.current;
      },
      get active() {
        return buildActiveRef.current;
      },
    };
  }, [buildMode]);

  // keep orbit controls enabled/disabled when build toggles
  useEffect(() => {
    const orbit = controlsRef.current;
    if (!orbit) return;
    orbit.enabled = !buildActive && !isFPRef.current;
    if (!orbit.enabled) setOrbitLibre(false);
  }, [buildActive]);

  return {
    // camera / FP
    isFP,
    setFPEnabled,
    setForwardPressed: (v) => fpRef.current?.setForwardPressed?.(v),
    setJoystick: (v) => fpRef.current?.setJoystick?.(v),
    setLookJoystick: (v) => {
      const fpRig = fpRef.current;
      if (!fpRig) return;
      if (fpRig.setLookJoystick) fpRig.setLookJoystick(v);
      else if (fpRig.setLook) fpRig.setLook(v);
      else if (fpRig.setLookDelta) fpRig.setLookDelta(v);
    },
    selectFromCrosshair: () => selection?.selectFromCrosshair?.(),

    // build
    setBuildActive,
    buildActive,
    buildApi,

    // containers
    containers,

    // selection helpers
    setOnContainerSelected: (fn) => selection?.setOnContainerSelected?.(fn),
    focusCameraOnContainer: (c, opts) => selection?.focusCameraOnContainer?.(c, opts),
    showSelectedMarker: (c) => selection?.showSelectedMarker?.(c),

    // orbit controls
    zoomIn: () => cameraModes?.zoomIn?.(),
    zoomOut: () => cameraModes?.zoomOut?.(),
    recenter: () => cameraModes?.recenter?.(),

    // refresh containers after DB changes
    refreshContainers: () => containersLayer?.refreshContainers?.(),

    // orbit libre
    startOrbitLibre: (opts = {}) => cameraModes?.startOrbitLibre?.(opts),
    stopOrbitLibre: () => cameraModes?.stopOrbitLibre?.(),
    isOrbitLibre: orbitLibre,
  };
}

export default useDepotScene;
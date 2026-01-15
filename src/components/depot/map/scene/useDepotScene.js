// src/components/depot/map/scene/useDepotScene.js
import * as THREE from "three";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useThreeMount } from "./useThreeMount";
import { useResize } from "./useResize";
import { CFG, makeBounds, makeAutoOrbit, makeOrbitClamp } from "./sceneConfig";

// restul le adăugăm imediat după ce creezi fișierele:
// import { useFirstPersonRig } from "./useFirstPersonRig";
// import { useContainersLayer } from "./useContainersLayer";
// import { usePicking } from "./usePicking";
// import { useBuildRig } from "./useBuildRig";
// import { useAnimationLoop } from "./useAnimationLoop";

export function useDepotScene({ mountRef }) {
  const [isFP, setIsFP] = useState(false);
  const [buildActive, setBuildActive] = useState(false);
  const [containers, setContainers] = useState([]);

  const [orbitLibre, setOrbitLibre] = useState(false);
  const orbitLibreRef = useRef(false);
  useEffect(() => { orbitLibreRef.current = orbitLibre; }, [orbitLibre]);

  const isFPRef = useRef(false);
  const buildActiveRef = useRef(false);
  useEffect(() => { buildActiveRef.current = buildActive; }, [buildActive]);

  const bounds = useMemo(() => makeBounds(), []);
  const autoOrbitRef = useRef(makeAutoOrbit());
  const clampOrbit = useMemo(() => makeOrbitClamp(), []);

  // --- THREE mount (renderer/scene/camera/controls)
  const { rendererRef, sceneRef, cameraRef, controlsRef } = useThreeMount({ mountRef });
  useResize({ mountRef, rendererRef, cameraRef });

  // De aici încolo: mutăm pe rând “blocurile mari” din useDepotScene în hook-uri separate.

  const setFPEnabled = useCallback((enabled) => {
    // TEMP: până adăugăm useFirstPersonRig
    // aici doar blocăm orbit și setăm flag-urile
    const orbit = controlsRef.current;
    if (!orbit) return;

    if (enabled) {
      setOrbitLibre(false);
      orbit.enabled = false;
      isFPRef.current = true;
      setIsFP(true);
    } else {
      orbit.enabled = !buildActiveRef.current;
      isFPRef.current = false;
      setIsFP(false);
    }
  }, [controlsRef]);

  useEffect(() => {
    const orbit = controlsRef.current;
    if (!orbit) return;
    orbit.enabled = !buildActive && !isFPRef.current;
    if (!orbit.enabled) setOrbitLibre(false);
  }, [buildActive, controlsRef]);

  return {
    isFP,
    setFPEnabled,

    // placeholder până conectăm FP real:
    setForwardPressed: () => {},
    setJoystick: () => {},
    setLookJoystick: () => {},
    selectFromCrosshair: () => {},

    buildActive,
    setBuildActive,
    buildApi: { controller: null, active: buildActive, mode: "place", setMode: () => {}, rotateStep: () => {}, setType: () => {} },

    containers,
    openWorldItems: () => console.log("[WorldItems] open (TODO)"),
    setOnContainerSelected: () => {},

    focusCameraOnContainer: () => {},
    showSelectedMarker: () => {},

    zoomIn: () => {},
    zoomOut: () => {},
    recenter: () => {},

    refreshContainers: async () => {},

    startOrbitLibre: (opts = {}) => {
      setFPEnabled(false);
      setBuildActive(false);
      const p = autoOrbitRef.current;
      if (opts.speed) p.speed = opts.speed;
      if (opts.radius) p.radius = opts.radius;
      if (opts.height) p.height = opts.height;
      if (opts.clockwise != null) p.clockwise = !!opts.clockwise;
      const controls = controlsRef.current;
      if (controls) controls.target.set(0, 1, 0);
      setOrbitLibre(true);
    },
    stopOrbitLibre: () => setOrbitLibre(false),
    isOrbitLibre: orbitLibre,
  };
}
// src/components/depot/map/scene/useCameraModes.js
// ASCII quotes only
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

/**
 * CameraModes:
 * - NU controleaza FP enable/disable (asta e treaba useFirstPersonRig)
 * - controleaza OrbitControls enabled/disabled in functie de:
 *    - isFPExtern (din useFirstPersonRig)
 *    - buildActive
 * - controleaza OrbitLibre (auto orbit) doar cand NU esti in FP
 */
export function useCameraModes({
  controlsRef,
  cameraRef,

  yardBounds, // { yardMinX, yardMaxX, yardMinZ, yardMaxZ }
  clampOrbitFn, // (camera, controls) => void

  // Build state (din useDepotScene)
  buildActive,

  // ✅ SOURCE OF TRUTH for FP (din useFirstPersonRig)
  getIsFP, // () => boolean
}) {
  // UI mirror only (optional)
  const [orbitLibre, setOrbitLibre] = useState(false);
  const orbitLibreRef = useRef(false);
  useEffect(() => {
    orbitLibreRef.current = orbitLibre;
  }, [orbitLibre]);

  // config auto-orbit
  const autoOrbitRef = useRef({
    angle: 0,
    speed: Math.PI / 28,
    radius: Math.hypot(
      yardBounds?.yardMaxX - yardBounds?.yardMinX || 90,
      yardBounds?.yardMaxZ - yardBounds?.yardMinZ || 60
    ) * 0.55,
    height: 10,
    target: new THREE.Vector3(0, 1, 0),
    clockwise: true,
  });

  // ------------------------------------------------------------
  // Orbit enabled state:
  // - FP => orbit OFF
  // - buildActive => orbit OFF
  // - altfel => orbit ON
  // ------------------------------------------------------------
  useEffect(() => {
    const orbit = controlsRef.current;
    if (!orbit) return;

    const isFP = !!getIsFP?.();
    const shouldEnableOrbit = !isFP && !buildActive;

    orbit.enabled = shouldEnableOrbit;

    // daca orbit e oprit, opreste orbit libre
    if (!orbit.enabled) setOrbitLibre(false);
  }, [controlsRef, buildActive, getIsFP]);

  // ------------------------------------------------------------
  // OrbitLibre start/stop
  // ------------------------------------------------------------
  const startOrbitLibre = useCallback(
    (opts = {}) => {
      // orbit libre are sens doar cand NU esti in FP
      const isFP = !!getIsFP?.();
      if (isFP) return;

      const p = autoOrbitRef.current;
      if (opts.speed != null) p.speed = opts.speed;
      if (opts.radius != null) p.radius = opts.radius;
      if (opts.height != null) p.height = opts.height;
      if (opts.clockwise != null) p.clockwise = !!opts.clockwise;
      if (opts.target) p.target = opts.target;

      const controls = controlsRef.current;
      if (controls) controls.target.set(0, 1, 0);

      setOrbitLibre(true);
    },
    [getIsFP, controlsRef]
  );

  const stopOrbitLibre = useCallback(() => setOrbitLibre(false), []);

  // ------------------------------------------------------------
  // Animate tick: orbit / orbitLibre / clamp
  // ------------------------------------------------------------
  const tickCamera = useCallback(
    (delta) => {
      const cam = cameraRef.current;
      const ctl = controlsRef.current;
      if (!cam || !ctl) return;

      // ✅ In FP nu atingem deloc OrbitControls/camera
      const isFP = !!getIsFP?.();
      if (isFP) return;

      if (orbitLibreRef.current) {
        const p = autoOrbitRef.current;
        p.angle += (p.clockwise ? 1 : -1) * p.speed * delta;

        const cx = Math.cos(p.angle) * p.radius;
        const cz = Math.sin(p.angle) * p.radius;

        ctl.target.copy(p.target);
        cam.position.set(cx, p.height, cz);
        cam.lookAt(p.target);
        ctl.update();
      } else {
        ctl.update();
      }

      clampOrbitFn?.(cam, ctl);
    },
    [cameraRef, controlsRef, clampOrbitFn, getIsFP]
  );

  // (optional) UI helper: isFP computed
  const isFP = useMemo(() => !!getIsFP?.(), [getIsFP]);

  return {
    // expose isFP doar pentru UI/compat
    isFP,

    orbitLibre,
    startOrbitLibre,
    stopOrbitLibre,

    tickCamera,
  };
}
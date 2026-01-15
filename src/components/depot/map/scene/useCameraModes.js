// src/components/depot/map/scene/useCameraModes.js
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";

/**
 * Gestionează:
 * - FP enable/disable
 * - Orbit enable/disable
 * - OrbitLibre start/stop (auto orbit)
 *
 * IMPORTANT:
 * - Build active NU trebuie să oprească FP (Minecraft-style).
 * - Build active trebuie doar să dezactiveze OrbitControls când nu ești în FP.
 */
export function useCameraModes({
  controlsRef,
  cameraRef,
  fpRef,

  yardBounds, // { yardMinX, yardMaxX, yardMinZ, yardMaxZ }
  clampOrbitFn, // (camera, controls) => void

  // Build state (din useDepotScene)
  buildActive,
}) {
  const [isFP, setIsFP] = useState(false);

  // OrbitLibre
  const [orbitLibre, setOrbitLibre] = useState(false);
  const orbitLibreRef = useRef(false);
  useEffect(() => {
    orbitLibreRef.current = orbitLibre;
  }, [orbitLibre]);

  const isFPRef = useRef(false);

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

  // -------------- FP enable/disable --------------
  const setFPEnabled = useCallback(
    (enabled) => {
      const orbit = controlsRef.current;
      const fp = fpRef.current;
      if (!orbit || !fp) return;

      if (enabled) {
        // când intri în FP: oprești orbit libre și orbit controls
        setOrbitLibre(false);
        orbit.enabled = false;
        fp.enable?.();
        isFPRef.current = true;
        setIsFP(true);
      } else {
        fp.disable?.();
        isFPRef.current = false;
        setIsFP(false);

        // orbit re-enabled doar dacă build nu e activ
        orbit.enabled = !buildActive;
      }
    },
    [controlsRef, fpRef, buildActive]
  );

  // -------------- Orbit enabled state --------------
  // Regula:
  // - dacă FP: orbit off
  // - dacă buildActive: orbit off (dar FP poate rămâne on)
  // - altfel: orbit on
  useEffect(() => {
    const orbit = controlsRef.current;
    if (!orbit) return;

    const shouldEnableOrbit = !isFPRef.current && !buildActive;
    orbit.enabled = shouldEnableOrbit;

    if (!orbit.enabled) setOrbitLibre(false);
  }, [controlsRef, buildActive]);

  // -------------- OrbitLibre start/stop --------------
  const startOrbitLibre = useCallback(
    (opts = {}) => {
      // În orbit libre: nu FP, nu build (ca să nu se bată cu input / preview)
      setFPEnabled(false);

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
    [setFPEnabled, controlsRef]
  );

  const stopOrbitLibre = useCallback(() => setOrbitLibre(false), []);

  // -------------- Animate tick: orbit / orbitLibre / clamp --------------
  const tickCamera = useCallback(
    (delta) => {
      const cam = cameraRef.current;
      const ctl = controlsRef.current;
      if (!cam || !ctl) return;

      if (isFPRef.current) {
        // FP update e în altă parte (useDepotScene), aici nu facem nimic
        return;
      }

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

      // clamp la margini (yard)
      clampOrbitFn?.(cam, ctl);
    },
    [cameraRef, controlsRef, clampOrbitFn]
  );

  // Public API
  return {
    isFP,
    isFPRef,

    orbitLibre,
    startOrbitLibre,
    stopOrbitLibre,

    setFPEnabled,

    tickCamera,
  };
}
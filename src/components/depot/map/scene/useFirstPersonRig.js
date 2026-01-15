// src/components/depot/map/scene/useFirstPersonRig.js
import { useCallback, useEffect, useRef, useState } from "react";
import createFirstPerson from "../threeWorld/firstPerson";

/**
 * FP rig (createFirstPerson + attach/detach + setters).
 * Nu gestionează picking/targets/colliders - doar controlul FP.
 *
 * Parametri:
 * - cameraRef: ref către camera THREE
 * - rendererRef: ref către renderer THREE
 * - controlsRef: ref către OrbitControls (pentru enable/disable orbit)
 * - bounds: bounds pentru FP
 * - buildActiveRef: ref boolean (build activ) ca să știm când reactivăm orbit
 */
export function useFirstPersonRig({
  cameraRef,
  rendererRef,
  controlsRef,
  bounds,
  buildActiveRef,
}) {
  const fpRef = useRef(null);
  const isFPRef = useRef(false);
  const [isFP, setIsFP] = useState(false);

  // init + attach pe DOM (când există renderer+camera)
  useEffect(() => {
    const cam = cameraRef.current;
    const renderer = rendererRef.current;
    const dom = renderer?.domElement;

    if (!cam || !dom) return;

    // creează FP doar o dată
    if (!fpRef.current) {
      fpRef.current = createFirstPerson(cam, bounds, {
        eyeHeight: 1.7,
        stepMax: 0.6,
        slopeMax: Math.tan((40 * Math.PI) / 180),
      });
    }

    // atașează input la canvas
    fpRef.current?.attach?.(dom);

    return () => {
      // la unmount: detașează input și oprește FP
      try {
        fpRef.current?.detach?.();
        fpRef.current?.disable?.();
      } catch {}
      isFPRef.current = false;
      setIsFP(false);
    };
  }, [cameraRef, rendererRef, bounds]);

  /**
   * setFPEnabled:
   * - când activezi FP: oprești Orbit, pornești FP
   * - când dezactivezi FP: oprești FP, pornești Orbit (dacă build nu e activ)
   */
  const setFPEnabled = useCallback(
    (enabled) => {
      const orbit = controlsRef.current;
      const fp = fpRef.current;

      if (!orbit || !fp) return;

      if (enabled) {
        orbit.enabled = false;
        fp.enable?.();
        isFPRef.current = true;
        setIsFP(true);
      } else {
        fp.disable?.();
        orbit.enabled = !buildActiveRef.current;
        isFPRef.current = false;
        setIsFP(false);
      }
    },
    [controlsRef, buildActiveRef]
  );

  // setters pentru controale
  const setForwardPressed = useCallback((v) => {
    fpRef.current?.setForwardPressed?.(v);
  }, []);

  const setJoystick = useCallback((v) => {
    fpRef.current?.setJoystick?.(v);
  }, []);

  const setLookJoystick = useCallback((v) => {
    const fp = fpRef.current;
    if (!fp) return;
    if (fp.setLookJoystick) fp.setLookJoystick(v);
    else if (fp.setLook) fp.setLook(v);
    else if (fp.setLookDelta) fp.setLookDelta(v);
  }, []);

  const updateFP = useCallback((delta) => {
    if (!isFPRef.current) return;
    fpRef.current?.update?.(delta);
  }, []);

  return {
    isFP,
    isFPRef,
    fpRef,

    setFPEnabled,
    setForwardPressed,
    setJoystick,
    setLookJoystick,

    updateFP,
  };
}
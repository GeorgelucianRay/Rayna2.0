import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./FPControls.module.css";

// ---------- small helpers ----------
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function getTouchById(touches, id) {
  for (let i = 0; i < touches.length; i++) if (touches[i].identifier === id) return touches[i];
  return null;
}

function useIsTouchDevice() {
  return useMemo(() => {
    if (typeof window === "undefined") return true;
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }, []);
}

// ---------- Joystick ----------
function Joystick({
  label,
  side = "left",
  deadzone = 0.06,
  onMove, // ({x,y}) normalized -1..1
}) {
  const baseRef = useRef(null);
  const knobRef = useRef(null);

  const [active, setActive] = useState(false);

  // state for a single active touch pointer
  const touchIdRef = useRef(null);
  const centerRef = useRef({ x: 0, y: 0 });
  const radiusRef = useRef(1);

  const setKnob = (nx, ny) => {
    const knob = knobRef.current;
    if (!knob) return;
    // knob travel in px (radius)
    const r = radiusRef.current;
    knob.style.transform = `translate(${nx * r}px, ${ny * r}px)`;
  };

  const emit = (nx, ny) => {
    // deadzone
    const dz = deadzone;
    let x = Math.abs(nx) < dz ? 0 : nx;
    let y = Math.abs(ny) < dz ? 0 : ny;
    onMove?.({ x, y });
  };

  const reset = () => {
    setActive(false);
    touchIdRef.current = null;
    setKnob(0, 0);
    emit(0, 0);
  };

  const start = (touch) => {
    const base = baseRef.current;
    if (!base) return;

    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    centerRef.current = { x: cx, y: cy };
    radiusRef.current = Math.max(20, rect.width * 0.34); // travel radius

    touchIdRef.current = touch.identifier;
    setActive(true);

    // first move
    move(touch);
  };

  const move = (touch) => {
    const { x: cx, y: cy } = centerRef.current;
    const r = radiusRef.current;

    let dx = touch.clientX - cx;
    let dy = touch.clientY - cy;

    // normalize -1..1 and clamp to circle
    let nx = dx / r;
    let ny = dy / r;

    const len = Math.hypot(nx, ny);
    if (len > 1) {
      nx /= len;
      ny /= len;
    }

    setKnob(nx, ny);
    emit(nx, ny);
  };

  // touch listeners
  useEffect(() => {
    const base = baseRef.current;
    if (!base) return;

    const onTouchStart = (e) => {
      // ignore if already active
      if (touchIdRef.current != null) return;
      const t = e.changedTouches[0];
      if (!t) return;
      start(t);
    };

    const onTouchMove = (e) => {
      const id = touchIdRef.current;
      if (id == null) return;
      const t = getTouchById(e.touches, id);
      if (!t) return;
      move(t);
    };

    const onTouchEnd = (e) => {
      const id = touchIdRef.current;
      if (id == null) return;
      // if our touch ended
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === id) {
          reset();
          break;
        }
      }
    };

    base.addEventListener("touchstart", onTouchStart, { passive: false });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: false });
    window.addEventListener("touchcancel", onTouchEnd, { passive: false });

    return () => {
      base.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={baseRef}
      className={`${styles.joyBase} ${side === "right" ? styles.right : styles.left} ${
        active ? styles.active : ""
      }`}
      data-map-ui="1"
      aria-label={label}
    >
      <div className={styles.joyRing} />
      <div ref={knobRef} className={styles.joyKnob} />
      <div className={styles.joyLabel}>{label}</div>
    </div>
  );
}

// ---------- FPControls ----------
export default function FPControls({
  ensureFP,
  setForwardPressed, // optional (legacy)
  setJoystick,       // move
  setLookJoystick,   // look (NEW)
  onSelect,          // selectFromCrosshair (NEW)
}) {
  const isTouch = useIsTouchDevice();

  // ensure FP on mount (when component appears)
  useEffect(() => {
    ensureFP?.();
  }, [ensureFP]);

  // If desktop (no touch) you may still want a small select button
  // but component is designed mainly for touch.
  if (!isTouch) {
    return (
      <div className={styles.fpHud} data-map-ui="1">
        <button className={styles.selectBtn} type="button" onClick={() => onSelect?.()}>
          SELECT (E)
        </button>
      </div>
    );
  }

  return (
    <div className={styles.fpHud} data-map-ui="1">
      {/* LEFT: move */}
      <Joystick
        label="MOVE"
        side="left"
        onMove={({ x, y }) => {
          // y: up is negative in screen, but for movement we want: up = forward (positive)
          const ny = clamp(-y, -1, 1);
          const nx = clamp(x, -1, 1);

          setJoystick?.({ x: nx, y: ny });

          // optional legacy: forward pressed bool
          if (setForwardPressed) setForwardPressed(ny > 0.25);
        }}
      />

      {/* RIGHT: look */}
      <Joystick
        label="LOOK"
        side="right"
        deadzone={0.03}
        onMove={({ x, y }) => {
          // For look we keep screen axis:
          // x -> yaw, y -> pitch (up negative)
          // We'll send x,y normalized; firstPerson will decide how to apply.
          const nx = clamp(x, -1, 1);
          const ny = clamp(y, -1, 1);
          setLookJoystick?.({ x: nx, y: ny });
        }}
      />

      {/* ACTIONS */}
      <div className={styles.actions} data-map-ui="1">
        <button className={styles.selectBtn} type="button" onClick={() => onSelect?.()}>
          SELECT
        </button>
      </div>

      {/* Crosshair */}
      <div className={styles.crosshair} aria-hidden="true" data-map-ui="1" />
    </div>
  );
}
// src/components/depot/map/threeWorld/firstPerson.js
import * as THREE from "three";

export default function createFirstPerson(
  camera,
  bounds,
  {
    eyeHeight = 1.7,
    stepMax = 0.6,
    slopeMax = Math.tan((35 * Math.PI) / 180),

    // feel
    walkSpeed = 5.2,
    sprintSpeed = 8.5,
    accel = 18,
    friction = 12,

    // collision
    radius = 0.35,
    wallFar = 0.75,

    // look
    lookSpeed = 0.0022,
    touchLookSpeed = 0.006,
    minPitch = -1.2,
    maxPitch = 1.2,

    // joystick look feel
    lookJoyYawSpeed = 2.8,     // rad/sec at full deflection
    lookJoyPitchSpeed = 2.2,   // rad/sec at full deflection
    lookJoyDeadzone = 0.06,    // 0..1
  } = {}
) {
  // ===== INPUT =====
  let enabled = false;
  const keys = { w: false, a: false, s: false, d: false, shift: false };

  // joystick de mers (stanga/dreapta + inainte/inapoi)
  let joystick = { x: 0, y: 0 };

  // joystick de camera (yaw/pitch)
  let lookJoystick = { x: 0, y: 0 };

  // ===== WORLD SETS =====
  let walkables = [];
  let colliders = []; // IMPORTANT: containere/gard/cladiri

  // ===== STATE =====
  const vel = new THREE.Vector3();       // velocity on XZ
  const desired = new THREE.Vector3();   // desired direction
  const up = new THREE.Vector3(0, 1, 0);

  const downRay = new THREE.Raycaster();
  const wallRay = new THREE.Raycaster();

  // yaw/pitch
  const euler = new THREE.Euler(0, 0, 0, "YXZ");
  let yaw = 0;
  let pitch = 0;

  // pointer lock
  let domEl = null;
  let pointerLocked = false;

  // touch look
  let touchLooking = false;
  let lastTouch = { x: 0, y: 0 };

  // interact ray (center)
  const interactRay = new THREE.Raycaster();
  const centerNDC = new THREE.Vector2(0, 0);

  // ===== API setters =====
  function setWalkables(meshes) { walkables = (meshes || []).filter(Boolean); }
  function setColliders(meshes) { colliders = (meshes || []).filter(Boolean); }
  function setCollisionTargets(meshes) { setColliders(meshes); } // compat

  function enable() { enabled = true; }
  function disable() {
    enabled = false;
    // opreste orice input “ramas”
    joystick.x = 0; joystick.y = 0;
    lookJoystick.x = 0; lookJoystick.y = 0;
    keys.w = keys.a = keys.s = keys.d = keys.shift = false;
  }

  function setForwardPressed(v) { keys.w = !!v; }

  // mers
  function setJoystick({ x = 0, y = 0 } = {}) { joystick.x = x; joystick.y = y; }

  // camera
  function setLookJoystick({ x = 0, y = 0 } = {}) { lookJoystick.x = x; lookJoystick.y = y; }

  // ===== Bounds clamp =====
  function clampInBounds(v3) {
    if (!bounds) return;
    v3.x = THREE.MathUtils.clamp(v3.x, bounds.minX, bounds.maxX);
    v3.z = THREE.MathUtils.clamp(v3.z, bounds.minZ, bounds.maxZ);
  }

  // ===== Ground sample =====
  function sampleGroundHit(x, z, fromY = 80) {
    if (!walkables.length) return null;
    downRay.set(new THREE.Vector3(x, fromY, z), new THREE.Vector3(0, -1, 0));
    const hits = downRay.intersectObjects(walkables, true);
    return hits.length ? hits[0] : null;
  }

  // ===== Movement vector (camera-relative) =====
  function computeDesiredDir() {
    const moveZ = (keys.w ? 1 : 0) + (keys.s ? -1 : 0) + joystick.y;
    const moveX = (keys.d ? 1 : 0) + (keys.a ? -1 : 0) + joystick.x;

    desired.set(0, 0, 0);
    if (!moveZ && !moveX) return desired;

    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();

    const right = new THREE.Vector3().copy(fwd).cross(up).normalize();

    desired.addScaledVector(fwd, moveZ);
    desired.addScaledVector(right, moveX);
    desired.normalize();
    return desired;
  }

  // ===== Look =====
  function applyLook() {
    pitch = THREE.MathUtils.clamp(pitch, minPitch, maxPitch);
    euler.set(pitch, yaw, 0);
    camera.quaternion.setFromEuler(euler);
  }

  function onMouseMove(e) {
    if (!enabled) return;
    if (!pointerLocked) return;
    yaw -= e.movementX * lookSpeed;
    pitch -= e.movementY * lookSpeed;
    applyLook();
  }

  function onTouchStart(e) {
    if (!enabled) return;
    const t = e.touches?.[0];
    if (!t) return;
    touchLooking = true;
    lastTouch.x = t.clientX;
    lastTouch.y = t.clientY;
  }

  function onTouchMove(e) {
    if (!enabled) return;
    if (!touchLooking) return;
    const t = e.touches?.[0];
    if (!t) return;
    const dx = t.clientX - lastTouch.x;
    const dy = t.clientY - lastTouch.y;
    lastTouch.x = t.clientX;
    lastTouch.y = t.clientY;

    yaw -= dx * touchLookSpeed;
    pitch -= dy * touchLookSpeed;
    applyLook();
  }

  function onTouchEnd() {
    touchLooking = false;
  }

  // ===== Keyboard =====
  function onKey(e) {
    const v = e.type === "keydown";
    if (e.code === "KeyW" || e.code === "ArrowUp") keys.w = v;
    if (e.code === "KeyS" || e.code === "ArrowDown") keys.s = v;
    if (e.code === "KeyA" || e.code === "ArrowLeft") keys.a = v;
    if (e.code === "KeyD" || e.code === "ArrowRight") keys.d = v;
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") keys.shift = v;
  }

  // ===== Pointer lock helpers =====
  function requestPointerLock() {
    if (!domEl) return;
    // pe mobil nu exista pointer lock, pe desktop e ok
    if (domEl.requestPointerLock) domEl.requestPointerLock();
  }
  function onPointerLockChange() {
    pointerLocked = document.pointerLockElement === domEl;
  }

  function attach(domElement) {
    domEl = domElement;

    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);

    document.addEventListener("pointerlockchange", onPointerLockChange);
    window.addEventListener("mousemove", onMouseMove);

    // touch look
    domEl.addEventListener("touchstart", onTouchStart, { passive: true });
    domEl.addEventListener("touchmove", onTouchMove, { passive: true });
    domEl.addEventListener("touchend", onTouchEnd, { passive: true });

    // click to lock (desktop)
    domEl.addEventListener("pointerdown", requestPointerLock, { passive: true });
  }

  function detach() {
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("keyup", onKey);

    document.removeEventListener("pointerlockchange", onPointerLockChange);
    window.removeEventListener("mousemove", onMouseMove);

    if (domEl) {
      domEl.removeEventListener("touchstart", onTouchStart);
      domEl.removeEventListener("touchmove", onTouchMove);
      domEl.removeEventListener("touchend", onTouchEnd);
      domEl.removeEventListener("pointerdown", requestPointerLock);
    }

    domEl = null;
    pointerLocked = false;
  }

  // ===== Collision push (simple circle) =====
  function pushOutFromHit(pos, hit) {
    const p = hit.point.clone();
    p.y = pos.y;

    const toPos = pos.clone().sub(p);
    toPos.y = 0;

    const d = toPos.length();
    if (d < 1e-6) return pos;

    const minD = radius + 0.02;
    if (d >= minD) return pos;

    toPos.normalize().multiplyScalar(minD - d);
    pos.add(toPos);
    return pos;
  }

  function collide(pos, moveDir) {
    if (!colliders.length) return pos;

    const origin = pos.clone().add(new THREE.Vector3(0, eyeHeight * 0.55, 0));
    wallRay.set(origin, moveDir.clone().normalize());
    wallRay.far = wallFar;

    const hits = wallRay.intersectObjects(colliders, true);
    if (!hits.length) return pos;

    return pushOutFromHit(pos, hits[0]);
  }

  // ===== Interact/select (center of screen) =====
  function getInteractHit({ maxDist = 30 } = {}) {
    if (!colliders.length) return null;
    interactRay.setFromCamera(centerNDC, camera);
    interactRay.far = maxDist;
    const hits = interactRay.intersectObjects(colliders, true);
    return hits.length ? hits[0] : null;
  }

  function applyLookJoystick(delta) {
    // daca user trage cu degetul (touch look), nu mai adaugam joystick look in acelasi timp
    // (altfel se simte “ciudat”). Daca vrei combinate, scoate conditia asta.
    if (touchLooking) return;

    const lx = lookJoystick.x;
    const ly = lookJoystick.y;

    // deadzone
    const ax = Math.abs(lx);
    const ay = Math.abs(ly);
    if (ax < lookJoyDeadzone && ay < lookJoyDeadzone) return;

    // normalize after deadzone (optional, keeps smooth)
    const nx = ax < lookJoyDeadzone ? 0 : (lx);
    const ny = ay < lookJoyDeadzone ? 0 : (ly);

    // yaw: left/right, pitch: up/down (invers pe pitch ca in jocuri)
    yaw -= nx * lookJoyYawSpeed * delta;
    pitch -= ny * lookJoyPitchSpeed * delta;

    applyLook();
  }

  // ===== Update =====
  function update(delta) {
    if (!enabled) return;

    // ✅ 0) apply look joystick
    applyLookJoystick(delta);

    // 1) desired movement direction
    const mv = computeDesiredDir();

    // 2) accel/friction in XZ
    const maxSpeed = keys.shift ? sprintSpeed : walkSpeed;

    if (mv.lengthSq() > 1e-6) {
      const targetVel = mv.clone().multiplyScalar(maxSpeed);
      vel.lerp(targetVel, 1 - Math.exp(-accel * delta));
    } else {
      vel.lerp(new THREE.Vector3(0, 0, 0), 1 - Math.exp(-friction * delta));
    }

    // 3) propose next
    const next = camera.position.clone().addScaledVector(vel, delta);
    clampInBounds(next);

    // 4) collide with obstacles (colliders)
    if (mv.lengthSq() > 1e-6) collide(next, mv);

    // 5) ground align (walkables)
    let newY = camera.position.y;
    const g = sampleGroundHit(next.x, next.z, 120);
    if (g) {
      const groundY = g.point.y + eyeHeight;

      const n = g.face?.normal || g.normal || new THREE.Vector3(0, 1, 0);
      const horiz = Math.sqrt(n.x * n.x + n.z * n.z);
      const slope = horiz === 0 ? 0 : horiz / Math.abs(n.y);

      if (slope <= slopeMax) {
        const dy = groundY - camera.position.y;
        if (Math.abs(dy) <= stepMax) newY = groundY;
        else newY = camera.position.y + THREE.MathUtils.clamp(dy, -stepMax, stepMax);
      }
    }

    camera.position.set(next.x, newY, next.z);
  }

  return {
    enable,
    disable,

    // attach/detach replaces addKeyboard/removeKeyboard (mai modern)
    attach,
    detach,

    // compat (nu le folosești)
    addKeyboard: () => {},
    removeKeyboard: () => {},

    setForwardPressed,

    // ✅ mers
    setJoystick,

    // ✅ camera
    setLookJoystick,

    setWalkables,
    setColliders,
    setCollisionTargets,

    update,

    // interact API (îl vei folosi în useDepotScene)
    getInteractHit,
  };
}
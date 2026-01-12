// src/components/depot/map/threeWorld/firstPerson.js
import * as THREE from "three";

export default function createFirstPerson(
  camera,
  bounds,
  {
    eyeHeight = 1.7,
    stepMax = 0.6,
    slopeMax = Math.tan((35 * Math.PI) / 180),

    walkSpeed = 5.2,
    sprintSpeed = 8.5,
    accel = 18,
    friction = 12,

    radius = 0.35,
    wallFar = 1.25,

    lookSpeed = 0.0022,
    touchLookSpeed = 0.006,
    minPitch = -1.2,
    maxPitch = 1.2,

    lookJoyYawSpeed = 1.15,
    lookJoyPitchSpeed = 0.9,
    lookJoyDeadzone = 0.06,
  } = {}
) {
  let enabled = false;
  const keys = { w: false, a: false, s: false, d: false, shift: false };

  let joystick = { x: 0, y: 0 };
  let lookJoystick = { x: 0, y: 0 };

  let walkables = [];
  let colliders = [];
  let interactTargets = []; // ✅ separat

  const vel = new THREE.Vector3();
  const desired = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  const downRay = new THREE.Raycaster();
  const wallRay = new THREE.Raycaster();

  const euler = new THREE.Euler(0, 0, 0, "YXZ");
  let yaw = 0;
  let pitch = 0;

  let domEl = null;
  let pointerLocked = false;

  let touchLooking = false;
  let lastTouch = { x: 0, y: 0 };

  const interactRay = new THREE.Raycaster();
  const centerNDC = new THREE.Vector2(0, 0);

  function setWalkables(meshes) {
    walkables = (meshes || []).filter(Boolean);
  }
  function setColliders(meshes) {
    colliders = (meshes || []).filter(Boolean);
  }
  function setCollisionTargets(meshes) {
    setColliders(meshes);
  }
  function setInteractTargets(meshes) {
    interactTargets = (meshes || []).filter(Boolean);
  }

  function enable() {
    enabled = true;
  }
  function disable() {
    enabled = false;
    joystick.x = 0;
    joystick.y = 0;
    lookJoystick.x = 0;
    lookJoystick.y = 0;
    keys.w = keys.a = keys.s = keys.d = keys.shift = false;
    vel.set(0, 0, 0);
  }

  function setForwardPressed(v) {
    keys.w = !!v;
  }
  function setJoystick({ x = 0, y = 0 } = {}) {
    joystick.x = x;
    joystick.y = y;
  }
  function setLookJoystick({ x = 0, y = 0 } = {}) {
    lookJoystick.x = x;
    lookJoystick.y = y;
  }

  function clampInBounds(v3) {
    if (!bounds) return;
    v3.x = THREE.MathUtils.clamp(v3.x, bounds.minX, bounds.maxX);
    v3.z = THREE.MathUtils.clamp(v3.z, bounds.minZ, bounds.maxZ);
  }

  function sampleGroundHit(x, z, fromY = 80) {
    if (!walkables.length) return null;
    downRay.set(new THREE.Vector3(x, fromY, z), new THREE.Vector3(0, -1, 0));
    const hits = downRay.intersectObjects(walkables, true);
    return hits.length ? hits[0] : null;
  }

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

  function applyLook() {
    pitch = THREE.MathUtils.clamp(pitch, minPitch, maxPitch);
    euler.set(pitch, yaw, 0);
    camera.quaternion.setFromEuler(euler);
  }

  function onMouseMove(e) {
    if (!enabled || !pointerLocked) return;
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
    if (!enabled || !touchLooking) return;
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

  function onKey(e) {
    const v = e.type === "keydown";
    if (e.code === "KeyW" || e.code === "ArrowUp") keys.w = v;
    if (e.code === "KeyS" || e.code === "ArrowDown") keys.s = v;
    if (e.code === "KeyA" || e.code === "ArrowLeft") keys.a = v;
    if (e.code === "KeyD" || e.code === "ArrowRight") keys.d = v;
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") keys.shift = v;
  }

  function requestPointerLock() {
    if (!domEl) return;
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

    domEl.addEventListener("touchstart", onTouchStart, { passive: true });
    domEl.addEventListener("touchmove", onTouchMove, { passive: true });
    domEl.addEventListener("touchend", onTouchEnd, { passive: true });

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

  function pushOutFromHit(pos, hit) {
    const p = hit.point.clone();
    p.y = pos.y;

    const toPos = pos.clone().sub(p);
    toPos.y = 0;

    const d = toPos.length();
    if (d < 1e-6) return pos;

    const minD = radius + 0.06;
    if (d >= minD) return pos;

    toPos.normalize().multiplyScalar(minD - d);
    pos.add(toPos);
    return pos;
  }

  function castWall(origin, dir) {
    wallRay.set(origin, dir.clone().normalize());
    wallRay.far = wallFar;
    const hits = wallRay.intersectObjects(colliders, true);
    return hits.length ? hits[0] : null;
  }

  function collide(pos, dir) {
    if (!colliders.length) return pos;

    const origin = pos.clone().add(new THREE.Vector3(0, eyeHeight * 0.55, 0));

    const fwd = dir.clone().setY(0);
    if (fwd.lengthSq() < 1e-8) return pos;
    fwd.normalize();

    const right = new THREE.Vector3().copy(fwd).cross(up).normalize();

    const dirs = [
      fwd,
      fwd.clone().addScaledVector(right, 0.55).normalize(),
      fwd.clone().addScaledVector(right, -0.55).normalize(),
    ];

    for (const d of dirs) {
      const hit = castWall(origin, d);
      if (hit) pushOutFromHit(pos, hit);
    }

    return pos;
  }

  function applyLookJoystick(delta) {
    if (touchLooking) return;

    const lx = lookJoystick.x;
    const ly = lookJoystick.y;

    if (Math.abs(lx) < lookJoyDeadzone && Math.abs(ly) < lookJoyDeadzone) return;

    yaw -= lx * lookJoyYawSpeed * delta;
    pitch -= ly * lookJoyPitchSpeed * delta;

    applyLook();
  }

  function isSelectableObject(obj) {
    return !!(
      (obj?.isInstancedMesh && obj.userData?.records) ||
      obj?.userData?.__record
    );
  }

  function findSelectableInParents(obj) {
    let cur = obj;
    let steps = 0;
    while (cur && steps++ < 8) {
      if (isSelectableObject(cur)) return cur;
      cur = cur.parent;
    }
    return null;
  }

  function getInteractHit({ maxDist = 30 } = {}) {
    const targets = interactTargets.length ? interactTargets : colliders;
    if (!targets.length) return null;

    interactRay.setFromCamera(centerNDC, camera);
    interactRay.far = maxDist;

    const hits = interactRay.intersectObjects(targets, true);
    if (!hits.length) return null;

    for (const h of hits) {
      const sel = findSelectableInParents(h.object);
      if (sel) return { ...h, object: sel };
    }

    return null;
  }

  function update(delta) {
    if (!enabled) return;

    applyLookJoystick(delta);

    const mv = computeDesiredDir();
    const maxSpeed = keys.shift ? sprintSpeed : walkSpeed;

    if (mv.lengthSq() > 1e-6) {
      const targetVel = mv.clone().multiplyScalar(maxSpeed);
      vel.lerp(targetVel, 1 - Math.exp(-accel * delta));
    } else {
      vel.lerp(new THREE.Vector3(0, 0, 0), 1 - Math.exp(-friction * delta));
    }

    const next = camera.position.clone().addScaledVector(vel, delta);
    clampInBounds(next);

    // ✅ coliziune și când ai inerție (vel) după ce eliberezi joystick
    const velDir = vel.clone().setY(0);
    if (velDir.lengthSq() > 1e-6) {
      collide(next, mv.lengthSq() > 1e-6 ? mv : velDir);
    }

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
    attach,
    detach,

    addKeyboard: () => {},
    removeKeyboard: () => {},

    setForwardPressed,
    setJoystick,
    setLookJoystick,

    setWalkables,
    setColliders,
    setCollisionTargets,
    setInteractTargets,

    update,
    getInteractHit,
  };
}
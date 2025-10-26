// threeWorld/firstPerson.js
import * as THREE from 'three';

/**
 * Control “first-person” cu joystick + tastatură, încapsulat.
 * - setJoystick({x,y,active})  // x orizontal (yaw), y vertical (înainte/înapoi)
 * - setForwardPressed(bool)     // buton “↑”
 * - enable()/disable()          // pornește / oprește modul walk
 * - addKeyboard()/removeKeyboard() // WASD + săgeți
 * - update(delta)               // apelat în bucla de animare
 */
export default function createFirstPerson(camera, bounds) {
  // --- state ---
  const EYE_Y = 1.6;        // înălțimea camerei
  const MOVE_SPEED = 6;     // m/s
  const YAW_SPEED  = 1.8;   // rad/s
  const DEAD = 0.15;        // prag joystick

  let enabled = false;

  const joy = { x: 0, y: 0, active: false };
  const keys = { w:false, a:false, s:false, d:false, ArrowUp:false, ArrowLeft:false, ArrowDown:false, ArrowRight:false };
  let forwardPressed = false;

  // --- API de input din UI ---
  function setJoystick(v) { joy.x = v?.x || 0; joy.y = v?.y || 0; joy.active = !!v?.active; }
  function setForwardPressed(v) { forwardPressed = !!v; }

  // --- tastatură ---
  function onKeyDown(e){
    switch (e.key) {
      case 'w': case 'W': case 'ArrowUp':    keys.w = true;  keys.ArrowUp = true; break;
      case 's': case 'S': case 'ArrowDown':  keys.s = true;  keys.ArrowDown = true; break;
      case 'a': case 'A': case 'ArrowLeft':  keys.a = true;  keys.ArrowLeft = true; break;
      case 'd': case 'D': case 'ArrowRight': keys.d = true;  keys.ArrowRight = true; break;
      default: break;
    }
  }
  function onKeyUp(e){
    switch (e.key) {
      case 'w': case 'W': case 'ArrowUp':    keys.w = false;  keys.ArrowUp = false; break;
      case 's': case 'S': case 'ArrowDown':  keys.s = false;  keys.ArrowDown = false; break;
      case 'a': case 'A': case 'ArrowLeft':  keys.a = false;  keys.ArrowLeft = false; break;
      case 'd': case 'D': case 'ArrowRight': keys.d = false;  keys.ArrowRight = false; break;
      default: break;
    }
  }
  function addKeyboard(){ window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp); }
  function removeKeyboard(){ window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); }

  // --- helpers ---
  function clampInsideYard(pos){
    if (!bounds) return;
    pos.x = THREE.MathUtils.clamp(pos.x, bounds.minX, bounds.maxX);
    pos.z = THREE.MathUtils.clamp(pos.z, bounds.minZ, bounds.maxZ);
  }

  // --- ciclu de update (apelat din MapPage) ---
  function update(delta){
    if (!enabled) return;

    // 1) yaw din joystick.x + taste A/D / Left/Right
    let yawInput = 0;
    if (Math.hypot(joy.x, joy.y) > DEAD) yawInput += joy.x;
    if (keys.d || keys.ArrowRight) yawInput += 0.8;
    if (keys.a || keys.ArrowLeft)  yawInput -= 0.8;
    if (yawInput !== 0) camera.rotateY(-yawInput * YAW_SPEED * delta);

    // 2) direcție înainte
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    fwd.y = 0; fwd.normalize();

    // 3) input de mișcare (înainte/înapoi)
    let moveInput = 0;
    if (Math.hypot(joy.x, joy.y) > DEAD) moveInput += -joy.y;            // joystick: sus = înainte
    if (forwardPressed || keys.w || keys.ArrowUp) moveInput += 1;
    if (keys.s || keys.ArrowDown) moveInput -= 1;

    if (moveInput !== 0) {
      camera.position.addScaledVector(fwd, moveInput * MOVE_SPEED * delta);
    }

    // 4) menține “ochii” la înălțime și limitele curții
    camera.position.y = EYE_Y;
    clampInsideYard(camera.position);
  }

  // --- on/off ---
  function enable(){ enabled = true; camera.position.y = EYE_Y; }
  function disable(){ enabled = false; }

  return {
    // state
    isEnabled: () => enabled,
    enable, disable,
    // input
    setJoystick, setForwardPressed,
    addKeyboard, removeKeyboard,
    // loop
    update,
  };
}
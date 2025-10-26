// threeWorld/firstPerson.js
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export default function createFirstPerson(camera, domElement, bounds) {
  const controls = new PointerLockControls(camera, domElement);
  const velocity = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const key = { fwd:false, back:false, left:false, right:false, jump:false };
  let enabled = false;
  let canJump = true;

  const onKey = (e, down) => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp':    key.fwd = down; break;
      case 'KeyS': case 'ArrowDown':  key.back = down; break;
      case 'KeyA': case 'ArrowLeft':  key.left = down; break;
      case 'KeyD': case 'ArrowRight': key.right = down; break;
      case 'Space': if (down && canJump) { velocity.y = 6; canJump = false; } break;
      default: break;
    }
  };

  const enable = () => {
    enabled = true;
    controls.lock();
  };
  const disable = () => {
    enabled = false;
    controls.unlock();
  };

  controls.addEventListener('unlock', ()=>{ enabled = false; });

  const onKeyDown = (e)=>onKey(e,true);
  const onKeyUp   = (e)=>onKey(e,false);

  const addListeners = () => {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
  };
  const removeListeners = () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  };

  const GRAVITY = 18;       // “cădere”
  const SPEED   = 12;       // viteză pe orizontală (m/s)
  const EYE_Y   = 1.6;      // înălțimea camerei

  function clampInsideYard(pos) {
    if (!bounds) return;
    pos.x = THREE.MathUtils.clamp(pos.x, bounds.minX, bounds.maxX);
    pos.z = THREE.MathUtils.clamp(pos.z, bounds.minZ, bounds.maxZ);
  }

  // apelat în bucla de anim (delta în secunde)
  function update(delta) {
    if (!enabled) return;

    // amortizare
    velocity.x -= velocity.x * 8.0 * delta;
    velocity.z -= velocity.z * 8.0 * delta;
    velocity.y -= GRAVITY * delta;

    direction.set(
      Number(key.right) - Number(key.left),
      0,
      Number(key.back) - Number(key.fwd)
    ).normalize();

    if (key.fwd || key.back) {
      const forward = new THREE.Vector3();
      controls.getDirection(forward);
      forward.y = 0; forward.normalize();
      velocity.addScaledVector(forward, -direction.z * SPEED * delta);
    }
    if (key.left || key.right) {
      const right = new THREE.Vector3();
      controls.getDirection(right);
      right.y = 0; right.normalize().cross(new THREE.Vector3(0,1,0));
      velocity.addScaledVector(right, direction.x * SPEED * delta);
    }

    const pos = controls.getObject().position;
    pos.addScaledVector(velocity, 1);

    // “solul” la 0 și sărim/aterizăm
    if (pos.y < EYE_Y) {
      velocity.y = 0;
      pos.y = EYE_Y;
      canJump = true;
    }

    clampInsideYard(pos);
  }

  return {
    controls,
    enable,
    disable,
    update,
    isEnabled: () => enabled,
    addListeners,
    removeListeners
  };
}
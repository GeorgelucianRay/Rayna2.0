// firstPerson.js – FP cu suport de rampă (raycast pe walkables)
import * as THREE from 'three';

export default function createFirstPerson(
  camera,
  bounds,
  {
    eyeHeight = 1.7,    // înălțimea camerei față de sol
    stepMax   = 0.6,    // diferența maximă de înălțime acceptată între frame-uri
    slopeMax  = Math.tan(35 * Math.PI/180), // panta maximă (~35°)
  } = {}
) {
  // input
  let keys = { w:false, a:false, s:false, d:false };
  let joystick = { x:0, y:0 };
  let enabled = false;

  // coliziuni/sol
  const downRay = new THREE.Raycaster();
  const forwardRay = new THREE.Raycaster();
  let walkables = []; // aici punem mesh-urile pe care putem călca

  const vel = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const up  = new THREE.Vector3(0,1,0);

  const speed = 6; // m/s

  function setWalkables(meshes) { walkables = meshes.filter(Boolean); }

  function enable() { enabled = true; }
  function disable() { enabled = false; }
  function addKeyboard() {
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
  }
  function removeKeyboard() {
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('keyup', onKey);
  }
  function onKey(e){
    const v = (e.type === 'keydown');
    if (e.code === 'KeyW' || e.code === 'ArrowUp')    keys.w = v;
    if (e.code === 'KeyS' || e.code === 'ArrowDown')  keys.s = v;
    if (e.code === 'KeyA' || e.code === 'ArrowLeft')  keys.a = v;
    if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.d = v;
  }

  function setForwardPressed(v){ keys.w = v; } // compat UI mobil
  function setJoystick({x=0,y=0}){ joystick.x = x; joystick.y = y; }

  function getMoveVector() {
    // WASD + joystick (y înainte, x lateral)
    const moveZ = (keys.w?1:0) + (keys.s?-1:0) + joystick.y;
    const moveX = (keys.d?1:0) + (keys.a?-1:0) + joystick.x;
    dir.set(0,0,0);
    if (moveZ || moveX) {
      // direcție în spațiul camerei (fără componenta verticală)
      const fwd = new THREE.Vector3();
      camera.getWorldDirection(fwd);
      fwd.y = 0; fwd.normalize();
      const right = tmp.copy(fwd).cross(up).normalize(); // dreapta

      dir.addScaledVector(fwd, moveZ);
      dir.addScaledVector(right, moveX);
      dir.normalize();
    }
    return dir;
  }

  function clampInBounds(v3) {
    if (!bounds) return;
    v3.x = THREE.MathUtils.clamp(v3.x, bounds.minX, bounds.maxX);
    v3.z = THREE.MathUtils.clamp(v3.z, bounds.minZ, bounds.maxZ);
  }

  function sampleGroundY(x, z, fromY = 50) {
    if (!walkables.length) return null;
    downRay.set(new THREE.Vector3(x, fromY, z), new THREE.Vector3(0, -1, 0));
    const hits = downRay.intersectObjects(walkables, true);
    if (!hits.length) return null;
    return hits[0]; // { point, face, faceNormal, ... }
  }

  function update(delta) {
    if (!enabled) return;
    // 1) propunem mișcarea pe plan orizontal
    const mv = getMoveVector();
    vel.copy(mv).multiplyScalar(speed * delta);

    const next = camera.position.clone().add(vel);
    clampInBounds(next);

    // 2) anti-lovit în perete simplu (ray înainte ~ cap)
    if (walkables.length && mv.lengthSq() > 1e-6) {
      forwardRay.set(
        camera.position.clone().add(new THREE.Vector3(0, eyeHeight*0.6, 0)),
        mv.clone().normalize()
      );
      const near = 0.3; // „raza” corpului
      const far  = 0.6;
      const wallHits = forwardRay.intersectObjects(walkables, true)
        .filter(h => h.distance < far);
      if (wallHits.length) {
        // blochează înaintarea foarte aproape de obstacol
        const hit = wallHits[0];
        if (hit.distance < near) {
          // nu avansăm pe direcția respectivă
          next.copy(camera.position);
        } else {
          // micșorează pasul
          const allow = (hit.distance - near);
          next.copy(camera.position).addScaledVector(mv.normalize(), allow);
        }
      }
    }

    // 3) aliniază pe sol/rampă (raycast în jos pe walkables)
    let newY = camera.position.y;
    const groundHit = sampleGroundY(next.x, next.z, 100);
    if (groundHit) {
      const groundY = groundHit.point.y + eyeHeight;

      // verifică panta: dacă e prea abruptă, nu urcăm
      const n = groundHit.face?.normal || groundHit.normal || new THREE.Vector3(0,1,0);
      const horiz = Math.sqrt(n.x*n.x + n.z*n.z);
      const slope = (horiz === 0) ? 0 : (horiz / Math.abs(n.y)); // tan(theta)
      if (slope <= slopeMax) {
        // limitează saltul vertical brusc (anti „teleport”)
        const dy = groundY - camera.position.y;
        if (Math.abs(dy) <= stepMax) {
          newY = groundY;
        } else {
          // urcă/coboară treptat până la limită
          newY = camera.position.y + THREE.MathUtils.clamp(dy, -stepMax, stepMax);
        }
      } // altfel: panta prea mare -> nu schimbăm Y
    }

    camera.position.set(next.x, newY, next.z);
  }

  return {
    enable, disable, addKeyboard, removeKeyboard,
    setForwardPressed, setJoystick,
    setWalkables,
    update
  };
}
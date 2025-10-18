// src/components/threeWorld/createAsphaltMarkings.js
import * as THREE from 'three';

/**
 * Marcaje pe asfalt (placeholder safe).
 * - Returnează un grup valid, cu export default, ca să nu pice build-ul.
 * - Implicit nu desenează nimic (evităm dublarea marcajelor deja făcute în createGround).
 * - Dacă vrei să-l folosești ulterior, setează { demo: true } pentru o bandă centrală discretă.
 */
export default function createAsphaltMarkings({ demo = false, width = 280, depth = 140 } = {}) {
  const g = new THREE.Group();

  if (!demo) {
    return g; // fără desene, dar grup valid (build safe)
  }

  // Demo: o bandă foarte subtilă pe mijloc (poți șterge oricând)
  const lineMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
  });
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.9, 0.25), lineMat);
  strip.rotation.x = -Math.PI / 2;
  strip.position.y = 0.02;
  g.add(strip);

  return g;
}
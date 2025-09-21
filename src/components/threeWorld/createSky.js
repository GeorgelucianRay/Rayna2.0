// src/components/threeWorld/createSky.js
import * as THREE from 'three';

/**
 * Cupolă “cer” gradient + lumini; expune setMode('day'|'night')
 */
export default function createSky({
  radius = 420,
  topDay = 0x88c9ff,
  bottomDay = 0xd5ecff,
  topNight = 0x0d1730,
  bottomNight = 0x0a0f1e,
} = {}) {
  const group = new THREE.Group();

  const geo = new THREE.SphereGeometry(radius, 48, 32);
  const uniforms = {
    topColor:    { value: new THREE.Color(topDay) },
    bottomColor: { value: new THREE.Color(bottomDay) },
    offset:      { value: 0.25 },
    exponent:    { value: 0.9 },
  };
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms,
    vertexShader: `
      varying vec3 vPos;
      void main(){
        vPos = (modelMatrix * vec4(position,1.0)).xyz;
        gl_Position = projectionMatrix * viewMatrix * vec4(vPos,1.0);
      }`,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vPos;
      void main(){
        float h = normalize(vPos).y;
        float f = max(pow(max(h + offset, 0.0), exponent), 0.0);
        gl_FragColor = vec4(mix(bottomColor, topColor, f), 1.0);
      }`,
  });
  const dome = new THREE.Mesh(geo, mat);
  group.add(dome);

  const hemi = new THREE.HemisphereLight(0xffffff, 0xcad2e1, 0.5);
  hemi.position.set(0, 1, 0);
  hemi.name = 'hemi';
  group.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.position.set(120, 160, 40);
  sun.name = 'sun';
  group.add(sun);

  function setMode(mode) {
    const isNight = mode === 'night';
    uniforms.topColor.value.set(isNight ? topNight : topDay);
    uniforms.bottomColor.value.set(isNight ? bottomNight : bottomDay);
    sun.intensity = isNight ? 0.25 : 0.8;
    hemi.intensity = isNight ? 0.25 : 0.5;
  }

  return { group, setMode };
}
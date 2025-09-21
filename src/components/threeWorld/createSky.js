// src/components/threeWorld/createSky.js
import * as THREE from 'three';

export default function createSky({ mode = 'day' } = {}) {
  const group = new THREE.Group();

  // cer — cupolă mare, gradient suav
  const geo = new THREE.SphereGeometry(400, 48, 32);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor:    { value: new THREE.Color(0x87c5ff) }, // zi
      bottomColor: { value: new THREE.Color(0xbfe8ff) },
      topColorN:    { value: new THREE.Color(0x0a1230) }, // noapte
      bottomColorN: { value: new THREE.Color(0x091020) },
      mix: { value: 0 } // 0 = zi, 1 = noapte
    },
    vertexShader: `
      varying vec3 vPos;
      void main(){
        vPos = (modelMatrix * vec4(position,1.0)).xyz;
        gl_Position = projectionMatrix * viewMatrix * vec4(vPos,1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform vec3 topColorN;
      uniform vec3 bottomColorN;
      uniform float mix;
      varying vec3 vPos;
      void main(){
        float h = normalize(vPos).y * .5 + .5;
        vec3 day   = mix(bottomColor, topColor, pow(h, 1.2));
        vec3 night = mix(bottomColorN, topColorN, pow(h, 1.3));
        vec3 col = mix(day, night, mix);
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
  const sky = new THREE.Mesh(geo, mat);
  group.add(sky);

  // lumini: direcțional + ambientă
  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(60, 120, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  group.add(sun);

  const amb = new THREE.AmbientLight(0xffffff, 0.35);
  group.add(amb);

  const setMode = (m) => {
    const isNight = m === 'night';
    mat.uniforms.mix.value = isNight ? 1 : 0;
    sun.intensity = isNight ? 0.25 : 1.0;
    amb.intensity = isNight ? 0.12 : 0.35;
  };

  setMode(mode);

  return { group, setMode };
}
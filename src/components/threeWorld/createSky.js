import * as THREE from 'three';

export default function createSky({ radius = 800 } = {}) {
  const g = new THREE.Group();

  const uniforms = {
    topDay:    { value: new THREE.Color(0x87ceeb) },
    botDay:    { value: new THREE.Color(0xcfefff) },
    topNight:  { value: new THREE.Color(0x0b1220) },
    botNight:  { value: new THREE.Color(0x151d33) },
    mix:       { value: 0.0 } // 0 = zi, 1 = noapte
  };

  const geo = new THREE.SphereGeometry(radius, 32, 24);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms,
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = (modelMatrix * vec4(position,1.0)).xyz;
        gl_Position = projectionMatrix * viewMatrix * vec4(vPos,1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topDay;   uniform vec3 botDay;
      uniform vec3 topNight; uniform vec3 botNight;
      uniform float mix;
      varying vec3 vPos;
      void main() {
        float h = normalize(vPos).y * 0.5 + 0.5;
        vec3 day    = mix(botDay,   topDay,   h);
        vec3 night  = mix(botNight, topNight, h);
        vec3 col    = mix(day, night, clamp(mix,0.0,1.0));
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
  const sky = new THREE.Mesh(geo, mat);
  g.add(sky);

  g.userData.setNight = (isNight) => {
    mat.uniforms.mix.value = isNight ? 1.0 : 0.0;
    mat.needsUpdate = true;
  };

  // ascultă evenimentul din Map3DPage pentru toggle
  const onToggle = (e) => g.userData.setNight?.(e.detail?.night);
  window.addEventListener('map3d-mode-toggle', onToggle);
  g.userData.cleanup = () => window.removeEventListener('map3d-mode-toggle', onToggle);

  return g;
}
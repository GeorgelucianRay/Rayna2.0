import * as THREE from 'three';

export default function createSky({ radius = 800 } = {}) {
  const g = new THREE.Group();

  // cupolă cer – sferă inversată cu gradient simplu
  const geo = new THREE.SphereGeometry(radius, 32, 24);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor:    { value: new THREE.Color(0x0b1324) },
      bottomColor: { value: new THREE.Color(0x0a0f1f) },
      offset:      { value: 0.6 },
      exponent:    { value: 0.7 },
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorld = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }`,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorld;
      void main() {
        float h = normalize(vWorld).y;
        float f = max(pow(max(h + offset, 0.0), exponent), 0.0);
        gl_FragColor = vec4(mix(bottomColor, topColor, f), 1.0);
      }`
  });
  const sky = new THREE.Mesh(geo, mat);
  g.add(sky);

  // lumină de “soare”
  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(120, 160, 60);
  g.add(dir);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x404040, 0.8);
  g.add(hemi);

  return g;
}

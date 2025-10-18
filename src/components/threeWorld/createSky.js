import * as THREE from 'three';

export default function createSky({
  radius = 320,
  topColor = 0x87ceeb,      // albastru senin sus
  bottomColor = 0xb3e5fc    // albastru deschis jos
} = {}) {
  const g = new THREE.Group();

  // cupolă cer – sferă inversată cu gradient
  const geo = new THREE.SphereGeometry(radius, 32, 24);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor:    { value: new THREE.Color(topColor) },
      bottomColor: { value: new THREE.Color(bottomColor) },
      offset:      { value: 0.2 },
      exponent:    { value: 0.9 },
    },
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
      }`
  });
  const sky = new THREE.Mesh(geo, mat);
  
  // Asigurăm că cerul este desenat primul, în spatele a tot.
  sky.renderOrder = -1000;
  
  g.add(sky);

  // lumină de “soare” + ambient
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(80, 120, 40);
  g.add(sun);

  const hemi = new THREE.HemisphereLight(0xffffff, 0xcad2e1, 0.6);
  g.add(hemi);

  return g;
}
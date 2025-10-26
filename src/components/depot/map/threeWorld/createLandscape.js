// “Muntele” = un inel lat, cu gaură la mijloc cât curtea, texturat.
// Nu iese prin asfalt și nu se suprapune peste curte.
import * as THREE from 'three';

const TEX = '/textures/lume/munte_textura.jpg';

export default function createLandscape({ ground }) {
  const gW = ground?.width ?? 90;
  const gD = ground?.depth ?? 60;

  // dimensiunea interioară (gaura) o facem puțin mai mare decât curtea
  const innerW = gW + 6;
  const innerD = gD + 6;

  // contur exterior (peisaj)
  const outerW = 1000;
  const outerD = 1000;

  // Shape cu gaură (curtea)
  const shape = new THREE.Shape();
  shape.moveTo(-outerW/2, -outerD/2);
  shape.lineTo( outerW/2, -outerD/2);
  shape.lineTo( outerW/2,  outerD/2);
  shape.lineTo(-outerW/2,  outerD/2);
  shape.lineTo(-outerW/2, -outerD/2);

  const hole = new THREE.Path();
  hole.moveTo(-innerW/2, -innerD/2);
  hole.lineTo( innerW/2, -innerD/2);
  hole.lineTo( innerW/2,  innerD/2);
  hole.lineTo(-innerW/2,  innerD/2);
  hole.lineTo(-innerW/2, -innerD/2);
  shape.holes.push(hole);

  const geo = new THREE.ShapeGeometry(shape, 1);

  // UV-uri simple pe plan mare pentru a putea repeta textura
  geo.computeBoundingBox();
  const size = new THREE.Vector2(
    geo.boundingBox.max.x - geo.boundingBox.min.x,
    geo.boundingBox.max.y - geo.boundingBox.min.y
  );
  const uvs = [];
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    uvs.push(
      (x - geo.boundingBox.min.x) / size.x,
      (y - geo.boundingBox.min.y) / size.y
    );
  }
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

  const tex = new THREE.TextureLoader().load(TEX);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  // repetăm rezonabil ca să nu fie “stretch”
  tex.repeat.set(12, 12);

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 1,
    metalness: 0,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.02;           // foarte puțin sub asfalt
  mesh.receiveShadow = true;
  return mesh;
}
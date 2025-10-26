import * as THREE from 'three';

const TEX_MUNTE = '/textures/lume/munte_textura.jpg';

/**
 * Generează un inel de „munți” în jurul curții.
 *  - Nu intră în curte.
 *  - Seamless (12 segmente) și ușor ondulat.
 */
export default function createLandscape({ ground }) {
  const ringRadius = Math.max(ground.width, ground.depth) * 0.9; // puțin dincolo de curte
  const ringInner  = ringRadius * 1.15;
  const segments   = 12;
  const height     = 8;  // înălțimea maximă a culmilor
  const y0         = 0;  // la nivelul solului

  const loader = new THREE.TextureLoader();
  const tex = loader.load(TEX_MUNTE);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 1); // întinde pe circumferință

  const group = new THREE.Group();
  group.name = 'MountainsRing';

  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;

    // patru puncte pe două cercuri (inner/outer), apoi le „ondulăm”
    const x0i = Math.cos(a0) * ringInner, z0i = Math.sin(a0) * ringInner;
    const x1i = Math.cos(a1) * ringInner, z1i = Math.sin(a1) * ringInner;
    const x0o = Math.cos(a0) * (ringInner + 60), z0o = Math.sin(a0) * (ringInner + 60);
    const x1o = Math.cos(a1) * (ringInner + 60), z1o = Math.sin(a1) * (ringInner + 60);

    // mică variație de altitudine (smooth)
    const h0 = y0 + height * (0.6 + 0.4 * Math.sin(a0 * 3.0));
    const h1 = y0 + height * (0.6 + 0.4 * Math.sin(a1 * 3.0));

    const shape = new THREE.Shape();
    shape.moveTo(x0i, z0i);
    shape.lineTo(x0o, z0o);
    shape.lineTo(x1o, z1o);
    shape.lineTo(x1i, z1i);
    shape.lineTo(x0i, z0i);

    // extrudăm puțin pe Y ca „fâșie” verticală
    const geo = new THREE.ExtrudeGeometry(shape, {
      steps: 1,
      depth: 1,
      bevelEnabled: false
    });

    // rotim UV pentru ca textura să curgă pe circumferință
    geo.computeBoundingBox();
    const bbox = geo.boundingBox;
    const sizeX = bbox.max.x - bbox.min.x;
    const sizeZ = bbox.max.z - bbox.min.z;

    const uvs = geo.attributes.uv;
    for (let j = 0; j < uvs.count; j++) {
      const u = (geo.attributes.position.getX(j) - bbox.min.x) / sizeX;
      const v = (geo.attributes.position.getZ(j) - bbox.min.z) / sizeZ;
      uvs.setXY(j, u * 2.5, v); // 2.5 = tile pe circumferință
    }

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 1,
      metalness: 0,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geo, mat);
    // „ridicăm” latura exterioară pentru profil montan
    mesh.geometry.translate(0, 0, 0);
    mesh.position.y = y0;
    // curbăm ușor segmentul: îl înclinăm spre exterior
    mesh.lookAt(new THREE.Vector3(0, h0 * 0.4, 0));
    group.add(mesh);
  }

  // sub munți adăugăm un disc mare (teren) ca să nu se vadă cerul la bază
  const disc = new THREE.CircleGeometry(ringInner + 80, 64);
  const discMat = new THREE.MeshStandardMaterial({ color: 0x6c7b50, roughness: 1 });
  const discMesh = new THREE.Mesh(disc, discMat);
  discMesh.rotation.x = -Math.PI / 2;
  discMesh.position.y = y0 - 0.01;
  group.add(discMesh);

  return group;
}
import * as THREE from 'three';
import createContainersABC from './createContainersABC';
import createContainersDEF from './createContainersDEF';

export default function createContainersLayerOptimized(data, layout){
  const root = new THREE.Group();
  const abc = createContainersABC(data, layout);
  const def = createContainersDEF(data, layout);
  root.add(abc, def);

  root.userData.tick = (dt) => {
    abc.userData?.tick?.(dt);
    def.userData?.tick?.(dt);
  };
  root.userData.solid = true;
  return root;
}
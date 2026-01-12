// src/components/depot/map/scene/useDepotScene.js
import * as THREE from "three";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import createGround from "../threeWorld/createGround";
import createFence from "../threeWorld/createFence";
import createContainersLayerOptimized from "../threeWorld/createContainersLayerOptimized";
import fetchContainers from "../threeWorld/fetchContainers";
import createSky from "../threeWorld/createSky";
import createLandscape from "../threeWorld/createLandscape";
import createBaseWorld from "../threeWorld/createBaseWorld";
import createFirstPerson from "../threeWorld/firstPerson";
import { slotToWorld } from "../threeWorld/slotToWorld";

import createBuildController from "../world/buildController";

const YARD_WIDTH = 90,
  YARD_DEPTH = 60,
  YARD_COLOR = 0x9aa0a6;

const SLOT_LEN = 6.06,
  SLOT_GAP = 0.06,
  STEP = SLOT_LEN + SLOT_GAP;

const ABC_CENTER_OFFSET_X = 5 * STEP;

const CFG = {
  ground: {
    width: YARD_WIDTH,
    depth: YARD_DEPTH,
    color: YARD_COLOR,
    abcOffsetX: ABC_CENTER_OFFSET_X,
    defOffsetX: 32.3,
    abcToDefGap: -6.2,
    abcNumbersReversed: true,
  },
  fence: {
    margin: 2,
    postEvery: 10,
    gate: { side: "west", width: 10, centerZ: -6.54, tweakZ: 0 },
  },
};

function collectMeshes(root, { excludeNameIncludes = [] } = {}) {
  const out = [];
  if (!root) return out;
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const nm = (obj.name || "").toLowerCase();
    for (const frag of excludeNameIncludes) {
      if (nm.includes(frag.toLowerCase())) return;
    }
    out.push(obj);
  });
  return out;
}

export function useDepotScene({ mountRef }) {
  const [isFP, setIsFP] = useState(false);
  const [containers, setContainers] = useState([]);
  const [buildActive, setBuildActive] = useState(false);

  const [orbitLibre, setOrbitLibre] = useState(false);
  const orbitLibreRef = useRef(false);
  useEffect(() => {
    orbitLibreRef.current = orbitLibre;
  }, [orbitLibre]);

  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const fpRef = useRef(null);
  const buildRef = useRef(null);
  const containersLayerRef = useRef(null);

  const sceneRef = useRef(null);
  const markerRef = useRef(null);
  const depotGroupRef = useRef(null);
  const rendererRef = useRef(null);
  const selectedLightRef = useRef(null);

const selectedInstanceRef = useRef({
  mesh: null,
  index: null,
  originalColor: null,
});

  const clockRef = useRef(new THREE.Clock());
  const isFPRef = useRef(false);

  const buildActiveRef = useRef(false);
  useEffect(() => {
    buildActiveRef.current = buildActive;
  }, [buildActive]);

  const yardPad = 0.5;
  const yardMinX = -YARD_WIDTH / 2 + yardPad;
  const yardMaxX = YARD_WIDTH / 2 - yardPad;
  const yardMinZ = -YARD_DEPTH / 2 + yardPad;
  const yardMaxZ = YARD_DEPTH / 2 - yardPad;

  const autoOrbitRef = useRef({
    angle: 0,
    speed: Math.PI / 28,
    radius: Math.hypot(YARD_WIDTH, YARD_DEPTH) * 0.55,
    height: 10,
    target: new THREE.Vector3(0, 1, 0),
    clockwise: true,
  });

  function clampOrbit(camera, controls) {
    if (!camera || !controls) return;
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, yardMinX, yardMaxX);
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, yardMinZ, yardMaxZ);
    if (camera.position.y < 0.5) camera.position.y = 0.5;
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, yardMinX, yardMaxX);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, yardMinZ, yardMaxZ);
  }

  const bounds = useMemo(
    () => ({
      minX: -YARD_WIDTH / 2 + 2,
      maxX: YARD_WIDTH / 2 - 2,
      minZ: -YARD_DEPTH / 2 + 2,
      maxZ: YARD_DEPTH / 2 - 2,
    }),
    []
  );

  const setFPEnabled = useCallback(
    (enabled) => {
      const orbit = controlsRef.current;
      const fp = fpRef.current;
      if (!orbit || !fp) return;

      if (enabled) {
        setOrbitLibre(false);
        orbit.enabled = false;
        fp.enable?.();
        isFPRef.current = true;
        setIsFP(true);
      } else {
        fp.disable?.();
        orbit.enabled = !buildActiveRef.current;
        isFPRef.current = false;
        setIsFP(false);
      }
    },
    []
  );

  const setForwardPressed = useCallback((v) => fpRef.current?.setForwardPressed?.(v), []);
  const setJoystick = useCallback((v) => fpRef.current?.setJoystick?.(v), []);
  const setLookJoystick = useCallback((v) => {
    const fp = fpRef.current;
    if (!fp) return;
    if (fp.setLookJoystick) fp.setLookJoystick(v);
    else if (fp.setLook) fp.setLook(v);
    else if (fp.setLookDelta) fp.setLookDelta(v);
  }, []);

  const [buildMode, setBuildMode] = useState("place");
  const buildApi = useMemo(
    () => ({
      get mode() {
        return buildMode;
      },
      setMode: (m) => {
        setBuildMode(m);
        buildRef.current?.setMode(m);
      },
      rotateStep: (dir) => buildRef.current?.rotateStep(dir),
      setType: (t) => buildRef.current?.setType(t),
      finalizeJSON: () => {
        try {
          const raw = localStorage.getItem("rayna.world.edits") || '{"props":[]}';
          return JSON.stringify(JSON.parse(raw), null, 2);
        } catch {
          return '{"props":[]}';
        }
      },
      get controller() {
        return buildRef.current;
      },
      get active() {
        return buildActiveRef.current;
      },
    }),
    [buildMode]
  );

  const onContainerSelectedRef = useRef(null);
  const setOnContainerSelected = useCallback((fn) => {
    onContainerSelectedRef.current = fn;
  }, []);

  const showSelectedMarker = useCallback((container) => {
    const scene = sceneRef.current;
    if (!scene || !container) return;

    const slot = container.pos || container.posicion;
    if (!slot || typeof slot !== "string") return;

    const idx = parseInt(slot.match(/\d+/)?.[0] || "0", 10);
    const lane = slot[0];
    const tier = slot.match(/[A-Z]$/)?.[0] || "A";

    const wp = slotToWorld({ lane, index: idx, tier }, CFG.ground);
    if (!wp?.position) return;

    if (!markerRef.current) {
      const geo = new THREE.RingGeometry(0.8, 1.15, 48);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
        depthTest: false,
      });
      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.x = -Math.PI / 2;
      ring.renderOrder = 9999;
      ring.name = "selectedMarker";
      scene.add(ring);
      markerRef.current = ring;
    }

    const ring = markerRef.current;
    ring.position.copy(wp.position);
    ring.position.y = 0.08;
    ring.visible = true;
    ring.userData._pulseT = 0;
  }, []);

  const focusCameraOnContainer = useCallback(
    (container, opts = {}) => {
      if (!container || !cameraRef.current || !controlsRef.current) return;

      setOrbitLibre(false);
      setFPEnabled(false);

      const slot = container.pos || container.posicion;
      if (!slot || typeof slot !== "string") return;

      const idx = parseInt(slot.match(/\d+/)?.[0] || "0", 10);
      const lane = slot[0];
      const tier = slot.match(/[A-Z]$/)?.[0] || "A";

      const wp = slotToWorld({ lane, index: idx, tier }, CFG.ground);
      if (!wp?.position) return;

      const camera = cameraRef.current;
      const controls = controlsRef.current;

      const target = wp.position.clone();
      target.y = 1.5;

      const desiredPos = target.clone().add(new THREE.Vector3(6, 4, 6));
      const duration = opts?.smooth ? 900 : 0;

      if (!duration) {
        controls.target.copy(target);
        camera.position.copy(desiredPos);
        controls.update();
        clampOrbit(camera, controls);
        return;
      }

      const t0 = performance.now();
      const start = {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
        tx: controls.target.x,
        ty: controls.target.y,
        tz: controls.target.z,
      };
      const end = {
        x: desiredPos.x,
        y: desiredPos.y,
        z: desiredPos.z,
        tx: target.x,
        ty: target.y,
        tz: target.z,
      };

      function step(now) {
        const t = Math.min(1, (now - t0) / duration);
        const e = t * (2 - t);

        camera.position.set(
          start.x + (end.x - start.x) * e,
          start.y + (end.y - start.y) * e,
          start.z + (end.z - start.z) * e
        );
        controls.target.set(
          start.tx + (end.tx - start.tx) * e,
          start.ty + (end.ty - start.ty) * e,
          start.tz + (end.tz - start.tz) * e
        );
        controls.update();
        clampOrbit(camera, controls);

        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    },
    [setFPEnabled]
  );

  const zoomBy = useCallback(
    (mult) => {
      const controls = controlsRef.current;
      const camera = cameraRef.current;
      if (!controls || !camera) return;
      if (isFPRef.current) return;

      setOrbitLibre(false);

      const target = controls.target.clone();
      const dir = camera.position.clone().sub(target);
      const dist = dir.length();
      if (dist < 0.0001) return;

      const minD = controls.minDistance ?? 4;
      const maxD = controls.maxDistance ?? Math.max(YARD_WIDTH, YARD_DEPTH);
      const newDist = THREE.MathUtils.clamp(dist * mult, minD, maxD);

      dir.normalize().multiplyScalar(newDist);
      camera.position.copy(target.clone().add(dir));

      controls.update();
      clampOrbit(camera, controls);
    },
    []
  );

  const zoomIn = useCallback(() => zoomBy(0.85), [zoomBy]);
  const zoomOut = useCallback(() => zoomBy(1.18), [zoomBy]);

  const recenter = useCallback(() => {
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    if (!controls || !camera) return;

    setOrbitLibre(false);
    setFPEnabled(false);

    controls.target.set(0, 1, 0);
    camera.position.set(20, 8, 20);
    controls.update();
    clampOrbit(camera, controls);
  }, [setFPEnabled]);

  // ✅ SELECT (FP) + DEBUG (folosește WARN ca să intre în DebugConsole-ul tău)
  const selectFromCrosshair = useCallback(() => {
  const fp = fpRef.current;
  const cam = cameraRef.current;

  if (!fp || !cam) {
    console.warn("[SELECT] fp/camera missing", { hasFP: !!fp, hasCam: !!cam });
    return;
  }

  const hit = fp.getInteractHit?.({ maxDist: 45 });

  if (!hit) {
    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    console.warn("[SELECT] no hit", {
      camPos: { x: cam.position.x, y: cam.position.y, z: cam.position.z },
      camDir: { x: dir.x, y: dir.y, z: dir.z },
    });
    return;
  }

  const obj = hit.object;

  console.warn("[SELECT] hit raw", {
    distance: hit.distance,
    instanceId: hit.instanceId,
    objectType: obj?.type,
    objectName: obj?.name,
    isInstancedMesh: !!obj?.isInstancedMesh,
    userDataKeys: obj?.userData ? Object.keys(obj.userData) : [],
  });

  // ✅ helper: caută userData pe lanțul de părinți
  const findUp = (start, predicate) => {
    let cur = start;
    while (cur) {
      if (predicate(cur)) return cur;
      cur = cur.parent;
    }
    return null;
  };

  // ✅ Instanced containers: caută records și pe părinți
  if (obj?.isInstancedMesh && obj.userData?.records && hit.instanceId != null) {
  const rec = obj.userData.records[hit.instanceId];

  onContainerSelectedRef.current?.(rec || null);
  highlightContainer(hit, rec);

  return;
}

  // ✅ Mesh container: caută __record și pe părinți
  const recordHolder = findUp(obj, (o) => !!o?.userData?.__record);
  if (recordHolder?.userData?.__record) {
    console.warn("[SELECT] mesh record", recordHolder.userData.__record);
    onContainerSelectedRef.current?.(recordHolder.userData.__record);
    showSelectedMarker(recordHolder.userData.__record);
    return;
  }

  console.warn("[SELECT] hit but no record attached", {
    objectName: obj?.name,
    objectType: obj?.type,
    userData: obj?.userData || null,
  });
}, [showSelectedMarker]);

const highlightContainer = useCallback((hit, record) => {
  const scene = sceneRef.current;
  if (!scene || !hit) return;

  const mesh = hit.object;
  const index = hit.instanceId;

  // 🧹 curăță highlight vechi
  if (selectedInstanceRef.current.mesh) {
    const { mesh: oldMesh, index: oldIndex, originalColor } =
      selectedInstanceRef.current;

    if (oldMesh?.setColorAt && originalColor) {
      oldMesh.setColorAt(oldIndex, originalColor);
      oldMesh.instanceColor.needsUpdate = true;
    }
  }

  // 💡 lumină deasupra containerului
  if (!selectedLightRef.current) {
    const light = new THREE.PointLight(0x22d3ee, 2.2, 10);
    light.castShadow = false;
    scene.add(light);
    selectedLightRef.current = light;
  }

  const tempMatrix = new THREE.Matrix4();
  const tempPos = new THREE.Vector3();
  mesh.getMatrixAt(index, tempMatrix);
  tempMatrix.decompose(tempPos, new THREE.Quaternion(), new THREE.Vector3());

  selectedLightRef.current.visible = true;
  selectedLightRef.current.position.set(
    tempPos.x,
    tempPos.y + 2.8,
    tempPos.z
  );

  // ✨ glow prin culoare instanță
  if (!mesh.instanceColor) {
    mesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(mesh.count * 3),
      3
    );
    for (let i = 0; i < mesh.count; i++) {
      mesh.setColorAt(i, new THREE.Color(1, 1, 1));
    }
  }

  const original = new THREE.Color();
  mesh.getColorAt(index, original);

  mesh.setColorAt(index, new THREE.Color(0.2, 1, 1)); // cyan
  mesh.instanceColor.needsUpdate = true;

  selectedInstanceRef.current = {
    mesh,
    index,
    originalColor: original,
  };
}, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "KeyE") selectFromCrosshair();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectFromCrosshair]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rendererRef.current = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000
    );
    camera.position.set(20, 8, 20);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = true;
    controls.screenSpacePanning = false;
    controls.minPolarAngle = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    controls.minDistance = 4;
    controls.maxDistance = Math.max(YARD_WIDTH, YARD_DEPTH);
    controls.target.set(0, 1, 0);
    controlsRef.current = controls;

    fpRef.current = createFirstPerson(camera, bounds, {
      eyeHeight: 1.7,
      stepMax: 0.6,
      slopeMax: Math.tan((40 * Math.PI) / 180),
    });
    fpRef.current?.attach?.(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 10, 5);
    scene.add(dir);

    scene.add(
      createSky({
        scene,
        renderer,
        hdrPath: "/textures/lume/golden_gate_hills_1k.hdr",
        exposure: 1.1,
      })
    );

    const landscape = createLandscape({ ground: CFG.ground });
    scene.add(landscape);

    const baseWorld = createBaseWorld();
    scene.add(baseWorld);

    const worldGroup = new THREE.Group();
    worldGroup.name = "worldGroup";
    scene.add(worldGroup);

    const depotGroup = new THREE.Group();
    depotGroupRef.current = depotGroup;

    const groundNode = createGround(CFG.ground);
    const groundMesh = groundNode.userData?.groundMesh || groundNode;

    const fence = createFence({
      width: YARD_WIDTH - 4,
      depth: YARD_DEPTH - 4,
      margin: 2,
      postEvery: 10,
      openings: {
        west: [
          { z: -4, width: 4 },
          { z: -7, width: 4 },
          { z: -9, width: 4 },
        ],
        east: [],
        north: [],
        south: [],
      },
    });

    depotGroup.add(groundNode, fence);
    scene.add(depotGroup);

    buildRef.current = createBuildController({
      camera,
      domElement: renderer.domElement,
      worldGroup,
      groundMesh,
      raycastTargets: [
        ...(groundNode.userData?.raycastTargets || [groundMesh]),
        baseWorld,
        landscape,
      ],
      grid: 1,
    });
    buildRef.current?.setMode(buildMode);
    buildRef.current?.setType?.("road.segment");

    (async () => {
      try {
        const data = await fetchContainers();
        setContainers(data?.containers || []);

        const layer = createContainersLayerOptimized(data, CFG.ground);
        containersLayerRef.current = layer;
        depotGroup.add(layer);

        // (păstrăm ce aveai deja)
        const fp = fpRef.current;
        if (fp) {
          const interactTargets = [layer, depotGroup];
          if (fp.setInteractables) fp.setInteractables(interactTargets);
          if (fp.setInteractTargets) fp.setInteractTargets(interactTargets);
          if (fp.setRaycastTargets) fp.setRaycastTargets(interactTargets);
        }
      } catch (e) {
        console.warn("fetchContainers", e);
      }
    })();

    const walkables = [groundMesh, baseWorld, worldGroup, landscape];
    fpRef.current?.setWalkables?.(walkables);

    const landscapeSolids = collectMeshes(landscape, { excludeNameIncludes: ["grass"] });
    const baseWorldSolids = collectMeshes(baseWorld, { excludeNameIncludes: ["grass"] });

    const colliders = [baseWorld, ...baseWorldSolids, worldGroup, fence, ...landscapeSolids];

    // ✅ AICI e locul corect:
    // - COLLISION = proxy colliders (layer.userData.colliders)
    // - INTERACT = mesh-urile vizuale (InstancedMesh cu records / Mesh cu __record)
    const attachCollidersWhenReady = () => {
      const layer = containersLayerRef.current;
      if (!layer) return setTimeout(attachCollidersWhenReady, 50);

      const fp = fpRef.current;
      if (!fp) return setTimeout(attachCollidersWhenReady, 50);

      // ✅ INTERACT targets (vizuale)
      const interactables = [];
      layer.traverse((o) => {
        if (o?.isInstancedMesh && o.userData?.records) interactables.push(o);
        if (o?.isMesh && o.userData?.__record) interactables.push(o);
      });

      if (fp.setInteractTargets) fp.setInteractTargets(interactables);
      if (fp.setInteractables) fp.setInteractables(interactables);
      if (fp.setRaycastTargets) fp.setRaycastTargets(interactables);

      // ✅ COLLISION targets (proxy)
      const colGroup = layer.userData?.colliders;
      if (colGroup) {
        colliders.push(colGroup);
        fp.setColliders?.(colliders);
        (fp.setCollisionTargets || fp.setColliders)?.(colliders);
      } else {
        setTimeout(attachCollidersWhenReady, 50);
      }
    };
    attachCollidersWhenReady();

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPick = (event) => {
      if (buildActiveRef.current) return;
      if (event.target?.closest?.('[data-map-ui="1"]')) return;

      const rect = renderer.domElement.getBoundingClientRect();
      const x = event.clientX ?? 0;
      const y = event.clientY ?? 0;

      mouse.x = ((x - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((y - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(depotGroup.children, true);

      if (intersects.length > 0) {
        const hit = intersects[0];
        const obj = hit.object;

        if (obj.isInstancedMesh && obj.userData?.records && hit.instanceId != null) {
          const rec = obj.userData.records[hit.instanceId];
          onContainerSelectedRef.current?.(rec || null);
          if (rec) showSelectedMarker(rec);
          return;
        }

        if (obj.userData?.__record) {
          onContainerSelectedRef.current?.(obj.userData.__record);
          showSelectedMarker(obj.userData.__record);
          return;
        }
      }

      onContainerSelectedRef.current?.(null);
      if (markerRef.current) markerRef.current.visible = false;
    };

    renderer.domElement.addEventListener("pointerdown", onPick, { passive: true });

    const isOverBuildUI = (x, y) => {
      const el = document.elementFromPoint(x, y);
      return !!el?.closest?.('[data-build-ui="true"]');
    };

    const handleMove = (x, y) => {
      if (!buildActiveRef.current || !buildRef.current) return;
      buildRef.current.updatePreviewAt(x, y);
    };

    const handleBuildClick = (x, y) => {
      if (!buildActiveRef.current || !buildRef.current) return;
      if (isOverBuildUI(x, y)) return;
      buildRef.current.clickAt(x, y);
    };

    const onPointerMove = (e) => handleMove(e.clientX, e.clientY);
    const onPointerDownBuild = (e) => {
      if (!buildActiveRef.current) return;
      handleBuildClick(e.clientX, e.clientY);
    };

    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerdown", onPointerDownBuild);

    const animate = () => {
      requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();

      if (buildActiveRef.current) buildRef.current?.updatePreview?.();

      const cam = cameraRef.current;
      const ctl = controlsRef.current;

      if (markerRef.current?.visible) {
        const ring = markerRef.current;
        ring.userData._pulseT = (ring.userData._pulseT || 0) + delta * 2.2;
        const s = 1 + Math.sin(ring.userData._pulseT) * 0.08;
        ring.scale.set(s, s, s);
        ring.material.opacity = 0.75 + Math.sin(ring.userData._pulseT) * 0.18;
      }

      if (isFPRef.current) {
        fpRef.current?.update(delta);
      } else {
        if (orbitLibreRef.current && cam && ctl) {
          const p = autoOrbitRef.current;
          p.angle += (p.clockwise ? 1 : -1) * p.speed * delta;
          const cx = Math.cos(p.angle) * p.radius;
          const cz = Math.sin(p.angle) * p.radius;
          ctl.target.copy(p.target);
          cam.position.set(cx, p.height, cz);
          cam.lookAt(p.target);
          ctl.update();
        } else {
          ctl?.update();
        }
        clampOrbit(cam, ctl);
      }

      renderer.render(scene, cam);
    };
    animate();

    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);

      renderer.domElement.removeEventListener("pointerdown", onPick);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerdown", onPointerDownBuild);

      fpRef.current?.detach?.();
      fpRef.current?.disable?.();

      renderer.dispose();

      markerRef.current = null;
      sceneRef.current = null;
      depotGroupRef.current = null;
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const orbit = controlsRef.current;
    if (!orbit) return;
    orbit.enabled = !buildActive && !isFPRef.current;
    if (!orbit.enabled) setOrbitLibre(false);
  }, [buildActive]);

  return {
    isFP,
    setFPEnabled,
    setForwardPressed,
    setJoystick,
    setLookJoystick,
    selectFromCrosshair,

    buildActive,
    setBuildActive,
    buildApi,

    containers,

    openWorldItems: () => console.log("[WorldItems] open (TODO Modal)"),
    setOnContainerSelected,

    focusCameraOnContainer,
    showSelectedMarker,

    zoomIn,
    zoomOut,
    recenter,

    startOrbitLibre: (opts = {}) => {
      setFPEnabled(false);
      setBuildActive(false);

      const p = autoOrbitRef.current;
      if (opts.speed) p.speed = opts.speed;
      if (opts.radius) p.radius = opts.radius;
      if (opts.height) p.height = opts.height;
      if (opts.clockwise != null) p.clockwise = !!opts.clockwise;

      const controls = controlsRef.current;
      if (controls) controls.target.set(0, 1, 0);

      setOrbitLibre(true);
    },
    stopOrbitLibre: () => setOrbitLibre(false),
    isOrbitLibre: orbitLibre,
  };
}
// src/components/depot/map/scene/useDepotScene.js
import * as THREE from "three";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { createTreesGroup } from "./trees/createTreesGroup";

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

const YARD_WIDTH = 90;
const YARD_DEPTH = 60;
const YARD_COLOR = 0x9aa0a6;

const SLOT_LEN = 6.06;
const SLOT_GAP = 0.06;
const STEP = SLOT_LEN + SLOT_GAP;
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
      if (nm.includes(String(frag).toLowerCase())) return;
    }
    out.push(obj);
  });
  return out;
}

export function useDepotScene({ mountRef }) {
  // ---------------- UI state ----------------
  const [isFP, setIsFP] = useState(false);
  const [containers, setContainers] = useState([]);

  // Build
  const [buildActive, setBuildActive] = useState(false);
  const [buildMode, setBuildMode] = useState("place");

  // Orbit libre
  const [orbitLibre, setOrbitLibre] = useState(false);
  const orbitLibreRef = useRef(false);
  useEffect(() => {
    orbitLibreRef.current = orbitLibre;
  }, [orbitLibre]);

  // ---------------- Refs ----------------
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const fpRef = useRef(null);

  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const depotGroupRef = useRef(null);
  const containersLayerRef = useRef(null);

  // Build controller ref
  const buildRef = useRef(null);

  // highlight ring + light
  const markerRef = useRef(null);
  const selectedLightRef = useRef(null);

  // keep & restore instanced color
  const selectedInstanceRef = useRef({
    mesh: null,
    index: null,
    originalColor: null,
  });

  // base colliders
  const collidersRef = useRef([]);

  // time
  const clockRef = useRef(new THREE.Clock());

  // runtime flags
  const isFPRef = useRef(false);
  const buildActiveRef = useRef(false);
  useEffect(() => {
    buildActiveRef.current = buildActive;
    buildRef.current?.setEnabled?.(!!buildActive);
  }, [buildActive]);

  // ---------------- Bounds ----------------
  const yardPad = 0.5;
  const yardMinX = -YARD_WIDTH / 2 + yardPad;
  const yardMaxX = YARD_WIDTH / 2 - yardPad;
  const yardMinZ = -YARD_DEPTH / 2 + yardPad;
  const yardMaxZ = YARD_DEPTH / 2 - yardPad;

  const bounds = useMemo(
    () => ({
      minX: -YARD_WIDTH / 2 + 2,
      maxX: YARD_WIDTH / 2 - 2,
      minZ: -YARD_DEPTH / 2 + 2,
      maxZ: YARD_DEPTH / 2 - 2,
    }),
    []
  );

  function clampOrbit(camera, controls) {
    if (!camera || !controls) return;
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, yardMinX, yardMaxX);
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, yardMinZ, yardMaxZ);
    if (camera.position.y < 0.5) camera.position.y = 0.5;
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, yardMinX, yardMaxX);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, yardMinZ, yardMaxZ);
  }

  const autoOrbitRef = useRef({
    angle: 0,
    speed: Math.PI / 28,
    radius: Math.hypot(YARD_WIDTH, YARD_DEPTH) * 0.55,
    height: 10,
    target: new THREE.Vector3(0, 1, 0),
    clockwise: true,
  });

  // ---------------- API: FP enable/disable ----------------
  const setFPEnabled = useCallback((enabled) => {
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
      orbit.enabled = true;
      isFPRef.current = false;
      setIsFP(false);
    }
  }, []);

  const setForwardPressed = useCallback((v) => fpRef.current?.setForwardPressed?.(v), []);
  const setJoystick = useCallback((v) => fpRef.current?.setJoystick?.(v), []);
  const setLookJoystick = useCallback((v) => {
    const fp = fpRef.current;
    if (!fp) return;
    if (fp.setLookJoystick) fp.setLookJoystick(v);
    else if (fp.setLook) fp.setLook(v);
    else if (fp.setLookDelta) fp.setLookDelta(v);
  }, []);

  // ---------------- Build API wrapper ----------------
  const buildApi = useMemo(
    () => ({
      get mode() {
        return buildMode;
      },
      setMode: (m) => {
        setBuildMode(m);
        buildRef.current?.setMode?.(m);
      },
      rotateStep: (dir) => buildRef.current?.rotateStep?.(dir),
      setType: (t) => buildRef.current?.setType?.(t),
      get controller() {
        return buildRef.current;
      },
      get active() {
        return buildActiveRef.current;
      },
      finalizeJSON: () => {
        try {
          const raw = localStorage.getItem("rayna.world.edits") || '{"props":[]}';
          return JSON.stringify(JSON.parse(raw), null, 2);
        } catch {
          return '{"props":[]}';
        }
      },
    }),
    [buildMode]
  );

  // ---------------- Selection plumbing ----------------
  const onContainerSelectedRef = useRef(null);
  const setOnContainerSelected = useCallback((fn) => {
    onContainerSelectedRef.current = fn;
  }, []);

  const findUp = useCallback((start, predicate) => {
    let cur = start;
    while (cur) {
      if (predicate(cur)) return cur;
      cur = cur.parent;
    }
    return null;
  }, []);

  const clearHighlight = useCallback(() => {
    const cur = selectedInstanceRef.current;
    if (cur?.mesh && cur.index != null && cur.originalColor && cur.mesh.setColorAt) {
      try {
        cur.mesh.setColorAt(cur.index, cur.originalColor);
        if (cur.mesh.instanceColor) cur.mesh.instanceColor.needsUpdate = true;
      } catch {}
    }
    selectedInstanceRef.current = { mesh: null, index: null, originalColor: null };

    if (selectedLightRef.current) selectedLightRef.current.visible = false;
    if (markerRef.current) markerRef.current.visible = false;
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

  const highlightContainer = useCallback((hit) => {
    const scene = sceneRef.current;
    if (!scene || !hit?.object) return;

    if (!selectedLightRef.current) {
      const light = new THREE.PointLight(0x22d3ee, 2.2, 12);
      light.castShadow = false;
      scene.add(light);
      selectedLightRef.current = light;
    }

    const obj = hit.object;

    if (obj?.isInstancedMesh && hit.instanceId != null) {
      const mesh = obj;
      const index = hit.instanceId;

      const cur = selectedInstanceRef.current;
      if (cur?.mesh && cur.index != null && cur.originalColor && cur.mesh.setColorAt) {
        try {
          cur.mesh.setColorAt(cur.index, cur.originalColor);
          if (cur.mesh.instanceColor) cur.mesh.instanceColor.needsUpdate = true;
        } catch {}
      }

      const tmpM = new THREE.Matrix4();
      const tmpP = new THREE.Vector3();
      const tmpQ = new THREE.Quaternion();
      const tmpS = new THREE.Vector3();
      mesh.getMatrixAt(index, tmpM);
      tmpM.decompose(tmpP, tmpQ, tmpS);

      selectedLightRef.current.visible = true;
      selectedLightRef.current.position.set(tmpP.x, tmpP.y + 2.8, tmpP.z);

      if (!mesh.instanceColor) {
        mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(mesh.count * 3), 3);
        for (let i = 0; i < mesh.count; i++) mesh.setColorAt(i, new THREE.Color(1, 1, 1));
      }

      const original = new THREE.Color();
      try {
        mesh.getColorAt(index, original);
      } catch {
        original.set(1, 1, 1);
      }
      mesh.setColorAt(index, new THREE.Color(0.2, 1, 1));
      mesh.instanceColor.needsUpdate = true;

      selectedInstanceRef.current = { mesh, index, originalColor: original };
      return;
    }

    const worldPos = new THREE.Vector3();
    obj.getWorldPosition(worldPos);
    selectedLightRef.current.visible = true;
    selectedLightRef.current.position.set(worldPos.x, worldPos.y + 2.8, worldPos.z);
  }, []);

  // ---------------- Focus camera ----------------
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

  // ---------------- Zoom + recenter ----------------
  const zoomBy = useCallback((mult) => {
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
  }, []);

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

  // ---------------- FP SELECT (Minecraft action first) ----------------
  const selectFromCrosshair = useCallback(() => {
    if (buildActiveRef.current && buildRef.current) {
      buildRef.current.actionPrimary?.();
      return;
    }

    const fp = fpRef.current;
    const cam = cameraRef.current;
    if (!fp || !cam) return;

    const hit = fp.getInteractHit?.({ maxDist: 45 });
    if (!hit) {
      onContainerSelectedRef.current?.(null);
      clearHighlight();
      return;
    }

    const obj = hit.object;

    const instHolder = findUp(obj, (o) => !!o?.isInstancedMesh && !!o?.userData?.records);
    if (instHolder?.isInstancedMesh && hit.instanceId != null) {
      const rec = instHolder.userData.records?.[hit.instanceId] || null;
      onContainerSelectedRef.current?.(rec);
      if (rec) {
        highlightContainer({ ...hit, object: instHolder });
        showSelectedMarker(rec);
      } else {
        clearHighlight();
      }
      return;
    }

    const recordHolder = findUp(obj, (o) => !!o?.userData?.__record);
    if (recordHolder?.userData?.__record) {
      const rec = recordHolder.userData.__record;
      onContainerSelectedRef.current?.(rec);
      highlightContainer({ ...hit, object: recordHolder });
      showSelectedMarker(rec);
      return;
    }

    onContainerSelectedRef.current?.(null);
    clearHighlight();
  }, [clearHighlight, findUp, highlightContainer, showSelectedMarker]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "KeyE") selectFromCrosshair();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectFromCrosshair]);

  // ---------------- Containers layer (refresh) ----------------
  const loadContainersLayer = useCallback(async () => {
    const depotGroup = depotGroupRef.current;
    if (!depotGroup) return null;

    try {
      const data = await fetchContainers();
      const list = data?.containers || [];
      setContainers(list);

      if (containersLayerRef.current) {
        try {
          depotGroup.remove(containersLayerRef.current);
        } catch {}
        containersLayerRef.current = null;
      }

      const layer = createContainersLayerOptimized(data, CFG.ground);
      containersLayerRef.current = layer;
      depotGroup.add(layer);

      const fp = fpRef.current;
      if (fp) {
        const attach = () => {
          const layerNow = containersLayerRef.current;
          if (!layerNow) return;

          const interactables = [];
          layerNow.traverse((o) => {
            if (o?.isInstancedMesh && o.userData?.records) interactables.push(o);
            if (o?.isMesh && o.userData?.__record) interactables.push(o);
          });

          fp.setInteractTargets?.(interactables);
          fp.setInteractables?.(interactables);
          fp.setRaycastTargets?.(interactables);

          const colGroup = layerNow?.userData?.colliders;
          if (colGroup) {
            const baseCols = collidersRef.current || [];
            const nextCols = [...baseCols, colGroup];
            fp.setColliders?.(nextCols);
            (fp.setCollisionTargets || fp.setColliders)?.(nextCols);
          } else {
            setTimeout(attach, 50);
          }
        };
        attach();
      }

      return list;
    } catch (e) {
      console.warn("fetchContainers", e);
      return null;
    }
  }, []);

  // ---------------- Scene init ----------------
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rendererRef.current = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    // scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // camera
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    camera.position.set(20, 8, 20);
    cameraRef.current = camera;

    // orbit
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
    controls.enabled = true;
    controlsRef.current = controls;

    // FP
    fpRef.current = createFirstPerson(camera, bounds, {
      eyeHeight: 1.7,
      stepMax: 0.6,
      slopeMax: Math.tan((40 * Math.PI) / 180),
    });
    fpRef.current?.attach?.(renderer.domElement);

    // lights
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 10, 5);
    scene.add(dir);

    // sky + landscape + base world
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

    // world group (build props)
    const worldGroup = new THREE.Group();
    worldGroup.name = "worldGroup";
    scene.add(worldGroup);

    // TREES (static)
    const treesGroup = createTreesGroup({ targetHeight: 4, name: "trees.static" });
    worldGroup.add(treesGroup);

    // depot group
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

    // Build controller
    buildRef.current = createBuildController({
      camera,
      worldGroup,
      groundMesh,
      grid: 1,
    });
    buildRef.current?.setEnabled?.(!!buildActiveRef.current);
    buildRef.current?.setMode?.(buildMode);
    buildRef.current?.setType?.("road.segment");
    buildRef.current?.mountExistingFromStore?.();

    // walkables + colliders
    const walkables = [groundMesh, baseWorld, worldGroup, landscape];
    fpRef.current?.setWalkables?.(walkables);

    const landscapeSolids = collectMeshes(landscape, { excludeNameIncludes: ["grass"] });
    const baseWorldSolids = collectMeshes(baseWorld, { excludeNameIncludes: ["grass"] });
    const colliders = [baseWorld, ...baseWorldSolids, worldGroup, fence, ...landscapeSolids];
    collidersRef.current = colliders;

    // initial containers load
    loadContainersLayer();

    // ORBIT PICK
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPick = (event) => {
      if (buildActiveRef.current) return;
      if (event.target?.closest?.('[data-map-ui="1"]')) return;
      if (event.target?.closest?.('[data-build-ui="true"]')) return;

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

        const instHolder = findUp(obj, (o) => !!o?.isInstancedMesh && !!o?.userData?.records);
        if (instHolder?.isInstancedMesh && hit.instanceId != null) {
          const rec = instHolder.userData.records?.[hit.instanceId] || null;
          onContainerSelectedRef.current?.(rec);
          if (rec) {
            highlightContainer({ ...hit, object: instHolder });
            showSelectedMarker(rec);
          } else {
            clearHighlight();
          }
          return;
        }

        const recordHolder = findUp(obj, (o) => !!o?.userData?.__record);
        if (recordHolder?.userData?.__record) {
          const rec = recordHolder.userData.__record;
          onContainerSelectedRef.current?.(rec);
          highlightContainer({ ...hit, object: recordHolder });
          showSelectedMarker(rec);
          return;
        }
      }

      onContainerSelectedRef.current?.(null);
      clearHighlight();
    };

    renderer.domElement.addEventListener("pointerdown", onPick, { passive: true });

    // BUILD TAP
    const TAP_MAX_MOVE = 7;
    const tapState = { down: false, x0: 0, y0: 0, moved: 0 };

    const isOverBuildUI = (x, y) => {
      const el = document.elementFromPoint(x, y);
      return !!el?.closest?.('[data-build-ui="true"]') || !!el?.closest?.('[data-map-ui="1"]');
    };

    const onPointerDownBuild = (e) => {
      if (!buildActiveRef.current) return;
      if (isFPRef.current) return;
      if (isOverBuildUI(e.clientX, e.clientY)) return;

      tapState.down = true;
      tapState.x0 = e.clientX;
      tapState.y0 = e.clientY;
      tapState.moved = 0;
    };

    const onPointerMoveBuild = (e) => {
      if (!tapState.down) return;
      const dx = (e.clientX - tapState.x0) || 0;
      const dy = (e.clientY - tapState.y0) || 0;
      tapState.moved = Math.max(tapState.moved, Math.hypot(dx, dy));
    };

    const onPointerUpBuild = (e) => {
      if (!tapState.down) return;
      tapState.down = false;

      if (!buildActiveRef.current) return;
      if (isFPRef.current) return;
      if (isOverBuildUI(e.clientX, e.clientY)) return;
      if (tapState.moved > TAP_MAX_MOVE) return;

      buildRef.current?.actionPrimary?.();
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDownBuild, { passive: true });
    renderer.domElement.addEventListener("pointermove", onPointerMoveBuild, { passive: true });
    renderer.domElement.addEventListener("pointerup", onPointerUpBuild, { passive: true });

    // Animate loop
    const animate = () => {
      requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();

      if (markerRef.current?.visible) {
        const ring = markerRef.current;
        ring.userData._pulseT = (ring.userData._pulseT || 0) + delta * 2.2;
        const s = 1 + Math.sin(ring.userData._pulseT) * 0.08;
        ring.scale.set(s, s, s);
        ring.material.opacity = 0.75 + Math.sin(ring.userData._pulseT) * 0.18;
      }

      const cam = cameraRef.current;
      const ctl = controlsRef.current;

      if (isFPRef.current) {
        fpRef.current?.update?.(delta);
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

    // resize
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
      renderer.domElement.removeEventListener("pointerdown", onPointerDownBuild);
      renderer.domElement.removeEventListener("pointermove", onPointerMoveBuild);
      renderer.domElement.removeEventListener("pointerup", onPointerUpBuild);

      fpRef.current?.detach?.();
      fpRef.current?.disable?.();

      clearHighlight();

      try {
        worldGroup.remove(treesGroup);
      } catch {}

      buildRef.current?.dispose?.();
      buildRef.current = null;

      renderer.dispose();

      markerRef.current = null;
      sceneRef.current = null;
      depotGroupRef.current = null;
      rendererRef.current = null;
      selectedLightRef.current = null;
      containersLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep orbit enabled state consistent (FP is the only hard disable)
  useEffect(() => {
    const orbit = controlsRef.current;
    if (!orbit) return;
    orbit.enabled = !isFPRef.current;
    if (!orbit.enabled) setOrbitLibre(false);
  }, [isFP]);

  // Public API
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
    setOnContainerSelected,
    focusCameraOnContainer,
    showSelectedMarker,

    zoomIn,
    zoomOut,
    recenter,

    refreshContainers: loadContainersLayer,

    startOrbitLibre: (opts = {}) => {
      setFPEnabled(false);

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

    openWorldItems: () => console.log("[WorldItems] open (TODO Modal)"),
  };
}
// src/components/depot/map/scene/useSelection.js
import * as THREE from "three";
import { useCallback, useEffect, useRef } from "react";
import { slotToWorld } from "../threeWorld/slotToWorld";

/**
 * Hook pentru:
 * - select container (orbit pick / FP crosshair)
 * - highlight (instanced color + point light)
 * - marker ring pe poziție
 * - clear highlight
 *
 * Nu știe nimic despre UI (modals etc). Doar cheamă onSelected(rec|null).
 */
export function useSelection({
  sceneRef,
  cameraRef,
  fpRef,
  cfg,
  onSelectedRef, // ref către callback-ul setat din useDepotScene (onContainerSelectedRef)
}) {
  const markerRef = useRef(null);

  const selectedLightRef = useRef(null);

  // keep & restore instance color
  const selectedInstanceRef = useRef({
    mesh: null,
    index: null,
    originalColor: null,
  });

  // ---------------- Helpers ----------------
  const findUp = useCallback((start, predicate) => {
    let cur = start;
    while (cur) {
      if (predicate(cur)) return cur;
      cur = cur.parent;
    }
    return null;
  }, []);

  // ---------------- Clear highlight ----------------
  const clearHighlight = useCallback(() => {
    const cur = selectedInstanceRef.current;

    // restore instanced color
    if (
      cur?.mesh &&
      cur.index != null &&
      cur.originalColor &&
      cur.mesh.setColorAt
    ) {
      try {
        cur.mesh.setColorAt(cur.index, cur.originalColor);
        if (cur.mesh.instanceColor) cur.mesh.instanceColor.needsUpdate = true;
      } catch {}
    }

    selectedInstanceRef.current = { mesh: null, index: null, originalColor: null };

    // hide light
    if (selectedLightRef.current) selectedLightRef.current.visible = false;

    // hide ring marker
    if (markerRef.current) markerRef.current.visible = false;
  }, []);

  // ---------------- Marker ----------------
  const showSelectedMarker = useCallback(
    (container) => {
      const scene = sceneRef.current;
      if (!scene || !container) return;

      const slot = container.pos || container.posicion;
      if (!slot || typeof slot !== "string") return;

      const idx = parseInt(slot.match(/\d+/)?.[0] || "0", 10);
      const lane = slot[0];
      const tier = slot.match(/[A-Z]$/)?.[0] || "A";

      const wp = slotToWorld({ lane, index: idx, tier }, cfg.ground);
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
    },
    [sceneRef, cfg]
  );

  // ---------------- Highlight ----------------
  const highlightContainer = useCallback(
    (hit) => {
      const scene = sceneRef.current;
      if (!scene || !hit?.object) return;

      // ensure light
      if (!selectedLightRef.current) {
        const light = new THREE.PointLight(0x22d3ee, 2.2, 12);
        light.castShadow = false;
        scene.add(light);
        selectedLightRef.current = light;
      }

      const obj = hit.object;

      // instanced mesh case
      if (obj?.isInstancedMesh && hit.instanceId != null) {
        const mesh = obj;
        const index = hit.instanceId;

        // restore old
        const cur = selectedInstanceRef.current;
        if (cur?.mesh && cur.index != null && cur.originalColor && cur.mesh.setColorAt) {
          try {
            cur.mesh.setColorAt(cur.index, cur.originalColor);
            if (cur.mesh.instanceColor) cur.mesh.instanceColor.needsUpdate = true;
          } catch {}
        }

        // compute instance world position
        const tmpM = new THREE.Matrix4();
        const tmpP = new THREE.Vector3();
        const tmpQ = new THREE.Quaternion();
        const tmpS = new THREE.Vector3();

        mesh.getMatrixAt(index, tmpM);
        tmpM.decompose(tmpP, tmpQ, tmpS);

        selectedLightRef.current.visible = true;
        selectedLightRef.current.position.set(tmpP.x, tmpP.y + 2.8, tmpP.z);

        // ensure instanceColor
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
        try {
          mesh.getColorAt(index, original);
        } catch {
          original.set(1, 1, 1);
        }

        mesh.setColorAt(index, new THREE.Color(0.2, 1, 1)); // cyan
        mesh.instanceColor.needsUpdate = true;

        selectedInstanceRef.current = { mesh, index, originalColor: original };
        return;
      }

      // normal mesh
      const worldPos = new THREE.Vector3();
      obj.getWorldPosition(worldPos);
      selectedLightRef.current.visible = true;
      selectedLightRef.current.position.set(worldPos.x, worldPos.y + 2.8, worldPos.z);
    },
    [sceneRef]
  );

  // ---------------- Select from FP ----------------
  const selectFromCrosshair = useCallback(() => {
    const fp = fpRef.current;
    const cam = cameraRef.current;

    if (!fp || !cam) return;

    const hit = fp.getInteractHit?.({ maxDist: 45 });
    if (!hit) {
      onSelectedRef.current?.(null);
      clearHighlight();
      return;
    }

    const obj = hit.object;

    // instanced containers (records)
    const instHolder = findUp(obj, (o) => !!o?.isInstancedMesh && !!o?.userData?.records);
    if (instHolder?.isInstancedMesh && hit.instanceId != null) {
      const rec = instHolder.userData.records?.[hit.instanceId] || null;
      onSelectedRef.current?.(rec);
      if (rec) {
        highlightContainer({ ...hit, object: instHolder });
        showSelectedMarker(rec);
      } else {
        clearHighlight();
      }
      return;
    }

    // mesh __record
    const recordHolder = findUp(obj, (o) => !!o?.userData?.__record);
    if (recordHolder?.userData?.__record) {
      const rec = recordHolder.userData.__record;
      onSelectedRef.current?.(rec);
      highlightContainer({ ...hit, object: recordHolder });
      showSelectedMarker(rec);
      return;
    }

    onSelectedRef.current?.(null);
    clearHighlight();
  }, [
    fpRef,
    cameraRef,
    onSelectedRef,
    findUp,
    highlightContainer,
    showSelectedMarker,
    clearHighlight,
  ]);

  // hotkey optional (E)
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "KeyE") selectFromCrosshair();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectFromCrosshair]);

  // tick helper pentru pulse marker
  const tickMarkerPulse = useCallback((delta) => {
    if (!markerRef.current?.visible) return;
    const ring = markerRef.current;
    ring.userData._pulseT = (ring.userData._pulseT || 0) + delta * 2.2;
    const s = 1 + Math.sin(ring.userData._pulseT) * 0.08;
    ring.scale.set(s, s, s);
    ring.material.opacity = 0.75 + Math.sin(ring.userData._pulseT) * 0.18;
  }, []);

  return {
    clearHighlight,
    showSelectedMarker,
    highlightContainer,
    selectFromCrosshair,
    tickMarkerPulse,
    findUp, // util pentru orbit pick
  };
}
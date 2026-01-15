// src/components/depot/map/scene/useResize.js
import { useEffect } from "react";

export function useResize({ mountRef, rendererRef, cameraRef }) {
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const onResize = () => {
      const r = rendererRef.current;
      const cam = cameraRef.current;
      if (!r || !cam) return;

      const w = mount.clientWidth;
      const h = mount.clientHeight;
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
      r.setSize(w, h);
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mountRef, rendererRef, cameraRef]);
}
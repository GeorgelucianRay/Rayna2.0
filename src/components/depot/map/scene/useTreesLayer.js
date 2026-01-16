// ASCII quotes only
import { useEffect, useRef } from "react";
import { createTreesGroup } from "./trees/createTreesGroup";

export function useTreesLayer({ worldGroupRef, enabled = true } = {}) {
  const treesRef = useRef(null);

  useEffect(() => {
    const wg = worldGroupRef?.current;
    if (!enabled || !wg) return;

    if (!treesRef.current) {
      treesRef.current = createTreesGroup({
        targetHeight: 4,
        name: "trees.static",
      });
    }

    // monteaza o singura data
    if (treesRef.current.parent !== wg) {
      wg.add(treesRef.current);
    }

    return () => {
      try {
        if (treesRef.current && treesRef.current.parent) {
          treesRef.current.parent.remove(treesRef.current);
        }
      } catch {}
    };
  }, [worldGroupRef, enabled]);

  return {
    treesRef,
  };
}
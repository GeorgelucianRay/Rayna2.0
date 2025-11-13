// src/components/depot/hooks/useDepotSlots.js
import { useEffect, useState } from "react";
import { supabase } from "../../../supabaseClient";

import computeOccupiedSlots from "../utils/computeOccupiedSlots";

export default function useDepotSlots(refresh) {
  const [slotMap, setSlotMap] = useState({});

  useEffect(() => {
    let alive = true;

    const load = async () => {
      const [{ data: dep }, { data: rot }, { data: prog }] = await Promise.all([
        supabase.from("contenedores").select("matricula_contenedor,tipo,posicion"),
        supabase.from("contenedores_rotos").select("matricula_contenedor,tipo,posicion"),
        supabase.from("contenedores_programados").select(
          "matricula_contenedor,tipo,posicion"
        )
      ]);

      const all = [
        ...(dep || []).map((r) => ({ ...r, __from: "contenedores" })),
        ...(rot || []).map((r) => ({ ...r, __from: "contenedores_rotos" })),
        ...(prog || []).map((r) => ({ ...r, __from: "programados" }))
      ];

      const map = {};

      all.forEach((row) => {
        const slots = computeOccupiedSlots(row.posicion, row.tipo);
        slots.forEach((s) => {
          if (!map[s]) map[s] = row;
        });
      });

      if (alive) setSlotMap(map);
    };

    load();
    return () => (alive = false);
  }, [refresh]);

  return slotMap;
}
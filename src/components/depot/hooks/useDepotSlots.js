// src/components/depot/hooks/useDepotSlots.js
import { useEffect, useState } from "react";
import { supabase } from "../../../supabaseClient";
import { computeOccupiedSlots } from "../utils/computeOccupiedSlots";

/**
 * Returnează o hartă a sloturilor ocupate:
 *   { "A1A": { matricula_contenedor, tipo, posicion, __from }, ... }
 *
 * Dependență: `refresh` – când se schimbă (incrementat în useDepotData),
 * reîncarcă sloturile.
 */
export default function useDepotSlots(refresh) {
  const [slotMap, setSlotMap] = useState({});

  useEffect(() => {
    let alive = true;

    const loadSlots = async () => {
      try {
        const [{ data: dep }, { data: rot }, { data: prog }] = await Promise.all([
          supabase
            .from("contenedores")
            .select("matricula_contenedor, tipo, posicion"),
          supabase
            .from("contenedores_rotos")
            .select("matricula_contenedor, tipo, posicion"),
          supabase
            .from("contenedores_programados")
            .select("matricula_contenedor, tipo, posicion"),
        ]);

        const all = [
          ...(dep || []).map((r) => ({ ...r, __from: "contenedores" })),
          ...(rot || []).map((r) => ({ ...r, __from: "contenedores_rotos" })),
          ...(prog || []).map((r) => ({ ...r, __from: "programados" })),
        ];

        const map = {};
        all.forEach((r) => {
          const slots = computeOccupiedSlots(r.posicion, r.tipo);
          slots.forEach((s) => {
            if (!s) return;
            // nu suprascriem dacă există deja (primul câștigă)
            if (!map[s]) map[s] = r;
          });
        });

        if (!alive) return;
        setSlotMap(map);
      } catch (err) {
        console.error("[useDepotSlots] error:", err);
      }
    };

    loadSlots();
    return () => {
      alive = false;
    };
  }, [refresh]);

  return slotMap;
}
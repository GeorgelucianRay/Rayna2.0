// src/components/depot/hooks/useDepotMutations.js
import { supabase } from "../../../supabaseClient";
import computeOccupiedSlots from "../utils/computeOccupiedSlots";

export default function useDepotMutations(activeTab, refresh) {
  async function handleAdd(data, isBroken) {
    try {
      const slots = computeOccupiedSlots(data.posicion, data.tipo);

      if (slots.length && data.posicion !== "PENDIENTE") {
        const search = await Promise.all([
          supabase.from("contenedores").select("matricula_contenedor,posicion").in("posicion", slots),
          supabase.from("contenedores_rotos").select("matricula_contenedor,posicion").in("posicion", slots),
          supabase.from("contenedores_programados").select("matricula_contenedor,posicion").in("posicion", slots)
        ]);

        const ocupados = [...search[0].data, ...search[1].data, ...search[2].data].filter(
          Boolean
        );

        if (ocupados.length > 0) {
          const occ = ocupados[0];
          alert(
            `Lo siento, la posición está ocupada por "${occ.matricula_contenedor}" (${occ.posicion}).`
          );
          return false;
        }
      }

      // insert
      const table = isBroken ? "contenedores_rotos" : "contenedores";
      const { error } = await supabase.from(table).insert([data]);
      if (error) throw error;

      refresh();
      return true;
    } catch (err) {
      alert(err.message);
      return false;
    }
  }

  async function handleEdit(e, payload, selected) {
    try {
      const table = selected.__from === "programados" ? "contenedores_programados" : selected.__from;
      const { error } = await supabase
        .from(table)
        .update(payload)
        .eq("id", selected.id);

      if (error) throw error;

      refresh();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleSalida(e, payload) {
    try {
      const { error } = await supabase.from("contenedores_salidos").insert([payload]);
      if (error) throw error;

      await supabase.from("contenedores").delete().eq("id", payload.id);
      refresh();
    } catch (err) {
      alert(err.message);
    }
  }

  return { handleAdd, handleEdit, handleSalida };
}
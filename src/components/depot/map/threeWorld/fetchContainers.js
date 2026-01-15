import { supabase } from "../../../../supabaseClient";

function norm(s) {
  return String(s ?? "").trim();
}
function up(s) {
  return norm(s).toUpperCase();
}
function lower(s) {
  return norm(s).toLowerCase();
}

/**
 * Returnează TOATE containerele (depozit + programados + rotos),
 * cu metadate standardizate pentru:
 * - __source: "enDeposito" | "programados" | "rotos"
 * - source_table / __table: numele tabelei sursă
 * - estado (pentru programados): "programado" | "asignado" | "pendiente"
 *
 * IMPORTANT:
 * - NU filtrăm după posicion aici (altfel pierzi "pendiente").
 * - Render-ul 3D poate să ignore cele fără posicion.
 */
export default async function fetchContainers() {
  try {
    // Coloane minime + cele necesare pentru status & salida
    const colsBase =
      "id, matricula_contenedor, naviera, tipo, posicion, detalles, estado, empresa_descarga, fecha, hora, matricula_camion";

    const [resDep, resProg, resRot] = await Promise.all([
      supabase.from("contenedores").select(colsBase),
      supabase.from("contenedores_programados").select(colsBase),
      supabase.from("contenedores_rotos").select(colsBase),
    ]);

    if (resDep.error) throw resDep.error;
    if (resProg.error) throw resProg.error;
    if (resRot.error) throw resRot.error;

    const decorate = (rows, { source, table }) =>
      (rows || []).map((r) => ({
        ...r,

        // normalize fields used in UI
        matricula_contenedor: up(r?.matricula_contenedor),
        posicion: norm(r?.posicion) || null,

        // provenance
        __source: source,
        source_table: table,
        __table: table,
      }));

    const dep = decorate(resDep.data, {
      source: "enDeposito",
      table: "contenedores",
    });

    const rot = decorate(resRot.data, {
      source: "rotos",
      table: "contenedores_rotos",
    });

    // programados: determinăm "estado" dacă nu e setat corect în DB
    const prog = decorate(resProg.data, {
      source: "programados",
      table: "contenedores_programados",
    }).map((r) => {
      // 1) dacă există estado în DB, îl respectăm
      let est = lower(r?.estado);

      // 2) dacă nu există, îl deducem:
      //    - dacă are camion => asignado
      //    - dacă are fecha+hora => programado
      //    - altfel => pendiente
      if (!est) {
        const hasTruck = up(r?.matricula_camion).length >= 4;
        const hasDateTime = !!norm(r?.fecha) && !!norm(r?.hora);
        est = hasTruck ? "asignado" : hasDateTime ? "programado" : "pendiente";
      }

      // normalizare finală (siguranță)
      if (!["programado", "asignado", "pendiente"].includes(est)) {
        est = "programado";
      }

      return { ...r, estado: est };
    });

    // IMPORTANT: nu filtrăm după poziție aici
    const containers = [...dep, ...prog, ...rot];

    return {
      containers,
      depot: dep,
      programados: prog,
      rotos: rot,
    };
  } catch (err) {
    console.error("❌ fetchContainers error:", err);
    return { containers: [], depot: [], programados: [], rotos: [] };
  }
}
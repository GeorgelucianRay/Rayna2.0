import { supabase } from "../../../../supabaseClient";

function norm(s) { return String(s ?? "").trim(); }
function up(s) { return norm(s).toUpperCase(); }
function lower(s) { return norm(s).toLowerCase(); }

export default async function fetchContainers() {
  try {
    // SELECT pe fiecare tabel doar cu coloanele lui reale
    const colsDep = "id, matricula_contenedor, naviera, tipo, posicion";
    const colsRot = "id, matricula_contenedor, naviera, tipo, posicion, detalles";
    const colsProg =
      "id, matricula_contenedor, naviera, tipo, posicion, detalles, estado, empresa_descarga, fecha, hora, matricula_camion";

    const [resDep, resProg, resRot] = await Promise.all([
      supabase.from("contenedores").select(colsDep),
      supabase.from("contenedores_programados").select(colsProg),
      supabase.from("contenedores_rotos").select(colsRot),
    ]);

    if (resDep.error) throw resDep.error;
    if (resProg.error) throw resProg.error;
    if (resRot.error) throw resRot.error;

    const decorate = (rows, { source, table }) =>
      (rows || []).map((r) => ({
        ...r,
        matricula_contenedor: up(r?.matricula_contenedor),
        posicion: norm(r?.posicion) || null,
        __source: source,
        source_table: table,
        __table: table,
      }));

    const dep = decorate(resDep.data, { source: "enDeposito", table: "contenedores" });

    const rot = decorate(resRot.data, { source: "rotos", table: "contenedores_rotos" });

    const prog = decorate(resProg.data, { source: "programados", table: "contenedores_programados" })
      .map((r) => {
        let est = lower(r?.estado);

        if (!est) {
          const hasTruck = up(r?.matricula_camion).length >= 4;
          const hasDateTime = !!norm(r?.fecha) && !!norm(r?.hora);
          est = hasTruck ? "asignado" : hasDateTime ? "programado" : "pendiente";
        }

        if (!["programado", "asignado", "pendiente"].includes(est)) est = "programado";
        return { ...r, estado: est };
      });

    const all = [...dep, ...prog, ...rot];

    // IMPORTANT pentru 3D: render doar cele cu poziție validă
    const containers = all.filter((r) => r.posicion && String(r.posicion).trim().length > 0);

    return { containers, all, depot: dep, programados: prog, rotos: rot };
  } catch (err) {
    console.error("❌ fetchContainers error:", err);
    return { containers: [], all: [], depot: [], programados: [], rotos: [] };
  }
}
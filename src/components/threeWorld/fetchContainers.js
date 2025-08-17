// src/components/threeWorld/fetchContainers.js
import { supabase } from '../../supabaseClient';

/**
 * Returnează { enDeposito:[], programados:[], rotos:[] } cu câmpuri normalizate
 * (pos/posicion, tipo, naviera) ca să fie compatibile cu createContainersLayer.
 */
export default async function fetchContainers() {
  try {
    const colsBase =
      'id, created_at, matricula_contenedor, naviera, tipo, posicion, pos, estado, detalles, matricula_camion';

    const [resDep, resProg, resRot] = await Promise.all([
      supabase.from('contenedores').select(colsBase).order('created_at', { ascending: false }),
      supabase
        .from('contenedores_programados')
        .select(colsBase + ', empresa_descarga, fecha, hora')
        .order('created_at', { ascending: false }),
      supabase.from('contenedores_rotos').select(colsBase).order('created_at', { ascending: false }),
    ]);

    const norm = (arr = []) =>
      (arr || [])
        .map((r) => {
          const pos = (r.pos ?? r.posicion ?? '').toString().trim();
          const tipo = (r.tipo ?? '').toString().trim().toLowerCase();
          const naviera = (r.naviera ?? '').toString().trim().toUpperCase();
          return { ...r, pos, posicion: r.posicion ?? r.pos, tipo, naviera };
        })
        .filter((r) => r.pos.length > 0); // păstrăm doar cele cu poziție

    if (resDep.error || resProg.error || resRot.error) {
      console.warn('Supabase fetch error:', resDep.error?.message || resProg.error?.message || resRot.error?.message);
      return { enDeposito: [], programados: [], rotos: [] };
    }

    const enDeposito = norm(resDep.data);
    const programados = norm(resProg.data);
    const rotos = norm(resRot.data);

    // (opțional) mic debug în console
    // console.log('Fetched:', { enDeposito: enDeposito.length, programados: programados.length, rotos: rotos.length });

    return { enDeposito, programados, rotos };
  } catch (err) {
    console.warn('Supabase fetch failed:', err?.message || err);
    return { enDeposito: [], programados: [], rotos: [] };
  }
}
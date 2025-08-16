// src/components/threeWorld/fetchContainers.js
import { supabase } from '../../supabaseClient';

/**
 * Citește datele din tabelele tale. Returnează mereu:
 * { enDeposito:[], programados:[], rotos:[] }
 * Acceptă atât câmpul "posicion" (ES) cât și "pos" (RO/EN).
 */
export default async function fetchContainers() {
  try {
    const colsBase =
      'id, created_at, matricula_contenedor, naviera, tipo, posicion, pos, estado, detalles, matricula_camion';

    const [{ data: enDep, error: e1 }, { data: prog, error: e2 }, { data: rot, error: e3 }] =
      await Promise.all([
        supabase.from('contenedores').select(colsBase),
        supabase.from('contenedores_programados').select(colsBase + ', empresa_descarga, fecha, hora'),
        supabase.from('contenedores_rotos').select(colsBase),
      ]);

    if (e1 || e2 || e3) {
      console.warn('Supabase fetch error:', (e1 || e2 || e3)?.message);
      return { enDeposito: [], programados: [], rotos: [] };
    }

    return {
      enDeposito: enDep || [],
      programados: prog || [],
      rotos: rot || [],
    };
  } catch (err) {
    console.warn('Supabase fetch failed:', err?.message || err);
    return { enDeposito: [], programados: [], rotos: [] };
  }
}
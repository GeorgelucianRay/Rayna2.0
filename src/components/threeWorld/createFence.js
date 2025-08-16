// src/components/threeWorld/fetchContainers.js
import { supabase } from '../../supabaseClient';

/**
 * Citește containerele din tabelele tale.
 * Returnează mereu forma { enDeposito:[], programados:[], rotos:[] }
 * Dacă RLS blochează, prinde eroarea și întoarce array-uri goale (fără să crape scena).
 */
export default async function fetchContainers() {
  try {
    // selectăm explicit coloanele pe care Map-ul le folosește
    const colsBase =
      'id, created_at, matricula_contenedor, naviera, tipo, posicion, estado, detalles, matricula_camion';

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
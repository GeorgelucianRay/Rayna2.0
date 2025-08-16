import { supabase } from '../../supabaseClient';

export default async function fetchContainers() {
  try {
    const [{ data: enDep, error: e1 }, { data: progr, error: e2 }, { data: rotos, error: e3 }] =
      await Promise.all([
        supabase.from('contenedores').select('*'),
        supabase.from('contenedores_programados').select('*'),
        supabase.from('contenedores_rotos').select('*'),
      ]);
    if (e1 || e2 || e3) throw e1 || e2 || e3;
    return { enDeposito: enDep || [], programados: progr || [], rotos: rotos || [] };
  } catch (e) {
    console.warn('Supabase fetch failed (using empty data):', e?.message || e);
    return { enDeposito: [], programados: [], rotos: [] };
  }
}

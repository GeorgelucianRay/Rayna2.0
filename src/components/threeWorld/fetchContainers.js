// src/components/threeWorld/fetchContainers.js

import { supabase } from '../../supabaseClient';

/**
 * Aduce TOATE containerele (depozit, programate, defecte) într-o singură listă
 * pentru a fi afișate pe harta 3D.
 *
 * Returnează { containers: [] } cu câmpuri normalizate (pos, tipo, naviera)
 * și o proprietate `__source` pentru a ști de unde provine fiecare.
 */
export default async function fetchContainers() {
  try {
    const colsBase =
      'id, created_at, matricula_contenedor, naviera, tipo, posicion, pos, estado, detalles, matricula_camion';

    // 1. Fetch din toate cele 3 surse în paralel
    const [resDep, resProg, resRot] = await Promise.all([
      supabase.from('contenedores').select(colsBase),
      supabase.from('contenedores_programados').select(colsBase + ', empresa_descarga, fecha, hora'),
      supabase.from('contenedores_rotos').select(colsBase),
    ]);

    // Verificăm erori individuale
    if (resDep.error) console.warn('Supabase fetch error (contenedores):', resDep.error.message);
    if (resProg.error) console.warn('Supabase fetch error (programados):', resProg.error.message);
    if (resRot.error) console.warn('Supabase fetch error (rotos):', resRot.error.message);

    // 2. Adăugăm o sursă pentru fiecare, ca să le putem diferenția la desenare
    const enDeposito = (resDep.data || []).map(r => ({ ...r, __source: 'enDeposito' }));
    const programados = (resProg.data || []).map(r => ({ ...r, __source: 'programados' }));
    const rotos = (resRot.data || []).map(r => ({ ...r, __source: 'rotos' }));

    // 3. Combinăm totul într-o singură listă
    const combined = [...enDeposito, ...programados, ...rotos];

    // 4. Normalizăm și filtrăm lista combinată
    const norm = (arr) =>
      arr
        .map((r) => {
          const pos = (r.pos ?? r.posicion ?? '').toString().trim();
          const tipo = (r.tipo ?? '').toString().trim().toLowerCase();
          const naviera = (r.naviera ?? '').toString().trim().toUpperCase();
          return { ...r, pos, posicion: r.posicion ?? r.pos, tipo, naviera };
        })
        .filter((r) => r.pos.length > 0); // <-- Păstrăm DOAR cele cu poziție validă

    const finalContainers = norm(combined);
    
    // (opțional) Debug foarte util în consolă
    console.log(`Fetched a total of ${finalContainers.length} containers with valid positions to display on map.`);

    return { containers: finalContainers };

  } catch (err) {
    console.warn('Supabase fetch failed:', err?.message || err);
    return { containers: [] }; // Returnează mereu un format valid
  }
}

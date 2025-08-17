// src/components/threeWorld/fetchContainers.js
import { supabase } from '../../supabaseClient';

/**
 * Aduce TOATE containerele și oferă mesaje de diagnosticare clare.
 */
export default async function fetchContainers() {
  console.log("Starting to fetch containers for 3D map...");

  try {
    const colsBase = 'id, matricula_contenedor, naviera, tipo, posicion, pos';

    // 1. Fetch din toate cele 3 surse
    const [resDep, resProg, resRot] = await Promise.all([
      supabase.from('contenedores').select(colsBase),
      supabase.from('contenedores_programados').select(colsBase),
      supabase.from('contenedores_rotos').select(colsBase),
    ]);

    // Verificăm erori de rețea/Supabase
    if (resDep.error) console.error('Supabase fetch error (contenedores):', resDep.error.message);
    if (resProg.error) console.error('Supabase fetch error (programados):', resProg.error.message);
    if (resRot.error) console.error('Supabase fetch error (rotos):', resRot.error.message);

    // 2. Combinăm totul, chiar și rezultatele goale
    const combined = [
      ...((resDep.data || []).map(r => ({ ...r, __source: 'enDeposito' }))),
      ...((resProg.data || []).map(r => ({ ...r, __source: 'programados' }))),
      ...((resRot.data || []).map(r => ({ ...r, __source: 'rotos' }))),
    ];

    console.log(`Found a total of ${combined.length} records across all tables before filtering.`);

    // 3. Normalizăm și filtrăm, dar cu mesaje de avertizare
    const finalContainers = [];

    for (const r of combined) {
      // Normalizăm câmpurile cheie
      const pos = (r.pos || r.posicion || '').toString().trim();
      const tipo = (r.tipo || '').toString().trim().toLowerCase();
      const naviera = (r.naviera || '').toString().trim().toUpperCase();
      
      const record = { ...r, pos, tipo, naviera };

      // AICI ESTE VERIFICAREA CRITICĂ
      if (pos.length > 0) {
        finalContainers.push(record);
      } else {
        // Dacă un container nu are poziție, afișăm o avertizare
        console.warn(
          `🚧 Skipping container [${record.matricula_contenedor || 'N/A'}] because it has no position ('pos' or 'posicion' is empty).`,
          record
        );
      }
    }
    
    console.log(`✅ Finished. A total of ${finalContainers.length} containers have valid positions and will be sent to the renderer.`);

    return { containers: finalContainers };

  } catch (err) {
    console.error('A critical error occurred during fetchContainers:', err);
    return { containers: [] };
  }
}


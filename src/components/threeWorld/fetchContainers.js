import { supabase } from '../../supabaseClient';

/**
 * Aduce TOATE containerele cu debugging detaliat
 */
export default async function fetchContainers() {
  console.log("🚀 Starting to fetch containers for 3D map...");
  console.log("Timestamp:", new Date().toISOString());

  try {
    // Am eliminat coloana 'pos' care nu exista in baza de date
    const colsBase = 'id, matricula_contenedor, naviera, tipo, posicion';

    console.log("📡 Fetching from Supabase tables...");
    
    const [resDep, resProg, resRot] = await Promise.all([
      supabase.from('contenedores').select(colsBase),
      supabase.from('contenedores_programados').select(colsBase),
      supabase.from('contenedores_rotos').select(colsBase),
    ]);

    if (resDep.error) console.error('❌ Supabase error (contenedores):', resDep.error.message);
    if (resProg.error) console.error('❌ Supabase error (programados):', resProg.error.message);
    if (resRot.error) console.error('❌ Supabase error (rotos):', resRot.error.message);
    
    const combined = [
      ...((resDep.data || []).map(r => ({ ...r, __source: 'enDeposito' }))),
      ...((resProg.data || []).map(r => ({ ...r, __source: 'programados' }))),
      ...((resRot.data || []).map(r => ({ ...r, __source: 'rotos' }))),
    ];

    console.log(`📦 Total combined records: ${combined.length}`);
    
    // Folosim 'posicion' pentru a filtra
    const finalContainers = combined.filter(r => r.posicion && String(r.posicion).trim().length > 0);
    
    console.log('📊 Final summary:');
    console.log(`  ✅ Valid containers to be rendered: ${finalContainers.length}`);
    console.log(`  ⚠️ Skipped (no position): ${combined.length - finalContainers.length}`);
    
    return { containers: finalContainers };

  } catch (err) {
    console.error('❌ Critical error in fetchContainers:', err);
    return { containers: [] };
  }
}
// src/components/threeWorld/fetchContainers.js
import { supabase } from '../../supabaseClient';

/**
 * Aduce TOATE containerele cu debugging detaliat
 */
export default async function fetchContainers() {
  console.log("🚀 Starting to fetch containers for 3D map...");
  console.log("Timestamp:", new Date().toISOString());

  try {
    const colsBase = 'id, matricula_contenedor, naviera, tipo, posicion, pos';

    // 1. Fetch din toate cele 3 surse
    console.log("📡 Fetching from Supabase tables...");
    
    const [resDep, resProg, resRot] = await Promise.all([
      supabase.from('contenedores').select(colsBase),
      supabase.from('contenedores_programados').select(colsBase),
      supabase.from('contenedores_rotos').select(colsBase),
    ]);

    // Verificăm erori de rețea/Supabase
    if (resDep.error) {
      console.error('❌ Supabase error (contenedores):', resDep.error.message);
    } else {
      console.log(`✅ contenedores: ${resDep.data?.length || 0} records`);
      // Afișează primele 3 recorduri pentru verificare
      if (resDep.data?.length > 0) {
        console.log('Sample contenedores:', resDep.data.slice(0, 3));
      }
    }

    if (resProg.error) {
      console.error('❌ Supabase error (programados):', resProg.error.message);
    } else {
      console.log(`✅ contenedores_programados: ${resProg.data?.length || 0} records`);
      if (resProg.data?.length > 0) {
        console.log('Sample programados:', resProg.data.slice(0, 3));
      }
    }

    if (resRot.error) {
      console.error('❌ Supabase error (rotos):', resRot.error.message);
    } else {
      console.log(`✅ contenedores_rotos: ${resRot.data?.length || 0} records`);
      if (resRot.data?.length > 0) {
        console.log('Sample rotos:', resRot.data.slice(0, 3));
      }
    }

    // 2. Combinăm totul
    const combined = [
      ...((resDep.data || []).map(r => ({ ...r, __source: 'enDeposito' }))),
      ...((resProg.data || []).map(r => ({ ...r, __source: 'programados' }))),
      ...((resRot.data || []).map(r => ({ ...r, __source: 'rotos' }))),
    ];

    console.log(`📦 Total combined records: ${combined.length}`);

    // 3. Analizăm formatele de poziții
    const positionFormats = new Map();
    const emptyPositions = [];
    const validPositions = [];

    combined.forEach((r, idx) => {
      const posValue = r.pos || r.posicion || '';
      
      if (!posValue) {
        emptyPositions.push({
          index: idx,
          matricula: r.matricula_contenedor,
          source: r.__source
        });
      } else {
        // Verifică formatul
        const format = detectPositionFormat(posValue);
        if (!positionFormats.has(format)) {
          positionFormats.set(format, []);
        }
        positionFormats.get(format).push(posValue);
        
        if (format === 'valid') {
          validPositions.push(posValue);
        }
      }
    });

    // Raport formate poziții
    console.log('📍 Position format analysis:');
    positionFormats.forEach((positions, format) => {
      console.log(`   ${format}: ${positions.length} containers`);
      if (positions.length <= 5) {
        console.log(`     Examples: ${positions.join(', ')}`);
      } else {
        console.log(`     Examples: ${positions.slice(0, 5).join(', ')}...`);
      }
    });

    if (emptyPositions.length > 0) {
      console.warn(`⚠️ ${emptyPositions.length} containers without positions:`);
      console.table(emptyPositions.slice(0, 10)); // Primele 10
    }

    // 4. Normalizăm și filtrăm
    const finalContainers = [];
    const skippedContainers = [];

    for (const r of combined) {
      const pos = (r.pos || r.posicion || '').toString().trim();
      const tipo = (r.tipo || '').toString().trim().toLowerCase();
      const naviera = (r.naviera || '').toString().trim().toUpperCase();
      
      const record = { ...r, pos, tipo, naviera };

      if (pos.length > 0) {
        // Verifică dacă poziția pare validă
        const isValidFormat = /^[A-F]\d{1,2}[A-Z]?$/i.test(pos);
        
        if (isValidFormat) {
          finalContainers.push(record);
        } else {
          console.warn(`⚠️ Invalid position format for ${record.matricula_contenedor}: "${pos}"`);
          skippedContainers.push({
            matricula: record.matricula_contenedor,
            position: pos,
            reason: 'Invalid format'
          });
        }
      } else {
        skippedContainers.push({
          matricula: record.matricula_contenedor || 'N/A',
          position: 'empty',
          reason: 'No position'
        });
      }
    }
    
    // Raport final
    console.log('📊 Final summary:');
    console.log(`   ✅ Valid containers: ${finalContainers.length}`);
    console.log(`   ⚠️ Skipped containers: ${skippedContainers.length}`);
    
    if (skippedContainers.length > 0 && skippedContainers.length <= 20) {
      console.table(skippedContainers);
    }

    // Exemple de containere valide
    if (finalContainers.length > 0) {
      console.log('✅ Sample valid containers to be rendered:');
      console.table(finalContainers.slice(0, 5).map(c => ({
        matricula: c.matricula_contenedor,
        position: c.pos,
        tipo: c.tipo,
        naviera: c.naviera,
        source: c.__source
      })));
    }

    return { containers: finalContainers };

  } catch (err) {
    console.error('❌ Critical error in fetchContainers:', err);
    return { containers: [] };
  }
}

// Helper pentru a detecta formatul poziției
function detectPositionFormat(pos) {
  const s = String(pos).trim().toUpperCase();
  
  // Format valid: A1, B10, C5A, etc.
  if (/^[A-F]\d{1,2}[A-Z]?$/.test(s)) {
    return 'valid';
  }
  
  // Alte formate posibile
  if (/^\d+$/.test(s)) return 'only_numbers';
  if (/^[A-Z]+$/.test(s)) return 'only_letters';
  if (/^[A-Z]\d+[A-Z]\d+$/.test(s)) return 'complex';
  
  return 'unknown';
}
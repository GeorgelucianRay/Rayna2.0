// src/components/threeWorld/fetchContainers.js
import { supabase } from '../../supabaseClient';

/**
 * Citește containerele din tabelele tale.
 * Returnează mereu { enDeposito:[], programados:[], rotos:[] }.
 * Nu mai “pedepsim” toate listele dacă o singură masă are eroare.
 */
export default async function fetchContainers() {
  const out = { enDeposito: [], programados: [], rotos: [] };

  // — contenedores (în depozit)
  try {
    const { data, error } = await supabase
      .from('contenedores')
      .select('id, created_at, matricula_contenedor, naviera, tipo, posicion, estado, matricula_camion');
    if (error) {
      console.warn('[fetch] contenedores error:', error.message);
    } else {
      out.enDeposito = data || [];
    }
  } catch (e) {
    console.warn('[fetch] contenedores failed:', e?.message || e);
  }

  // — contenedores_programados
  try {
    const { data, error } = await supabase
      .from('contenedores_programados')
      .select('id, created_at, matricula_contenedor, naviera, tipo, posicion, empresa_descarga, fecha, hora, matricula_camion');
    if (error) {
      console.warn('[fetch] programados error:', error.message);
    } else {
      out.programados = data || [];
    }
  } catch (e) {
    console.warn('[fetch] programados failed:', e?.message || e);
  }

  // — contenedores_rotos (atenție: aici de obicei NU ai coloana `estado`)
  try {
    const { data, error } = await supabase
      .from('contenedores_rotos')
      .select('id, created_at, matricula_contenedor, naviera, tipo, posicion, detalles, matricula_camion');
    if (error) {
      console.warn('[fetch] rotos error:', error.message);
    } else {
      out.rotos = data || [];
    }
  } catch (e) {
    console.warn('[fetch] rotos failed:', e?.message || e);
  }

  // mic log de control
  console.log('[fetchContainers] counts -> enDeposito:', out.enDeposito.length, 'programados:', out.programados.length, 'rotos:', out.rotos.length);
  return out;
}
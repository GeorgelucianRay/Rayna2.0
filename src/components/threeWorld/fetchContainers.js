// src/components/threeWorld/fetchContainers.js
import { supabase } from '../../supabaseClient';

export default async function fetchContainers() {
  const out = { enDeposito: [], programados: [], rotos: [] };

  // --- contenedores (în depozit)
  try {
    const { data, error } = await supabase
      .from('contenedores')
      .select('*'); // selectăm tot ce există, evităm erori
    if (error) {
      console.warn('[fetch] contenedores error:', error.message);
    } else {
      out.enDeposito = data || [];
    }
  } catch (e) {
    console.warn('[fetch] contenedores failed:', e?.message || e);
  }

  // --- contenedores_programados
  try {
    const { data, error } = await supabase
      .from('contenedores_programados')
      .select('*');
    if (error) {
      console.warn('[fetch] programados error:', error.message);
    } else {
      out.programados = data || [];
    }
  } catch (e) {
    console.warn('[fetch] programados failed:', e?.message || e);
  }

  // --- contenedores_rotos
  try {
    const { data, error } = await supabase
      .from('contenedores_rotos')
      .select('*');
    if (error) {
      console.warn('[fetch] rotos error:', error.message);
    } else {
      out.rotos = data || [];
    }
  } catch (e) {
    console.warn('[fetch] rotos failed:', e?.message || e);
  }

  console.log('[fetchContainers] counts -> enDeposito:', out.enDeposito.length,
              'programados:', out.programados.length,
              'rotos:', out.rotos.length);

  return out;
}
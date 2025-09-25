// src/components/GpsPro/utils/dbRoutes.js

import { supabase } from '../../../supabaseClient';
import { pointsToGeoJSON, ensureFeatureCollection } from './geo';

/**
 * Salvează o rută în tabelul gps_routes.
 * Această funcție este adaptată la noua structură flexibilă.
 *
 * @param {{
 * name: string,
 * origin_type: string,
 * origin_id: number|string,
 * destination_type: string,
 * destination_id: number|string,
 * mode: 'service'|'manual'|'recorder',
 * provider: 'ors'|'user'|'gps',
 * geojson?: object|string|null,
 * points?: Array|null,
 * distance_m?: number|null,
 * duration_s?: number|null,
 * meta?: object|null
 * }} payload - Datele rutei de salvat.
 */
export async function saveRouteToDb(payload) {
  // === SECȚIUNEA MODIFICATĂ ===
  // Extragem noile câmpuri din payload, am eliminat complet 'client_id'.
  const {
    name,
    origin_type,
    origin_id,
    destination_type,
    destination_id,
    mode,
    provider,
    geojson = null,
    points = null,
    distance_m = null,
    duration_s = null,
    meta = null,
    // Adaugă aici orice alte câmpuri opționale ai
    round_trip = false,
    sampling = null,
    created_by = null,
  } = payload || {};

  // Validări de bază
  if (!name) throw new Error('Lipsește numele rutei.');
  if (!origin_type || !origin_id) throw new Error('Originea rutei este incompletă.');
  if (!destination_type || !destination_id) throw new Error('Destinația rutei este incompletă.');
  
  let fc = ensureFeatureCollection(geojson);

  // Dacă nu avem geojson dar avem points → construim
  if (!fc && Array.isArray(points) && points.length >= 2) {
    fc = pointsToGeoJSON(points);
  }

  if (!fc) {
    throw new Error('Nu există geojson valid și nici points suficiente pentru a construi ruta.');
  }

  // === SECȚIUNEA MODIFICATĂ ===
  // Construim rândul pentru inserare cu noua structură.
  const row = {
    name,
    origin_type,
    origin_id,
    destination_type,
    destination_id,
    mode,
    provider,
    geojson: fc,
    points: points ?? null,
    distance_m,
    duration_s,
    meta,
    round_trip,
    sampling,
    created_by,
  };

  const { data, error } = await supabase.from('gps_routes').insert(row).select('id').single();
  
  if (error) {
    console.error("Eroare detaliată de la Supabase:", error);
    throw new Error(error.message);
  }
  
  return data?.id;
}

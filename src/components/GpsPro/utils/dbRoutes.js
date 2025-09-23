// src/components/GpsPro/utils/dbRoutes.js
import { supabase } from '../../../supabaseClient';
import { pointsToGeoJSON, ensureFeatureCollection } from './geo';

/**
 * Salvează o rută în tabelul gps_routes.
 * Dacă `geojson` lipsește și `points` e prezent → construiește LineString.
 *
 * @param {{
 *  client_id?: number|null,
 *  origin_terminal_id?: number|null,
 *  name: string,
 *  mode: 'service'|'manual'|'recorder',
 *  provider: 'ors'|'user'|'gps',
 *  geojson?: object|string|null,
 *  points?: Array|null,
 *  distance_m?: number|null,
 *  duration_s?: number|null,
 *  round_trip?: boolean,
 *  sampling?: object|null,
 *  meta?: object|null,
 *  created_by?: string|null
 * }} payload
 */
export async function saveRouteToDb(payload) {
  const {
    client_id = null,
    origin_terminal_id = null,
    name,
    mode,
    provider,
    geojson = null,
    points = null,
    distance_m = null,
    duration_s = null,
    round_trip = false,
    sampling = null,
    meta = null,
    created_by = null,
  } = payload || {};

  if (!name) throw new Error('Lipsește numele rutei.');
  if (!mode) throw new Error('Lipsește "mode".');
  if (!provider) throw new Error('Lipsește "provider".');

  let fc = ensureFeatureCollection(geojson);

  // Dacă nu avem geojson dar avem points → construim
  if (!fc && Array.isArray(points) && points.length >= 2) {
    fc = pointsToGeoJSON(points);
  }

  if (!fc) {
    throw new Error('Nu există geojson valid și nici points suficiente pentru a construi ruta.');
  }

  const row = {
    client_id,
    origin_terminal_id,
    name,
    mode,
    provider,
    geojson: fc,         // jsonb în Postgres – putem trimite direct obiectul
    points: points ?? null,
    distance_m,
    duration_s,
    round_trip,
    sampling,
    meta,
    created_by,
  };

  const { data, error } = await supabase.from('gps_routes').insert(row).select('id').single();
  if (error) throw new Error(error.message);
  return data?.id;
}
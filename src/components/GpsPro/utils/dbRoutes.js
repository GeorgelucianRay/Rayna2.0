// src/components/GpsPro/utils/dbRoutes.js
import { supabase } from '../../../supabaseClient';
import { pointsToGeoJSON } from './geo';

/**
 * Salvează o rută completă (ex: generată de ORS sau desen).
 * payload:
 * {
 *   client_id?: number | null,
 *   origin_terminal_id?: number | null,
 *   name: string,
 *   mode: 'service' | 'manual' | 'recorded',
 *   provider: 'ors' | 'user' | 'recorder',
 *   geojson: object,           // FeatureCollection
 *   points?: array|null,       // dacă vrei și punctele brute
 *   distance_m?: number|null,
 *   duration_s?: number|null,
 *   round_trip?: boolean,
 *   sampling?: object|null,    // {mode, threshold_m}
 *   meta?: object|null,
 *   created_by?: string|null
 * }
 */
export async function saveRouteToDb(payload) {
  const clean = { ...payload };

  // serialize fields that should be JSON
  if (clean.geojson && typeof clean.geojson !== 'string') {
    clean.geojson = JSON.stringify(clean.geojson);
  }
  if (clean.points && typeof clean.points !== 'string') {
    clean.points = JSON.stringify(clean.points);
  }
  if (clean.sampling && typeof clean.sampling !== 'string') {
    clean.sampling = JSON.stringify(clean.sampling);
  }
  if (clean.meta && typeof clean.meta !== 'string') {
    clean.meta = JSON.stringify(clean.meta);
  }

  // map to your table name/columns
  const { data, error } = await supabase
    .from('gps_routes')
    .insert([clean])
    .select('id')
    .single();

  if (error) throw error;
  return data?.id;
}

/**
 * Salvează un „segment” înregistrat cu recorderul (A->B).
 * segments table ar putea exista separat; dacă nu, îl punem tot în gps_routes cu mode='recorded'
 *
 * opts = {
 *   subject?: {type,id,label}? (se salvează în meta)
 *   points: [{lat,lng,ts?}],
 *   distance_m?: number,
 *   sampling_threshold_m?: number,
 *   name?: string
 * }
 */
export async function saveRecordedSegment(opts) {
  const {
    subject = null,
    points = [],
    distance_m = null,
    sampling_threshold_m = null,
    name = `Segment înregistrat · ${new Date().toLocaleString()}`,
  } = opts || {};

  if (!Array.isArray(points) || points.length < 2) {
    throw new Error('Ai nevoie de minim două puncte pentru a salva segmentul.');
  }

  const geojson = pointsToGeoJSON(points, {
    recorded: true,
    distance_m,
    sampling_threshold_m,
  });

  const payload = {
    client_id: null,
    origin_terminal_id: null,
    name,
    mode: 'recorded',
    provider: 'recorder',
    geojson,
    points,
    distance_m,
    duration_s: null,
    round_trip: false,
    sampling: { mode: 'gps', threshold_m: sampling_threshold_m },
    meta: { subject },
    created_by: null,
  };

  return saveRouteToDb(payload);
}

/** Ultima rută pentru un client_id (sau null) */
export async function fetchLastRouteForClient(clientId) {
  const { data, error } = await supabase
    .from('gps_routes')
    .select('id,name,geojson,created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  if (!data?.length) return null;

  const row = data[0];
  let gj = row.geojson;
  try { gj = typeof gj === 'string' ? JSON.parse(gj) : gj; } catch (_) {}
  return { ...row, geojson: gj };
}
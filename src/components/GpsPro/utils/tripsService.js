// src/components/GpsPro/utils/tripsService.js
import { supabase } from '../../../supabaseClient';

/**
 * Normalizăm orice GeoJSON primit (string sau obiect).
 * Returnează null dacă nu e valid (nu are feature LineString cu min. 2 puncte).
 */
export function normalizeGeoJSON(input) {
  let gj = input;
  try {
    if (typeof input === 'string') gj = JSON.parse(input);
  } catch (_) {
    return null;
  }
  if (!gj || typeof gj !== 'object') return null;

  // Acceptăm:
  // - FeatureCollection cu primul feature de tip LineString
  // - Feature (LineString)
  // - Geometry (LineString)
  const getLine = () => {
    if (gj.type === 'FeatureCollection') return gj.features?.[0];
    if (gj.type === 'Feature') return gj;
    if (gj.type === 'LineString') return { type: 'Feature', geometry: gj, properties: {} };
    return null;
  };

  const feat = getLine();
  if (!feat?.geometry || feat.geometry.type !== 'LineString') return null;
  if (!Array.isArray(feat.geometry.coordinates) || feat.geometry.coordinates.length < 2) return null;

  // Dacă e Feature sau Geometry, înfășurăm în FeatureCollection ca să avem format unitar
  if (gj.type !== 'FeatureCollection') {
    return {
      type: 'FeatureCollection',
      features: [feat],
    };
  }
  return gj;
}

/**
 * Creează un TRIP nou (status=draft) pe care îl poți continua ulterior.
 * @param {Object} opts
 * @param {string} opts.name - denumirea turei (ex: "Tură 2025-09-23")
 * @returns {Promise<{id: string, name: string, status: string}>}
 */
export async function createTrip({ name }) {
  if (!name || !name.trim()) throw new Error('Numele trip-ului este obligatoriu.');
  const { data, error } = await supabase
    .from('gps_trips')
    .insert([{ name: name.trim(), status: 'draft' }])
    .select('id,name,status')
    .single();
  if (error) throw error;
  return data;
}

/**
 * Returnează trip-ul DRAFT cel mai recent (dacă vrei să reiei automat ultima sesiune)
 */
export async function getLatestDraftTrip() {
  const { data, error } = await supabase
    .from('gps_trips')
    .select('id,name,status,started_at,created_at')
    .eq('status', 'draft')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

/**
 * Listează trip-urile DRAFT (pentru selectorul „Reia ciornă”)
 */
export async function listDraftTrips({ limit = 20 } = {}) {
  const { data, error } = await supabase
    .from('gps_trips')
    .select('id,name,status,started_at,created_at')
    .eq('status', 'draft')
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

/**
 * Marchează un TRIP ca finalizat (+ setează finished_at)
 */
export async function finalizeTrip({ tripId }) {
  if (!tripId) throw new Error('tripId lipsă.');
  const { error } = await supabase
    .from('gps_trips')
    .update({ status: 'finalizat', finished_at: new Date().toISOString() })
    .eq('id', tripId);
  if (error) throw error;
  return true;
}

/**
 * Obține următorul order_no pentru un trip (1,2,3,…)
 */
async function getNextOrderNo(tripId) {
  const { data, error } = await supabase
    .from('gps_trip_segments')
    .select('order_no')
    .eq('trip_id', tripId)
    .order('order_no', { ascending: false })
    .limit(1);
  if (error) throw error;
  if (!data || data.length === 0) return 1;
  return (data[0].order_no || 0) + 1;
}

/**
 * Adaugă un segment A→B într-un trip.
 * @param {Object} opts
 * @param {string} opts.tripId          - ID-ul trip-ului
 * @param {string} opts.origin_type     - 'terminal' | 'cliente' | 'parking' | 'servicio'
 * @param {string} opts.origin_id       - uuid din tabelul respectiv (sau null, dacă doar coordonate)
 * @param {string} opts.dest_type
 * @param {string} opts.dest_id
 * @param {Object|string} opts.geojson  - traseu în GeoJSON (FeatureCollection/Feature/LineString sau string JSON)
 * @param {number|null} [opts.distance_m] - dacă o știi deja; altfel lasă null
 * @param {number|null} [opts.duration_s] - dacă o știi deja; altfel lasă null
 */
export async function addTripSegment({
  tripId,
  origin_type,
  origin_id,
  dest_type,
  dest_id,
  geojson,
  distance_m = null,
  duration_s = null,
}) {
  if (!tripId) throw new Error('tripId lipsă.');
  if (!origin_type || !dest_type) throw new Error('origin_type / dest_type sunt obligatorii.');
  const norm = normalizeGeoJSON(geojson);
  if (!norm) throw new Error('GeoJSON invalid pentru segment.');

  const order_no = await getNextOrderNo(tripId);

  const row = {
    trip_id: tripId,
    order_no,
    origin_type,
    origin_id: origin_id || null,
    dest_type,
    dest_id: dest_id || null,
    geojson: norm,
    distance_m,
    duration_s,
  };

  const { data, error } = await supabase
    .from('gps_trip_segments')
    .insert([row])
    .select('id,trip_id,order_no,origin_type,origin_id,dest_type,dest_id,distance_m,duration_s,created_at')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Citește segmentele unui trip (în ordine).
 */
export async function getTripSegments(tripId) {
  if (!tripId) throw new Error('tripId lipsă.');
  const { data, error } = await supabase
    .from('gps_trip_segments')
    .select('id,trip_id,order_no,origin_type,origin_id,dest_type,dest_id,distance_m,duration_s,geojson,created_at')
    .eq('trip_id', tripId)
    .order('order_no', { ascending: true });
  if (error) throw error;
  return data || [];
}

/**
 * Șterge ultimul segment (ex: undo după o oprire greșită).
 */
export async function removeLastSegment(tripId) {
  if (!tripId) throw new Error('tripId lipsă.');
  const { data, error } = await supabase
    .from('gps_trip_segments')
    .select('id,order_no')
    .eq('trip_id', tripId)
    .order('order_no', { ascending: false })
    .limit(1);
  if (error) throw error;
  if (!data || data.length === 0) return false;

  const lastId = data[0].id;
  const { error: delErr } = await supabase
    .from('gps_trip_segments')
    .delete()
    .eq('id', lastId);
  if (delErr) throw delErr;
  return true;
}

/**
 * Creează „din mers” un trip dacă nu există unul draft,
 * apoi adaugă segmentul. Returnează { trip, segment }.
 */
export async function ensureTripAndAddSegment({
  tripName = null,
  origin_type,
  origin_id,
  dest_type,
  dest_id,
  geojson,
  distance_m = null,
  duration_s = null,
}) {
  let trip = await getLatestDraftTrip();
  if (!trip) {
    trip = await createTrip({ name: tripName || `Trip ${new Date().toLocaleString()}` });
  }
  const segment = await addTripSegment({
    tripId: trip.id,
    origin_type,
    origin_id,
    dest_type,
    dest_id,
    geojson,
    distance_m,
    duration_s,
  });
  return { trip, segment };
}
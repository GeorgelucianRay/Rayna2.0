// src/components/GpsPro/utils/dbRoutes.js
import { supabase } from '../../../supabaseClient';

// mapează modurile din UI → ce permite CHECK-ul din DB
function normalizeMode(uiMode) {
  if (!uiMode) return 'service';
  const m = String(uiMode).toLowerCase();
  if (['manual', 'recorder', 'draw', 'manual-draw'].includes(m)) return 'manual';
  return 'service'; // api/ors/service etc.
}

function toIntOrNull(n) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.round(v) : null;
}

/**
 * Salvează ruta în gps_routes respectând CHECK-ul pe 'mode'
 * + curăță integer-ele.
 */
export async function saveRouteToDb(raw) {
  const payload = {
    client_id: raw.client_id ?? null,
    origin_terminal_id: raw.origin_terminal_id ?? null,
    name: raw.name ?? 'Ruta',
    mode: normalizeMode(raw.mode),             // ✅ 'manual' | 'service'
    provider: raw.provider ?? 'user',
    geojson: raw.geojson ?? null,
    points: raw.points ?? null,
    distance_m: toIntOrNull(raw.distance_m),
    duration_s: toIntOrNull(raw.duration_s),
    round_trip: !!raw.round_trip,
    sampling: raw.sampling ?? null,
    meta: raw.meta ?? null,
    created_by: raw.created_by ?? null,
  };

  // util când testezi
  console.log('[saveRouteToDb] payload:', payload);

  const { data, error } = await supabase
    .from('gps_routes')
    .insert([payload])
    .select('id');

  if (error) {
    throw new Error(`${error.message} (mode="${payload.mode}", distance_m=${payload.distance_m}, duration_s=${payload.duration_s})`);
  }
  return data?.[0]?.id ?? null;
}
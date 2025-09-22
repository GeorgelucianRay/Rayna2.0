// src/components/GpsPro/utils/dbRoutes.js
import { supabase } from '../../../supabaseClient';

// maparea “modurilor” din UI → ce acceptă CHECK-ul din DB
function normalizeMode(uiMode) {
  if (!uiMode) return 'service';
  const m = uiMode.toLowerCase();
  if (m === 'manual' || m === 'recorder' || m === 'draw' || m === 'manual-draw') {
    return 'manual';
  }
  // 'api', 'service', 'ors', etc. => considerăm serviciu
  return 'service';
}

function toIntOrNull(n) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.round(v) : null;
}

/**
 * Salvează o rută în gps_routes, garantând că `mode` trece CHECK-ul
 * și că integer-ele sunt integer.
 */
export async function saveRouteToDb(rawPayload) {
  const payload = {
    client_id: rawPayload.client_id ?? null,
    origin_terminal_id: rawPayload.origin_terminal_id ?? null,
    name: rawPayload.name ?? 'Ruta',
    mode: normalizeMode(rawPayload.mode),             // ✅ 'manual' | 'service'
    provider: rawPayload.provider ?? 'user',
    geojson: rawPayload.geojson ?? null,
    points: rawPayload.points ?? null,
    distance_m: toIntOrNull(rawPayload.distance_m),   // ✅ integer
    duration_s: toIntOrNull(rawPayload.duration_s),   // ✅ integer
    round_trip: !!rawPayload.round_trip,
    sampling: rawPayload.sampling ?? null,
    meta: rawPayload.meta ?? null,
    created_by: rawPayload.created_by ?? null,
  };

  // Debug vizibil în console
  // (poți comenta linia după ce confirmi că trece)
  // eslint-disable-next-line no-console
  console.log('[saveRouteToDb] payload:', payload);

  const { data, error } = await supabase.from('gps_routes').insert([payload]).select('id');
  if (error) {
    // arată exact ce mod a ajuns și valorile sensibile
    throw new Error(`${error.message} (mode="${payload.mode}", distance_m=${payload.distance_m}, duration_s=${payload.duration_s})`);
  }
  return data?.[0]?.id ?? null;
}
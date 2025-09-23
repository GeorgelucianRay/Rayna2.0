// src/components/GpsPro/utils/dbRoutes.js
import { supabase } from '../../../supabaseClient';

// valorile permise de constraint-ul tău: gps_routes_mode_check
export const ROUTE_MODE = {
  MANUAL: 'manual',
  SERVICE: 'service',
};

/**
 * Salvează o rută în gps_routes.
 * NOTĂ: `mode` trebuie să fie 'manual' sau 'service' (altfel dă eroare).
 */
export async function insertRoute({
  clientId,                 // number (obligatoriu!)
  originTerminalId = null,  // number | null
  name,                     // string
  mode = ROUTE_MODE.SERVICE,
  provider = 'ors',         // 'ors' | 'user' | etc (liber text)
  geojson = null,           // obiect GeoJSON sau string JSON
  points = null,            // pentru rutele desenate (array de [lat,lon])
  distance_m = null,        // number | null
  duration_s = null,        // number | null
  round_trip = false,       // boolean
  sampling = null,          // ex: { mode:'api' } sau { mode:'dibujar' }
  meta = null,              // orice metadate (origin/destination etc)
}) {
  if (clientId == null) {
    throw new Error('insertRoute: clientId este obligatoriu (nu poate fi NULL).');
  }
  if (mode !== ROUTE_MODE.MANUAL && mode !== ROUTE_MODE.SERVICE) {
    throw new Error(`insertRoute: mode invalid (${mode}). Folosește 'manual' sau 'service'.`);
  }

  const payload = {
    client_id: clientId,
    origin_terminal_id: originTerminalId,
    name,
    mode,
    provider,
    geojson,
    points,
    distance_m,
    duration_s,
    round_trip,
    sampling,
    meta,
  };

  const { error } = await supabase.from('gps_routes').insert([payload]);
  if (error) throw error;
  return true;
}

/**
 * Ultima rută salvată pentru un client (după created_at desc).
 */
export async function getLastRouteForClient(clientId) {
  const { data, error } = await supabase
    .from('gps_routes')
    .select('id,name,geojson,created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0] || null;
}
// src/components/GpsPro/utils/dbRoutes.js
import { supabase } from '../../../supabaseClient';

// Constraint-ul tău: CHECK (mode IN ('manual','service'))
export const ROUTE_MODE = {
  MANUAL: 'manual',
  SERVICE: 'service',
};

/**
 * Salvează ruta în gps_routes. Atenție:
 *  - client_id NU poate fi null (dacă tabela ta cere asta).
 *  - mode TREBUIE să fie 'manual' sau 'service'.
 */
export async function saveRouteToDb({
  clientId,                 // number (recomandat obligatoriu)
  originTerminalId = null,  // number | null
  name,
  mode = ROUTE_MODE.SERVICE,
  provider = 'ors',         // 'ors' | 'user' etc
  geojson = null,
  points = null,
  distance_m = null,
  duration_s = null,
  round_trip = false,
  sampling = null,
  meta = null,
}) {
  if (clientId == null) {
    throw new Error('saveRouteToDb: clientId este obligatoriu.');
  }
  if (mode !== ROUTE_MODE.MANUAL && mode !== ROUTE_MODE.SERVICE) {
    throw new Error(`saveRouteToDb: mode invalid (${mode}). Folosește 'manual' sau 'service'.`);
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
 * Ultima rută pentru un client.
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
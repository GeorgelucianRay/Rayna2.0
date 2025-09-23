import { supabase } from '../../../supabaseClient';

export const ROUTE_MODE = {
  MANUAL: 'manual',
  SERVICE: 'service',
};

/**
 * Acceptă atât `client_id` cât și `clientId`. Dacă ambele lipsesc, salvează cu NULL
 * (funcționează doar dacă coloana permite NULL în schema ta).
 */
export async function saveRouteToDb(args = {}) {
  const {
    client_id, clientId,           // <- acceptăm ambele
    origin_terminal_id = null,
    name,
    mode = ROUTE_MODE.SERVICE,     // 'service' pentru rute din API
    provider = 'ors',
    geojson = null,
    points = null,
    distance_m = null,
    duration_s = null,
    round_trip = false,
    sampling = null,
    meta = null,
    created_by = null,
  } = args;

  // mapăm către payload exact pe numele coloanelor din DB
  const payload = {
    client_id: client_id ?? clientId ?? null,
    origin_terminal_id,
    name,
    mode,          // <- atenție: doar 'manual' sau 'service' (constraint-ul tău)
    provider,
    geojson,
    points,
    distance_m,
    duration_s,
    round_trip,
    sampling,
    meta,
    created_by,
  };

  const { error } = await supabase.from('gps_routes').insert([payload]);
  if (error) throw error;
  return true;
}

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
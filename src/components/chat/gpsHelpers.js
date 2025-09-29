import { supabase } from "../../supabaseClient";

export function getMapsLinkFromRecord(rec) {
  if (!rec) return null;
  if (rec.link_maps) return rec.link_maps;
  if (rec.coordenadas) return `https://maps.google.com/?q=${encodeURIComponent(rec.coordenadas)}`;
  return null;
}

export function pointGeoJSONFromCoords(coordsString) {
  if (!coordsString) return null;
  const [latStr, lonStr] = String(coordsString).split(",").map(s => s.trim());
  const lat = Number(latStr), lon = Number(lonStr);
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    return {
      type: "FeatureCollection",
      features: [{ type: "Feature", geometry: { type: "Point", coordinates: [lon, lat] }, properties: {} }]
    };
  }
  return null;
}

export async function findPlaceByName(name) {
  const tables = ["gps_clientes", "gps_parkings", "gps_servicios", "gps_terminale"];
  for (const t of tables) {
    const { data, error } = await supabase
      .from(t)
      .select("id, nombre, direccion, detalles, link_maps, coordenadas")
      .ilike("nombre", `%${name}%`)
      .limit(1)
      .maybeSingle();
    if (!error && data) return { ...data, _table: t };
  }
  return null;
}

export async function findPlacesByName(name, limitPerTable = 5) {
  const tables = ["gps_clientes", "gps_parkings", "gps_servicios", "gps_terminale"];
  const all = [];
  for (const t of tables) {
    const { data } = await supabase
      .from(t)
      .select("id, nombre, direccion, detalles, link_maps, coordenadas")
      .ilike("nombre", `%${name}%`)
      .order("nombre")
      .limit(limitPerTable);
    (data || []).forEach(row => all.push({ ...row, _table: t, _mapsUrl: getMapsLinkFromRecord(row) }));
  }
  return all;
}

export async function findCameraFor(placeName) {
  const { data } = await supabase
    .from("external_links")
    .select("id,name,url,icon_type")
    .eq("icon_type", "camera")
    .ilike("name", `%${placeName}%`)
    .limit(1);
  return data?.[0] || null;
}

// —— listări generice pentru intențiile gps_list_* (fără copy-paste)
export async function loadGpsList(table) {
  const { data } = await supabase.from(table)
    .select("id,nombre,link_maps,coordenadas")
    .order("nombre")
    .limit(50);
  return (data || []).map(d => ({ ...d, _table: table, _mapsUrl: getMapsLinkFromRecord(d) }));
}
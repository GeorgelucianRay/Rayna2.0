// src/components/chat/data/queries.js
import { supabase } from "../../../supabaseClient";

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
    (data || []).forEach((row) => all.push({ ...row, _table: t }));
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

export async function openCameraByQuery(queryName) {
  let { data, error } = await supabase
    .from("external_links")
    .select("id,name,url,icon_type")
    .eq("icon_type", "camera")
    .ilike("name", `%${queryName}%`)
    .limit(1)
    .maybeSingle();

  if ((!data || error) && queryName.trim().includes(" ")) {
    let q = supabase
      .from("external_links")
      .select("id,name,url,icon_type")
      .eq("icon_type", "camera");
    queryName.split(" ").forEach((tok) => {
      q = q.ilike("name", `%${tok}%`);
    });
    const r = await q.limit(1);
    data = r.data?.[0];
    error = r.error;
  }
  return { data, error };
}

export async function updateAnnouncement(content) {
  return await supabase.from("anuncios").update({ content }).eq("id", 1);
}

export async function readAnnouncement() {
  return await supabase.from("anuncios").select("content").eq("id", 1).maybeSingle();
}

export async function listTable(table) {
  return await supabase
    .from(table)
    .select("id,nombre,link_maps,coordenadas")
    .order("nombre")
    .limit(50);
}

export async function insertCamera({ name, url }) {
  return await supabase
    .from("external_links")
    .insert({ name, url, icon_type: "camera", display_order: 9999 })
    .select()
    .single();
}


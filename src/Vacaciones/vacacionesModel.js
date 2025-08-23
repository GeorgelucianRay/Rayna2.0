// src/vacaciones/vacacionesModel.js
import { supabase } from '../supabaseClient';

/* ——— helpers ——— */
function toLocalISO(date = new Date()) {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 10);
}
function fmt(d) {
  const x = new Date(d);
  const z = new Date(x.getTime() - x.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
}
function daysBetween(a, b) {
  const A = new Date(fmt(a)), B = new Date(fmt(b));
  return Math.floor((B - A) / 86400000) + 1;
}
function overlapDaysWithinYear(ev, year) {
  const yStart = new Date(`${year}-01-01T00:00:00`);
  const yEnd   = new Date(`${year}-12-31T23:59:59`);
  const s0 = new Date(ev.start_date);
  const e0 = new Date(ev.end_date);
  const s = s0 < yStart ? yStart : s0;
  const e = e0 > yEnd   ? yEnd   : e0;
  if (e < s) return 0;
  return daysBetween(s, e);
}

/* ——— fetchers ——— */
export async function fetchYearParams(year) {
  const { data } = await supabase
    .from('vacaciones_parametros_anio')
    .select('*')
    .eq('anio', year)
    .maybeSingle();
  return {
    dias_base: data?.dias_base ?? 23,
    dias_personales: data?.dias_personales ?? 2,
    dias_pueblo: data?.dias_pueblo ?? 0,
    max_simultaneous: data?.max_simultaneous ?? 3,
  };
}

export async function fetchUserExtra(userId, year) {
  const { data } = await supabase
    .from('vacaciones_asignaciones_extra')
    .select('dias_extra')
    .eq('user_id', userId)
    .eq('anio', year)
    .maybeSingle();
  return data?.dias_extra ?? 0;
}

export async function fetchUserEventsForYear(userId, year) {
  const yearStart = `${year}-01-01`;
  const yearEnd   = `${year}-12-31`;
  const { data } = await supabase
    .from('vacaciones_eventos')
    .select('id,tipo,state,start_date,end_date,dias,notas,created_at')
    .eq('user_id', userId)
    // orice eveniment care atinge anul
    .or(`and(start_date.lte.${yearEnd},end_date.gte.${yearStart})`)
    .order('start_date', { ascending: true });
  return data || [];
}

/* ——— agregare „info” pentru widget ——— */
export async function getVacacionesInfo(userId, year) {
  const [params, extra, events] = await Promise.all([
    fetchYearParams(year),
    fetchUserExtra(userId, year),
    fetchUserEventsForYear(userId, year),
  ]);

  const total =
    (params.dias_base || 0) +
    (params.dias_personales || 0) +
    (params.dias_pueblo || 0) +
    (extra || 0);

  const usadas = (events || [])
    .filter(e => e.state === 'aprobado')
    .reduce((s, e) => s + overlapDaysWithinYear(e, year), 0);

  const pendientes = (events || [])
    .filter(e => e.state === 'pendiente' || e.state === 'conflicto')
    .reduce((s, e) => s + overlapDaysWithinYear(e, year), 0);

  const disponibles = Math.max(total - usadas - pendientes, 0);

  return { total, usadas, pendientes, disponibles, events, params };
}

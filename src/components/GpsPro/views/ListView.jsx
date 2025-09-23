// src/components/GpsPro/views/ListView.jsx
import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { useAuth } from '../../../AuthContext';
import styles from '../GpsPro.module.css';

import Toolbar from '../ui/Toolbar';
import ItemCard from '../ui/ItemCard';
import AppModal from '../ui/AppModal';

import MapPanelCore from '../map/MapPanelCore';
import RouteWizard from '../RouteWizard';
import RoutePreview from '../RoutePreview';
import DrawRouteModal from '../DrawRouteModal';

import { fetchTruckRouteORS } from '../utils/routeService';
import { saveRouteToDb } from '../utils/dbRoutes';
import reverseRouteGeoJSON from '../utils/reverseRouteGeoJSON';

const ITEMS_PER_PAGE = 24;

export default function ListView({ tableName, title }) {
  const { profile } = useAuth();
  const canEdit = profile?.role === 'dispecer';

  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [term, setTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // Recorder + ORS + Preview + Dibujar
  const [openMapFor, setOpenMapFor] = useState(null);
  const [openWizard, setOpenWizard] = useState(false);
  const [previewRoute, setPreviewRoute] = useState(null); // {title, geojson}
  const [drawingFor, setDrawingFor] = useState(null);     // subject pt. dibujar

  const typeMap = {
    gps_clientes: 'clientes',
    gps_parkings: 'parkings',
    gps_servicios: 'servicios',
    gps_terminale: 'terminale',
  };
  const currentType = typeMap[tableName];

  // ---------- data ----------
  const fetchItems = useCallback(async () => {
    setLoading(true);
    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    const cols =
      'id, created_at, nombre, direccion, link_maps, coordenadas, link_foto, detalles' +
      (tableName==='gps_clientes' ? ', tiempo_espera, dest_coords' : '');
    let q = supabase.from(tableName).select(cols, { count: 'exact' });
    if (term) q = q.ilike('nombre', `%${term}%`);
    const { data, error, count } = await q.order('created_at', { ascending: false }).range(from, to);
    if (error) { console.error(error); setItems([]); setCount(0); }
    else { setItems(data || []); setCount(count || 0); }
    setLoading(false);
  }, [page, term, tableName]);

  useEffect(()=>{ fetchItems(); }, [fetchItems]);

  const totalPages = Math.max(1, Math.ceil((count||0)/ITEMS_PER_PAGE));
  const getMapsLink = (it) => it.link_maps || (it.coordenadas ? `https://maps.google.com/?q=${it.coordenadas}` : null);

  const [newItem, setNewItem] = useState({
    nombre: '', direccion: '', link_maps: '', detalles: '', coordenadas: '', link_foto: '', tiempo_espera: ''
  });

  const onAddSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...newItem };
    if (tableName !== 'gps_clientes') delete payload.tiempo_espera;
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });
    const { error } = await supabase.from(tableName).insert([payload]);
    if (error) alert(`Error al añadir: ${error.message}`);
    else {
      setAddOpen(false);
      setNewItem({ nombre:'', direccion:'', link_maps:'', detalles:'', coordenadas:'', link_foto:'', tiempo_espera:'' });
      setTerm('');
      setPage(1);
    }
  };

  const onEditSubmit = async (e) => {
    e.preventDefault();
    const { id, ...rest } = editing;
    const payload = { ...rest };
    if (tableName !== 'gps_clientes') delete payload.tiempo_espera;
    const { error } = await supabase.from(tableName).update(payload).eq('id', id);
    if (error) alert(`Error al actualizar: ${error.message}`);
    else { setEditOpen(false); setEditing(null); fetchItems(); }
  };

  // găsește ultima rută salvată pentru client_id
  async function findLastRouteForSubject(subjectId) {
    const { data, error } = await supabase
      .from('gps_routes')
      .select('id,name,geojson')
      .eq('client_id', subjectId)
      .order('created_at', { ascending: false })
      .limit(1);
    if (error || !data?.length) return null;
    return data[0];
  }

  // ---------- render ----------
  return (
    <div className={styles.view}>
      <Toolbar
        canEdit={canEdit}
        searchTerm={term}
        onSearch={(v)=>{ setTerm(v); setPage(1); }}
        onAdd={()=> setAddOpen(true)}
        onPlan={()=> setOpenWizard(true)}
        title={title}
      />

      {loading ? (
        <div className={styles.loading}>Cargando…</div>
      ) : (
        <>
          <div className={styles.grid}>
            {items.map(it => (
              <ItemCard
                key={it.id}
                item={it}
                canEdit={canEdit}
                onClick={()=> setSelected(it)}
                onEdit={(i)=>{ setEditing(i); setEditOpen(true); }}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button className={styles.pageBtn} onClick={()=> setPage(p=>Math.max(1, p-1))} disabled={page===1}>Anterior</button>
              <span className={styles.pageInfo}>Página {page} de {totalPages}</span>
              <button className={styles.pageBtn} onClick={()=> setPage(p=>Math.min(totalPages, p+1))} disabled={page===totalPages}>Siguiente</button>
            </div>
          )}
        </>
      )}

      {/* Detalle */}
      {selected && (
        <AppModal
          title={selected.nombre}
          onClose={()=> setSelected(null)}
          footer={
            <>
              {/* 1) Cere rută via API (ORS) */}
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => setOpenWizard(true)}
              >
                Cere rută (API)
              </button>

              {/* 2) Recorder (GPS) */}
              <button
                className={styles.btn}
                onClick={() => {
                  setOpenMapFor({
                    ...selected,
                    _subject: { type: currentType, id: selected.id, label: selected.nombre, coords: selected.coordenadas }
                  });
                }}
              >
                Recorder (GPS)
              </button>

              {/* 3) Dibujar manual */}
              <button
                className={styles.btn}
                onClick={() => setDrawingFor({
                  type: currentType, id: selected.id, label: selected.nombre, coords: selected.coordenadas
                })}
              >
                Dibujar
              </button>

              {/* 4) Cómo llegar (preferă ruta salvată) */}
              <button
                className={styles.btn}
                onClick={async () => {
                  try {
                    const saved = await findLastRouteForSubject(selected.id);
                    if (!saved) {
                      const link = getMapsLink(selected);
                      if (link) window.open(link, '_blank', 'noopener');
                      else alert('Nu există rută salvată și nici link Maps.');
                      return;
                    }

                    const raw = saved.geojson;
                    const gj = typeof raw === 'string' ? JSON.parse(raw) : raw;

                    const feat = gj?.features?.[0];
                    const ok =
                      feat?.geometry?.type === 'LineString' &&
                      Array.isArray(feat?.geometry?.coordinates) &&
                      feat.geometry.coordinates.length >= 2;

                    if (!ok) {
                      console.warn('GeoJSON invalid sau gol:', gj);
                      const link = getMapsLink(selected);
                      if (link) window.open(link, '_blank', 'noopener');
                      else alert('Ruta salvată e invalidă și nu există link Maps.');
                      return;
                    }

                    setPreviewRoute({ title: saved.name || 'Ruta', geojson: gj });
                  } catch (err) {
                    console.error(err);
                    alert(`Eroare la încărcarea rutei salvate: ${err.message || err}`);
                    const link = getMapsLink(selected);
                    if (link) window.open(link, '_blank', 'noopener');
                  }
                }}
              >
                Cómo llegar
              </button>

              <button className={styles.btn} onClick={()=> setSelected(null)}>Cerrar</button>
            </>
          }
        >
          <div className={styles.detail}>
            <img
              className={styles.detailImg}
              src={selected.link_foto || 'https://placehold.co/1000x700/0b1f3a/99e6ff?text=Sin+Foto'}
              alt={selected.nombre}
              onError={(e)=>{ e.currentTarget.src = 'https://placehold.co/1000x700/0b1f3a/99e6ff?text=Error'; }}
            />
            <div className={styles.detailInfo}>
              {selected.direccion && <p><strong>Dirección:</strong> {selected.direccion}</p>}
              {selected.tiempo_espera && tableName==='gps_clientes' && <p><strong>Tiempo de Espera:</strong> {selected.tiempo_espera}</p>}
              {selected.detalles && <p><strong>Detalles:</strong> {selected.detalles}</p>}
              {selected.coordenadas && <p><strong>Coordenadas:</strong> {selected.coordenadas}</p>}
            </div>
          </div>
        </AppModal>
      )}

      {/* Añadir */}
      {addOpen && (
        <AppModal title={`Añadir ${title}`} onClose={()=> setAddOpen(false)} footer={null}>
          <form className={styles.form} onSubmit={onAddSubmit}>
            <label>Nombre<input value={newItem.nombre} onChange={(e)=> setNewItem({...newItem, nombre:e.target.value})} required/></label>
            <label>Dirección<input value={newItem.direccion || ''} onChange={(e)=> setNewItem({...newItem, direccion:e.target.value})} /></label>
            <label>Link Google Maps<input value={newItem.link_maps || ''} onChange={(e)=> setNewItem({...newItem, link_maps:e.target.value})} /></label>
            <label>Coordenadas<input placeholder="Ej: 41.15, 1.10" value={newItem.coordenadas || ''} onChange={(e)=> setNewItem({...newItem, coordenadas:e.target.value})} /></label>
            {tableName==='gps_clientes' && (
              <label>Tiempo de Espera<input value={newItem.tiempo_espera || ''} onChange={(e)=> setNewItem({...newItem, tiempo_espera:e.target.value})} /></label>
            )}
            <label>Link Foto<input value={newItem.link_foto || ''} onChange={(e)=> setNewItem({...newItem, link_foto:e.target.value})} /></label>
            <label>Detalles<textarea rows={4} value={newItem.detalles || ''} onChange={(e)=> setNewItem({...newItem, detalles:e.target.value})} /></label>
            <div className={styles.formActions}>
              <button type="button" className={styles.btn} onClick={()=> setAddOpen(false)}>Cancelar</button>
              <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>Guardar</button>
            </div>
          </form>
        </AppModal>
      )}

      {/* Editar */}
      {editOpen && editing && (
        <AppModal title={`Editar ${editing.nombre}`} onClose={()=>{ setEditOpen(false); setEditing(null); }} footer={null}>
          <form className={styles.form} onSubmit={onEditSubmit}>
            <label>Nombre<input value={editing.nombre || ''} onChange={(e)=> setEditing({...editing, nombre:e.target.value})} required/></label>
            <label>Dirección<input value={editing.direccion || ''} onChange={(e)=> setEditing({...editing, direccion:e.target.value})} /></label>
            <label>Link Google Maps<input value={editing.link_maps || ''} onChange={(e)=> setEditing({...editing, link_maps:e.target.value})} /></label>
            <label>Coordenadas<input value={editing.coordenadas || ''} onChange={(e)=> setEditing({...editing, coordenadas:e.target.value})} placeholder="Ej: 41.15, 1.10"/></label>
            {tableName==='gps_clientes' && (
              <label>Tiempo de Espera<input value={editing.tiempo_espera || ''} onChange={(e)=> setEditing({...editing, tiempo_espera:e.target.value})} /></label>
            )}
            <label>Link Foto<input value={editing.link_foto || ''} onChange={(e)=> setEditing({...editing, link_foto:e.target.value})} /></label>
            <label>Detalles<textarea rows={4} value={editing.detalles || ''} onChange={(e)=> setEditing({...editing, detalles:e.target.value})} /></label>
            <div className={styles.formActions}>
              <button type="button" className={styles.btn} onClick={()=> { setEditOpen(false); setEditing(null); }}>Cancelar</button>
              <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>Guardar Cambios</button>
            </div>
          </form>
        </AppModal>
      )}

      {/* RouteWizard (Alege ORIGINE/DESTINO) */}
      {openWizard && (
        <RouteWizard
          onClose={()=> setOpenWizard(false)}
          onDone={async (origin, destination) => {
            try {
              const apiKey = import.meta.env.VITE_ORS_KEY;
              if (!apiKey) {
                alert('Lipsește VITE_ORS_KEY în Vercel → Project → Settings → Environment Variables');
                return;
              }

              // 1) Ruta A→B de la ORS
              const { geojson, distance_m, duration_s } =
                await fetchTruckRouteORS({ origin, destination, apiKey });

              const now = new Date().toLocaleString();
              const baseName = `${origin.label} → ${destination.label}`;
              const nameAB = `Ruta ${baseName} · ${now}`;

              // Doar în „clientes” legăm FK-ul client_id
              const clientId = (currentType === 'clientes' ? (selected?.id ?? null) : null);

              // 2) Salvăm A→B
              await saveRouteToDb({
                client_id: clientId,
                origin_terminal_id: null,
                name: nameAB,
                mode: 'service',
                provider: 'ors',
                geojson,
                points: null,
                distance_m,
                duration_s,
                round_trip: false,
                sampling: { mode: 'api', threshold_m: null },
                meta: { origin, destination, direction: 'A→B' },
                created_by: null,
              });

              // 3) (opțional) Salvăm și B→A
              const nameBA = `Ruta ${destination.label} → ${origin.label} · ${now}`;
              const geojsonBA = reverseRouteGeoJSON(geojson);

              await saveRouteToDb({
                client_id: clientId,
                origin_terminal_id: null,
                name: nameBA,
                mode: 'service',
                provider: 'ors',
                geojson: geojsonBA,
                points: null,
                distance_m,
                duration_s,
                round_trip: false,
                sampling: { mode: 'api', threshold_m: null },
                meta: { origin: destination, destination: origin, direction: 'B→A' },
                created_by: null,
              });

              // 4) Preview pe hartă pentru A→B
              setPreviewRoute({ title: nameAB, geojson });
              setOpenWizard(false);
            } catch (e) {
              console.error(e);
              alert(`Eroare rută (API): ${e.message || e}`);
            }
          }}
        />
      )}

      {/* Preview rută salvată */}
      {previewRoute && (
        <RoutePreview
          title={previewRoute.title}
          geojson={previewRoute.geojson}
          onClose={()=> setPreviewRoute(null)}
        />
      )}

      {/* Dibujar manual */}
      {drawingFor && (
        <DrawRouteModal
          subject={drawingFor}
          onClose={()=> setDrawingFor(null)}
          onSave={async ({ geojson, points, distance_m }) => {
            try {
              const name = `Ruta (dibujar) · ${selected?.nombre || drawingFor?.label || ''} · ${new Date().toLocaleString()}`;

              await saveRouteToDb({
                client_id: selected?.id ?? null,
                origin_terminal_id: null,
                name,
                mode: 'manual',
                provider: 'user',
                geojson,
                points,
                distance_m,
                duration_s: null,
                round_trip: false,
                sampling: { mode: 'dibujar', threshold_m: null },
                meta: { subject: drawingFor },
                created_by: null,
              });

              setDrawingFor(null);
              setPreviewRoute({ title: name, geojson });
            } catch (e) {
              console.error(e);
              alert(`Eroare salvare rută: ${e.message || e}`);
            }
          }}
        />
      )}

      {/* Map overlay – recorder */}
      {openMapFor && (
        <MapPanelCore
          client={openMapFor}
          destination={openMapFor._pickedDestination}
          autoStart={openMapFor._autoStart === true}
          onClose={() => setOpenMapFor(null)}
        />
      )}
    </div>
  );
}
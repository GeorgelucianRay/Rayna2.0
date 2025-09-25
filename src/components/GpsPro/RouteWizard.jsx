// src/components/GpsPro/views/ListView.jsx

import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../AuthContext';
import styles from '../GpsPro.module.css';

import Toolbar from '../ui/Toolbar';
import ItemCard from '../ui/ItemCard';
import AppModal from '../ui/AppModal';
import RouteWizard from '../RouteWizard';
import DrawRouteModal from '../DrawRouteModal';
import RoutePreview from '../RoutePreview.jsx'; // Calea corectată
import { saveRouteToDb } from '../utils/dbRoutes';

const ITEMS_PER_PAGE = 24;

// Funcția modernă pentru a găsi rute, plasată direct aici pentru simplitate
async function findSavedRouteForLocation(locationType, locationId) {
  const { data, error } = await supabase
    .from('gps_routes')
    .select('id, name, geojson')
    .or(
      `and(origin_type.eq.${locationType}, origin_id.eq.${locationId}), and(destination_type.eq.${locationType}, destination_id.eq.${locationId})`
    )
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Eroare la căutarea rutei:', error);
    return null;
  }
  return data?.[0] || null;
}

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

  const [openWizard, setOpenWizard] = useState(false);
  const [isDrawModalOpen, setDrawModalOpen] = useState(false);
  const [previewRoute, setPreviewRoute] = useState(null);

  const typeMap = {
    gps_clientes: 'clientes',
    gps_parkings: 'parkings',
    gps_servicios: 'servicios',
    gps_terminale: 'terminale',
  };
  const currentType = typeMap[tableName];

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    const cols = 'id, created_at, nombre, direccion, link_maps, coordenadas, link_foto, detalles' + (tableName === 'gps_clientes' ? ', tiempo_espera' : '');
    let q = supabase.from(tableName).select(cols, { count: 'exact' });
    if (term) q = q.ilike('nombre', `%${term}%`);
    const { data, error, count: totalCount } = await q.order('created_at', { ascending: false }).range(from, to);
    if (error) { console.error(error); setItems([]); setCount(0); }
    else { setItems(data || []); setCount(totalCount || 0); }
    setLoading(false);
  }, [page, term, tableName]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const totalPages = Math.max(1, Math.ceil((count || 0) / ITEMS_PER_PAGE));
  const getMapsLink = (it) => it.link_maps || (it.coordenadas ? `https://www.google.com/maps/search/?api=1&query=${it.coordenadas}` : null);

  // Funcțiile pentru adăugare/editare locații (neschimbate)
  const [newItem, setNewItem] = useState({ nombre: '', direccion: '', link_maps: '', detalles: '', coordenadas: '', link_foto: '', tiempo_espera: '' });
  const onAddSubmit = async (e) => { e.preventDefault(); const p = { ...newItem }; Object.keys(p).forEach(k => { if (p[k] === '') p[k] = null; }); const { error } = await supabase.from(tableName).insert([p]); if (error) alert(error.message); else { setAddOpen(false); setNewItem({ nombre:'', direccion:'', link_maps:'', detalles:'', coordenadas:'', link_foto:'', tiempo_espera:'' }); setTerm(''); setPage(1); fetchItems(); } };
  const onEditSubmit = async (e) => { e.preventDefault(); const { id, ...rest } = editing; const { error } = await supabase.from(tableName).update(rest).eq('id', id); if (error) alert(error.message); else { setEditOpen(false); setEditing(null); fetchItems(); } };

  return (
    <div className={styles.view}>
      <Toolbar
        canEdit={canEdit}
        searchTerm={term}
        onSearch={(v) => { setTerm(v); setPage(1); }}
        onAdd={() => setAddOpen(true)}
        title={title}
      />

      {loading ? ( <div className={styles.loading}>Se încarcă…</div> ) : (
        <>
          <div className={styles.grid}>
            {items.map(it => (
              <ItemCard key={it.id} item={it} canEdit={canEdit} onClick={() => setSelected(it)} onEdit={(i) => { setEditing(i); setEditOpen(true); }} />
            ))}
          </div>
          {totalPages > 1 && ( <div className={styles.pagination}><button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Anterior</button><span>Página {page} din {totalPages}</span><button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Următor</button></div> )}
        </>
      )}

      {selected && (
        <AppModal
          title={selected.nombre}
          onClose={() => setSelected(null)}
          footer={
            <>
              <button className={styles.btn} onClick={() => { setOpenWizard(true); setSelected(null); }}>Cere Traseu (API)</button>
              <button className={styles.btn} onClick={() => { setDrawModalOpen(true); setSelected(null); }}>Desenează Traseu</button>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={async () => {
                  try {
                    const saved = await findSavedRouteForLocation(currentType, selected.id);
                    if (!saved?.geojson) {
                      const link = getMapsLink(selected);
                      if (link) return window.open(link, '_blank', 'noopener');
                      return alert('Nu există rută salvată și nici link Google Maps.');
                    }
                    setPreviewRoute({ title: saved.name || 'Previzualizare Rută', geojson: saved.geojson });
                    setSelected(null);
                  } catch (err) {
                    console.error(err);
                    alert(`Eroare la încărcarea rutei: ${err.message}`);
                  }
                }}
              >
                Navigare
              </button>
              <button className={styles.btn} onClick={() => setSelected(null)}>Închide</button>
            </>
          }
        >
          <div className={styles.detail}>
            <img className={styles.detailImg} src={selected.link_foto || 'https://placehold.co/1000x700/0b1f3a/99e6ff?text=Sin+Foto'} alt={selected.nombre} />
            <div className={styles.detailInfo}>
              {selected.direccion && <p><strong>Adresă:</strong> {selected.direccion}</p>}
              {selected.detalii && <p><strong>Detalii:</strong> {selected.detalii}</p>}
            </div>
          </div>
        </AppModal>
      )}

      {addOpen && ( <AppModal title={`Adaugă ${title}`} onClose={() => setAddOpen(false)}><form className={styles.form} onSubmit={onAddSubmit}>{/* ... form adaugare ... */}</form></AppModal> )}
      {editOpen && editing && ( <AppModal title={`Editează ${editing.nombre}`} onClose={() => { setEditOpen(false); setEditing(null); }}><form className={styles.form} onSubmit={onEditSubmit}>{/* ... form editare ... */}</form></AppModal> )}
      
      {openWizard && ( <RouteWizard onClose={() => setOpenWizard(false)} /> )}

      {isDrawModalOpen && (
        <DrawRouteModal
          onClose={() => setDrawModalOpen(false)}
          onSave={async (routePayload) => {
            try {
              await saveRouteToDb(routePayload);
              alert('Traseul desenat a fost salvat!');
              setDrawModalOpen(false);
              setPreviewRoute({ title: routePayload.name, geojson: routePayload.geojson });
            } catch (e) {
              console.error(e);
              alert(`Eroare salvare rută: ${e.message || e}`);
            }
          }}
        />
      )}

      {previewRoute && (
        <RoutePreview
          title={previewRoute.title}
          geojson={previewRoute.geojson}
          onClose={() => setPreviewRoute(null)}
        />
      )}
    </div>
  );
}

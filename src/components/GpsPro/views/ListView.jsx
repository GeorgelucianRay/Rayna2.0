import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { useAuth } from '../../../AuthContext';
import styles from '../GpsPro.module.css';

import Toolbar from '../ui/Toolbar';
import ItemCard from '../ui/ItemCard';
import AppModal from '../ui/AppModal';
import RouteWizard from '../RouteWizard';
import DrawRouteModal from '../DrawRouteModal';
import RoutePreview from '../RoutePreview.jsx';
import MapPanelCore from '../map/MapPanelCore';
import { saveRouteToDb } from '../utils/dbRoutes';

/**
 * Number of records to display per page in the list view.  
 * Keeping this as a constant makes it easy to tweak pagination
 * behaviour throughout the component.
 */
const ITEMS_PER_PAGE = 24;

/**
 * Fetches all routes that originate from or terminate at a given location.
 *
 * @param {string} locationType - one of `clientes`, `parkings`, `servicios` or `terminale`.
 * @param {number|string} locationId - the primary key of the location.
 * @returns {Promise<Array<{id: number, name: string|null, geojson: any, created_at: string}>>}
 */
async function findAllRoutesForLocation(locationType, locationId) {
  const { data, error } = await supabase
    .from('gps_routes')
    .select('id, name, geojson, created_at')
    .or(
      `and(origin_type.eq.${locationType}, origin_id.eq.${locationId}), and(destination_type.eq.${locationType}, destination_id.eq.${locationId})`
    )
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Eroare la căutarea rutelor:', error);
    return [];
  }
  return data || [];
}

/**
 * ListView component renders a paginated grid of GPS entities (clients, parkings, services or terminals)
 * and provides a number of actions such as adding/editing items, drawing routes, requesting routes
 * via an API, recording a new segment, and previewing saved routes.
 */
export default function ListView({ tableName, title }) {
  const { profile } = useAuth();
  const canEdit = profile?.role === 'dispecer';

  // Data state
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [term, setTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // UI state
  const [selected, setSelected] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // Modal state
  const [openWizard, setOpenWizard] = useState(false);
  const [isDrawModalOpen, setDrawModalOpen] = useState(false);
  const [previewRoute, setPreviewRoute] = useState(null);
  const [routeChoices, setRouteChoices] = useState([]);
  const [openMapFor, setOpenMapFor] = useState(null);

  /**
   * Maps database table names to semantic types used by routes.
   */
  const typeMap = {
    gps_clientes: 'clientes',
    gps_parkings: 'parkings',
    gps_servicios: 'servicios',
    gps_terminale: 'terminale',
  };
  const currentType = typeMap[tableName];

  /**
   * Fetch list items from Supabase with pagination and optional search term.
   */
  const fetchItems = useCallback(async () => {
    setLoading(true);
    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    const cols =
      'id, created_at, nombre, direccion, link_maps, coordenadas, link_foto, detalles' +
      (tableName === 'gps_clientes' ? ', tiempo_espera' : '');
    let q = supabase.from(tableName).select(cols, { count: 'exact' });
    if (term) {
      q = q.ilike('nombre', `%${term}%`);
    }
    const { data, error, count: totalCount } = await q
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) {
      console.error(error);
      setItems([]);
      setCount(0);
    } else {
      setItems(data || []);
      setCount(totalCount || 0);
    }
    setLoading(false);
  }, [page, term, tableName]);

  // Re-fetch items whenever pagination or search term changes
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const totalPages = Math.max(1, Math.ceil((count || 0) / ITEMS_PER_PAGE));

  /**
   * Derives a Google Maps link from a record.
   * Falls back to the coordinates if a link is not provided.
   */
  const getMapsLink = (it) =>
    it.link_maps || (it.coordenadas ? `http://maps.google.com/?q=${it.coordenadas}` : null);

  // Form state for adding a new item
  const [newItem, setNewItem] = useState({
    nombre: '',
    direccion: '',
    link_maps: '',
    detalles: '',
    coordenadas: '',
    link_foto: '',
    tiempo_espera: '',
  });

  /**
   * Handler for submitting a new record to Supabase.
   */
  const onAddSubmit = async (e) => {
    e.preventDefault();
    const p = { ...newItem };
    // Convert empty strings to null to satisfy Supabase constraints
    Object.keys(p).forEach((k) => {
      if (p[k] === '') p[k] = null;
    });
    const { error } = await supabase.from(tableName).insert([p]);
    if (error) alert(error.message);
    else {
      setAddOpen(false);
      setNewItem({
        nombre: '',
        direccion: '',
        link_maps: '',
        detalles: '',
        coordenadas: '',
        link_foto: '',
        tiempo_espera: '',
      });
      setTerm('');
      setPage(1);
      fetchItems();
    }
  };

  /**
   * Handler for submitting an edited record to Supabase.
   */
  const onEditSubmit = async (e) => {
    e.preventDefault();
    const { id, ...rest } = editing;
    const { error } = await supabase.from(tableName).update(rest).eq('id', id);
    if (error) alert(error.message);
    else {
      setEditOpen(false);
      setEditing(null);
      fetchItems();
    }
  };

  return (
    <div className={styles.view}>
      <Toolbar
        canEdit={canEdit}
        searchTerm={term}
        onSearch={(v) => {
          setTerm(v);
          setPage(1);
        }}
        onAdd={() => setAddOpen(true)}
        title={title}
      />

      {loading ? (
        <div className={styles.loading}>Se încarcă…</div>
      ) : (
        <>
          <div className={styles.grid}>
            {items.map((it) => (
              <ItemCard
                key={it.id}
                item={it}
                canEdit={canEdit}
                onClick={() => setSelected(it)}
                onEdit={(i) => {
                  setEditing(i);
                  setEditOpen(true);
                }}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Anterior
              </button>
              <span>
                Pagină {page} din {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Următor
              </button>
            </div>
          )}
        </>
      )}

      {/* Details modal for a selected item */}
      {selected && (
        <AppModal
          title={selected.nombre}
          onClose={() => setSelected(null)}
          footer={
            <>
              <button
                className={styles.btn}
                onClick={() => {
                  setOpenWizard(true);
                  setSelected(null);
                }}
              >
                Cere Traseu (API)
              </button>
              <button
                className={styles.btn}
                onClick={() => {
                  setDrawModalOpen(true);
                  setSelected(null);
                }}
              >
                Desenează Traseu
              </button>
              <button
                className={styles.btn}
                onClick={() => {
                  setOpenMapFor(selected);
                  setSelected(null);
                }}
              >
                Recorder (GPS)
              </button>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={async () => {
                  try {
                    const routes = await findAllRoutesForLocation(currentType, selected.id);
                    if (routes.length === 0) {
                      const link = getMapsLink(selected);
                      if (link) return window.open(link, '_blank', 'noopener');
                      return alert('Nu există rută salvată pentru această locație.');
                    }
                    if (routes.length === 1) {
                      setPreviewRoute({ title: routes[0].name, geojson: routes[0].geojson });
                      setSelected(null);
                      return;
                    }
                    setRouteChoices(routes);
                    setSelected(null);
                  } catch (err) {
                    console.error(err);
                    alert(`Eroare la încărcarea rutei: ${err.message}`);
                  }
                }}
              >
                Navigare
              </button>
              <button className={styles.btn} onClick={() => setSelected(null)}>
                Închide
              </button>
            </>
          }
        >
          <div className={styles.detail}>
            <img
              className={styles.detailImg}
              src={
                selected.link_foto ||
                'https://placehold.co/1000x700/0b1f3a/99e6ff?text=Sin+Foto'
              }
              alt={selected.nombre}
              onError={(e) => {
                e.currentTarget.src =
                  'https://placehold.co/1000x700/0b1f3a/99e6ff?text=Error';
              }}
            />
            <div className={styles.detailInfo}>
              {selected.direccion && (
                <p>
                  <strong>Adresă:</strong> {selected.direccion}
                </p>
              )}
              {selected.detalii && (
                <p>
                  <strong>Detalii:</strong> {selected.detalii}
                </p>
              )}
            </div>
          </div>
        </AppModal>
      )}

      {/* Modal for adding a new item */}
      {addOpen && (
        <AppModal
          title={`Adaugă ${title}`}
          onClose={() => setAddOpen(false)}
        >
          <form className={styles.form} onSubmit={onAddSubmit}>
            {/* Form fields would go here. They are omitted for brevity. */}
          </form>
        </AppModal>
      )}

      {/* Modal for editing an existing item */}
      {editOpen && editing && (
        <AppModal
          title={`Editează ${editing.nombre}`}
          onClose={() => {
            setEditOpen(false);
            setEditing(null);
          }}
        >
          <form className={styles.form} onSubmit={onEditSubmit}>
            {/* Form fields would go here. They are omitted for brevity. */}
          </form>
        </AppModal>
      )}

      {/* Route wizard for automatically generating a route */}
      {openWizard && <RouteWizard onClose={() => setOpenWizard(false)} />}

      {/* Modal for drawing a custom route on the map */}
      {isDrawModalOpen && (
        <DrawRouteModal
          onClose={() => setDrawModalOpen(false)}
          onSave={async (routePayload) => {
            try {
              await saveRouteToDb(routePayload);
              alert('Traseul desenat a fost salvat!');
              setDrawModalOpen(false);
              setPreviewRoute({
                title: routePayload.name,
                geojson: routePayload.geojson,
              });
            } catch (e) {
              console.error(e);
              alert(`Eroare salvare rută: ${e.message || e}`);
            }
          }}
        />
      )}

      {/* Modal to choose between multiple saved routes */}
      {routeChoices.length > 0 && (
        <AppModal
          title="Alege un traseu"
          onClose={() => setRouteChoices([])}
          footer={
            <button className={styles.btn} onClick={() => setRouteChoices([])}>
              Anulează
            </button>
          }
        >
          <div className={styles.routeChoicesList}>
            {routeChoices.map((route, index) => (
              <button
                key={route.id}
                className={styles.routeChoiceItem}
                onClick={() => {
                  setPreviewRoute({
                    title: route.name || `Ruta ${index + 1}`,
                    geojson: route.geojson,
                  });
                  setRouteChoices([]);
                }}
              >
                {route.name ||
                  `Ruta ${index + 1} (salvată pe ${new Date(
                    route.created_at
                  ).toLocaleDateString()})`}
              </button>
            ))}
          </div>
        </AppModal>
      )}

      {/* Route preview component for displaying a saved route */}
      {previewRoute && (
        <RoutePreview
          title={previewRoute.title}
          geojson={previewRoute.geojson}
          onClose={() => setPreviewRoute(null)}
        />
      )}

      {/* Map panel for recording a new GPS segment */}
      {openMapFor && (
        <MapPanelCore
          subject={openMapFor}
          onClose={() => setOpenMapFor(null)}
          onSaveSegment={async (segmentData) => {
            console.log('Segmentul înregistrat:', segmentData);
            alert('Funcționalitatea de salvare pentru Recorder va fi implementată.');
            setOpenMapFor(null);
          }}
        />
      )}
    </div>
  );
}
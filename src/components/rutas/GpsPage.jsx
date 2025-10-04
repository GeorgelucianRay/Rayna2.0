// src/components/rutas/GpsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../AuthContext';
import Layout from '../Layout';
import styles from './gps.module.css';

// Dacă muți NavOverlay aici, schimbă importul în './NavOverlay'
import NavOverlay from '../GpsPro/NavOverlay';

// === Subida la imgbb (usa VITE_IMGBB_API_KEY) ===
const IMGBB_KEY = import.meta.env.VITE_IMGBB_API_KEY;

/* ------------------------- Utils ------------------------- */

function normalizeGeoJSON(input) {
  if (!input) return null;
  let obj = input;
  if (typeof input === 'string') {
    try { obj = JSON.parse(input); } catch { return null; }
  }
  if (obj?.type === 'FeatureCollection' && Array.isArray(obj.features)) return obj;
  if (obj?.type === 'Feature' && obj.geometry) {
    return { type: 'FeatureCollection', features: [obj] };
  }
  if (obj?.type && obj.coordinates) {
    return { type: 'FeatureCollection', features: [{ type:'Feature', geometry: obj, properties:{} }] };
  }
  return null;
}

// caută rute salvate unde locația e origine SAU destinație
async function findSavedRouteForLocation(locationType, locationId) {
  const { data, error } = await supabase
    .from('gps_routes')
    .select('id, name, geojson')
    .or(
      `and(origin_type.eq.${locationType},origin_id.eq.${locationId}),and(destination_type.eq.${locationType},destination_id.eq.${locationId})`
    )
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('findSavedRouteForLocation:', error);
    return null;
  }
  if (!data?.length) return null;
  return data[0];
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.onload = () => {
      const res = String(reader.result || '');
      const base64 = res.includes('base64,') ? res.split('base64,')[1] : res;
      resolve(base64);
    };
    reader.readAsDataURL(file);
  });
}

async function uploadToImgbb(file) {
  if (!IMGBB_KEY) throw new Error('Falta VITE_IMGBB_API_KEY.');
  if (!file) throw new Error('No se ha seleccionado ningún archivo.');

  const base64 = await fileToBase64(file);
  const form = new FormData();
  form.append('key', IMGBB_KEY);
  form.append('image', base64);

  const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form });
  const json = await res.json().catch(() => ({}));

  if (!res.ok || !json?.success) {
    const msg = json?.error?.message || 'La subida a imgbb ha fallado.';
    throw new Error(msg);
  }
  return json?.data?.display_url || json?.data?.image?.url || json?.data?.url;
}

/* -------------------------- Icone ---------------------------- */
const SearchIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
  </svg>
);
const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" />
  </svg>
);
const GpsFixedIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="3" /><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="22" y1="12" x2="18" y2="12" /><line x1="6" y1="12" x2="2" y2="12" />
  </svg>
);
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </svg>
);

const ITEMS_PER_PAGE = 25;

/* ----------------------- Lista locații ------------------------- */
const LocationList = ({ tableName, title }) => {
  const { profile, session, sessionReady } = useAuth();

  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState(null);

  // overlay navigație „harta noastră”
  const [navData, setNavData] = useState(null); // { title, geojson }

  // form state / upload
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [uploadingAdd, setUploadingAdd] = useState(false);
  const [uploadingEdit, setUploadingEdit] = useState(false);

  const addFormStorageKey = `addForm-${tableName}`;
  const editFormStorageKey = `editForm-${tableName}`;

  const [newLocation, setNewLocation] = useState({
    nombre:'', direccion:'', link_maps:'', tiempo_espera:'', detalles:'', coordenadas:'', link_foto:''
  });

  const updateNewLocationState = (newState) => {
    setNewLocation(newState);
    try { localStorage.setItem(addFormStorageKey, JSON.stringify(newState)); } catch {}
  };
  const updateEditingLocationState = (newState) => {
    setEditingLocation(newState);
    try { localStorage.setItem(editFormStorageKey, JSON.stringify(newState)); } catch {}
  };

  const fetchLocations = useCallback(
    async (page, term) => {
      setLoading(true);
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const selectColumns =
        'id, created_at, nombre, direccion, link_maps, coordenadas, link_foto, detalles' +
        (tableName === 'gps_clientes' ? ', tiempo_espera' : '');

      let query = supabase.from(tableName).select(selectColumns, { count: 'exact' });
      if (term) query = query.ilike('nombre', `%${term}%`);

      const { data, error, count } = await query.order('created_at', { ascending:false }).range(from, to);

      if (error) {
        alert(`Error al cargar ${title.toLowerCase()}s: ${error.message}`);
        setLocations([]); setTotalCount(0);
      } else {
        setLocations(data || []); setTotalCount(count || 0);
      }
      setLoading(false);
    },
    [tableName, title]
  );

  // restore formulare din localStorage
  useEffect(() => {
    try {
      const savedAddForm = localStorage.getItem(addFormStorageKey);
      if (savedAddForm) { setNewLocation(JSON.parse(savedAddForm)); setIsAddModalOpen(true); }
      const savedEditForm = localStorage.getItem(editFormStorageKey);
      if (savedEditForm) { setEditingLocation(JSON.parse(savedEditForm)); setIsEditModalOpen(true); }
    } catch {}
  }, [addFormStorageKey, editFormStorageKey]);

  // fetch DB când sesiunea e gata
  useEffect(() => {
    if (!sessionReady) return;
    if (!session) return;
    fetchLocations(currentPage, searchTerm);
  }, [sessionReady, session, currentPage, searchTerm, fetchLocations]);

  const totalPages = Math.ceil((totalCount || 0) / ITEMS_PER_PAGE);

  const handleSearchChange = (e) => { setSearchTerm(e.target.value); setCurrentPage(1); };

  const handleGetLocation = (setter, stateUpdater) => {
    if (!navigator.geolocation) { alert('La geolocalización no es compatible con este navegador.'); return; }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords:{ latitude, longitude } }) => {
        const coordsString = `${latitude},${longitude}`;
        setter(prev => { const ns = { ...prev, coordenadas: coordsString }; stateUpdater(ns); return ns; });
        setGettingLocation(false);
      },
      (error) => { alert(`Error al obtener la ubicación: ${error.message}`); setGettingLocation(false); }
    );
  };

  const handleAddLocation = async (e) => {
    e.preventDefault();
    if (!sessionReady || !session) return alert('Necesitas iniciar sesión.');
    const locationToInsert = {};
    Object.keys(newLocation).forEach(k => locationToInsert[k] = newLocation[k] === '' ? null : newLocation[k]);
    const { error } = await supabase.from(tableName).insert([locationToInsert]);
    if (error) alert(`Error al añadir la ubicación: ${error.message}`);
    else { alert('¡Ubicación añadida con éxito!'); closeAddModal(); setSearchTerm(''); setCurrentPage(1); }
  };

  const handleEditClick = (location) => {
    updateEditingLocationState(location);
    setIsEditModalOpen(true);
    setSelectedLocation(null);
  };

  const handleUpdateLocation = async (e) => {
    e.preventDefault();
    if (!sessionReady || !session) return alert('Necesitas iniciar sesión.');
    const { id, ...updateData } = editingLocation;
    const { error } = await supabase.from(tableName).update(updateData).eq('id', id);
    if (error) alert(`Error al actualizar la ubicación: ${error.message}`);
    else { alert('¡Ubicación actualizada con éxito!'); closeEditModal(); fetchLocations(currentPage, searchTerm); }
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    try { localStorage.removeItem(addFormStorageKey); } catch {}
    setNewLocation({ nombre:'', direccion:'', link_maps:'', tiempo_espera:'', detalles:'', coordenadas:'', link_foto:'' });
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    try { localStorage.removeItem(editFormStorageKey); } catch {}
    setEditingLocation(null);
  };

  const getMapsLink = (location) => {
    if (location.link_maps) return location.link_maps;
    if (location.coordenadas) return `https://maps.google.com/?q=${location.coordenadas}`;
    return null;
  };

  const canEdit = profile?.role === 'dispecer' || profile?.role === 'sofer' || profile?.role === 'admin';

  // upload handlers
  const handleUploadForAdd = async (e) => {
    try {
      const file = e.target.files?.[0]; if (!file) return;
      setUploadingAdd(true);
      const url = await uploadToImgbb(file);
      const ns = { ...newLocation, link_foto: url };
      updateNewLocationState(ns);
      alert('Imagen subida. El campo "Link Foto" se ha completado automáticamente.');
    } catch (err) {
      alert(`Error al subir la imagen: ${err.message}`);
    } finally { setUploadingAdd(false); e.target.value = ''; }
  };

  const handleUploadForEdit = async (e) => {
    try {
      const file = e.target.files?.[0]; if (!file) return;
      setUploadingEdit(true);
      const url = await uploadToImgbb(file);
      const ns = { ...editingLocation, link_foto: url };
      updateEditingLocationState(ns);
      alert('Imagen subida. El "Link Foto" se ha actualizado.');
    } catch (err) {
      alert(`Error al subir la imagen: ${err.message}`);
    } finally { setUploadingEdit(false); e.target.value = ''; }
  };

  if (!sessionReady) return <p className={styles.centerHint}>Conectando…</p>;
  if (!session)      return <p className={styles.centerHint}>Inicia sesión para ver {title.toLowerCase()}s.</p>;

  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.searchBar}>
          <SearchIcon />
          <input
            type="text"
            placeholder="Buscar por nombre…"
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>

        {canEdit && (
          <button className={styles.addButton} onClick={() => setIsAddModalOpen(true)}>
            <PlusIcon /><span>Añadir {title}</span>
          </button>
        )}
      </div>

      {loading ? (
        <p className={styles.centerHint}>Cargando…</p>
      ) : (
        <>
          <div className={styles.locationGrid}>
            {locations.map((location) => (
              <div
                key={location.id}
                className={styles.locationCard}
                onClick={() => setSelectedLocation(location)}
              >
                <img
                  src={location.link_foto || 'https://placehold.co/600x400/cccccc/ffffff?text=Sin+Foto'}
                  alt={`Foto de ${location.nombre}`}
                  className={styles.locationCardImage}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = 'https://placehold.co/600x400/cccccc/ffffff?text=Error+de+Imagen';
                  }}
                />
                <div className={styles.locationCardOverlay}>
                  <h3 className={styles.locationCardTitle}>{location.nombre}</h3>
                </div>

                {canEdit && (
                  <button
                    className={styles.locationCardEditBtn}
                    onClick={(e) => { e.stopPropagation(); handleEditClick(location); }}
                    title="Editar"
                  >
                    <EditIcon />
                  </button>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className={styles.paginationContainer}>
              <button
                className={styles.paginationButton}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </button>
              <span className={styles.pageIndicator}>
                Página {currentPage} de {totalPages}
              </span>
              <button
                className={styles.paginationButton}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      {selectedLocation && (
        <div className={styles.modalOverlay} onClick={() => setSelectedLocation(null)}>
          <div className={`${styles.modalContent} ${styles.locationModal}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{selectedLocation.nombre}</h3>
              <div className={styles.modalHeaderActions}>
                {canEdit && (
                  <button
                    onClick={() => handleEditClick(selectedLocation)}
                    className={styles.iconBtn}
                    title="Editar"
                  >
                    <EditIcon />
                  </button>
                )}
                <button onClick={() => setSelectedLocation(null)} className={styles.iconBtn} title="Cerrar">
                  <CloseIcon />
                </button>
              </div>
            </div>

            <div className={styles.modalBody}>
              <img
                src={selectedLocation.link_foto || 'https://placehold.co/600x400/cccccc/ffffff?text=Sin+Foto'}
                alt={`Foto de ${selectedLocation.nombre}`}
                className={styles.locationModalImage}
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://placehold.co/600x400/cccccc/ffffff?text=Error+de+Imagen'; }}
              />
              <div className={styles.locationDetails}>
                {selectedLocation.direccion && <p><strong>Dirección:</strong> {selectedLocation.direccion}</p>}
                {selectedLocation.tiempo_espera && tableName === 'gps_clientes' && (
                  <p><strong>Tiempo de Espera:</strong> {selectedLocation.tiempo_espera}</p>
                )}
                {selectedLocation.detalles && <p><strong>Detalles:</strong> {selectedLocation.detalles}</p>}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={`${styles.modalButton} ${styles.modalButtonPrimary}`}
                onClick={async () => {
                  try {
                    const locationType = tableName.replace('gps_', '');
                    const saved = await findSavedRouteForLocation(locationType, selectedLocation.id);

                    if (!saved?.geojson) {
                      const link = getMapsLink(selectedLocation);
                      if (link) return window.open(link, '_blank', 'noopener');
                      return alert('No existe ruta guardada para esta ubicación.');
                    }

                    let gj = saved.geojson;
                    if (typeof gj === 'string') { try { gj = JSON.parse(gj); } catch {} }
                    const fc = normalizeGeoJSON(gj);
                    if (!fc) throw new Error('GeoJSON inválido.');

                    setNavData({ title: saved.name || selectedLocation.nombre, geojson: fc });
                  } catch (err) {
                    console.error(err);
                    const link = getMapsLink(selectedLocation);
                    if (link) window.open(link, '_blank', 'noopener');
                    else alert('Error al abrir la navegación.');
                  }
                }}
              >
                Navegar
              </button>

              {getMapsLink(selectedLocation) ? (
                <a
                  href={getMapsLink(selectedLocation)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.modalButton} ${styles.modalButtonSecondary} ${styles.irButton}`}
                >
                  Google Maps
                </a>
              ) : (
                <button className={`${styles.modalButton} ${styles.modalButtonSecondary} ${styles.irButton}`} disabled>
                  Maps no disponible
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {navData && (
        <NavOverlay
          title={navData.title}
          geojson={navData.geojson}
          onClose={() => setNavData(null)}
        />
      )}

      {/* ADD */}
      {isAddModalOpen && (
        <div className={styles.modalOverlay} onClick={closeAddModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Añadir Nuevo {title}</h3>
              <button onClick={closeAddModal} className={styles.iconBtn} title="Cerrar"><CloseIcon /></button>
            </div>

            <form onSubmit={handleAddLocation} className={styles.formWrapper}>
              <div className={styles.modalBody}>
                <div className={styles.inputGroup}>
                  <label htmlFor="nombre">Nombre</label>
                  <input id="nombre" type="text" value={newLocation.nombre}
                         onChange={(e) => updateNewLocationState({ ...newLocation, nombre: e.target.value })} required/>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="direccion">Dirección</label>
                  <input id="direccion" type="text" value={newLocation.direccion}
                         onChange={(e) => updateNewLocationState({ ...newLocation, direccion: e.target.value })}/>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="link_maps">Link Google Maps (opcional)</label>
                  <input id="link_maps" type="text" value={newLocation.link_maps}
                         onChange={(e) => updateNewLocationState({ ...newLocation, link_maps: e.target.value })}/>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="coordenadas">Coordenadas</label>
                  <div className={styles.geolocationGroup}>
                    <input id="coordenadas" type="text" value={newLocation.coordenadas}
                           onChange={(e) => updateNewLocationState({ ...newLocation, coordenadas: e.target.value })}
                           placeholder="Ej: 41.15, 1.10"/>
                    <button type="button" className={styles.geolocationButton}
                            onClick={() => handleGetLocation(setNewLocation, updateNewLocationState)}
                            disabled={gettingLocation} title="Usar mi ubicación">
                      {gettingLocation ? '…' : <GpsFixedIcon />}
                    </button>
                  </div>
                </div>

                {tableName === 'gps_clientes' && (
                  <div className={styles.inputGroup}>
                    <label htmlFor="tiempo_espera">Tiempo de Espera</label>
                    <input id="tiempo_espera" type="text" value={newLocation.tiempo_espera}
                           onChange={(e) => updateNewLocationState({ ...newLocation, tiempo_espera: e.target.value })}/>
                  </div>
                )}

                <div className={styles.inputGroup}>
                  <label htmlFor="link_foto">Link Foto</label>
                  <input id="link_foto" type="text" value={newLocation.link_foto}
                         onChange={(e) => updateNewLocationState({ ...newLocation, link_foto: e.target.value })}
                         placeholder="https://…"/>

                  <div className={styles.inputHint}>o súbela desde el teléfono:</div>
                  <input type="file" accept="image/*" capture="environment"
                         onChange={handleUploadForAdd} disabled={uploadingAdd}/>
                  {uploadingAdd && <div className={styles.inputHint}>Subiendo imagen…</div>}
                  {newLocation.link_foto && (
                    <img src={newLocation.link_foto} alt="Vista previa" className={styles.previewImg}
                         onError={(e) => { e.currentTarget.style.display = 'none'; }}/>
                  )}
                </div>

                <div className={`${styles.inputGroup} ${styles.inputGroupFullWidth}`}>
                  <label htmlFor="detalles">Detalles</label>
                  <textarea id="detalles" rows="4" value={newLocation.detalles}
                            onChange={(e) => updateNewLocationState({ ...newLocation, detalles: e.target.value })}/>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={`${styles.modalButton} ${styles.modalButtonSecondary}`} onClick={closeAddModal}>Cancelar</button>
                <button type="submit" className={`${styles.modalButton} ${styles.modalButtonPrimary}`}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT */}
      {isEditModalOpen && editingLocation && (
        <div className={styles.modalOverlay} onClick={closeEditModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Editar {editingLocation.nombre}</h3>
              <button onClick={closeEditModal} className={styles.iconBtn} title="Cerrar"><CloseIcon /></button>
            </div>

            <form onSubmit={handleUpdateLocation} className={styles.formWrapper}>
              <div className={styles.modalBody}>
                <div className={styles.inputGroup}>
                  <label htmlFor="edit-nombre">Nombre</label>
                  <input id="edit-nombre" type="text" value={editingLocation.nombre || ''}
                         onChange={(e) => updateEditingLocationState({ ...editingLocation, nombre: e.target.value })} required/>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="edit-direccion">Dirección</label>
                  <input id="edit-direccion" type="text" value={editingLocation.direccion || ''}
                         onChange={(e) => updateEditingLocationState({ ...editingLocation, direccion: e.target.value })}/>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="edit-link_maps">Link Google Maps (opcional)</label>
                  <input id="edit-link_maps" type="text" value={editingLocation.link_maps || ''}
                         onChange={(e) => updateEditingLocationState({ ...editingLocation, link_maps: e.target.value })}/>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="edit-coordenadas">Coordenadas</label>
                  <div className={styles.geolocationGroup}>
                    <input id="edit-coordenadas" type="text" value={editingLocation.coordenadas || ''}
                           onChange={(e) => updateEditingLocationState({ ...editingLocation, coordenadas: e.target.value })}
                           placeholder="Ej: 41.15, 1.10"/>
                    <button type="button" className={styles.geolocationButton}
                            onClick={() => handleGetLocation(setEditingLocation, updateEditingLocationState)}
                            disabled={gettingLocation} title="Usar mi ubicación">
                      {gettingLocation ? '…' : <GpsFixedIcon />}
                    </button>
                  </div>
                </div>

                {tableName === 'gps_clientes' && (
                  <div className={styles.inputGroup}>
                    <label htmlFor="edit-tiempo_espera">Tiempo de Espera</label>
                    <input id="edit-tiempo_espera" type="text" value={editingLocation.tiempo_espera || ''}
                           onChange={(e) => updateEditingLocationState({ ...editingLocation, tiempo_espera: e.target.value })}/>
                  </div>
                )}

                <div className={styles.inputGroup}>
                  <label htmlFor="edit-link_foto">Link Foto</label>
                  <input id="edit-link_foto" type="text" value={editingLocation.link_foto || ''}
                         onChange={(e) => updateEditingLocationState({ ...editingLocation, link_foto: e.target.value })}
                         placeholder="https://…"/>
                  <div className={styles.inputHint}>o súbela desde el teléfono:</div>
                  <input type="file" accept="image/*" capture="environment"
                         onChange={handleUploadForEdit} disabled={uploadingEdit}/>
                  {uploadingEdit && <div className={styles.inputHint}>Subiendo imagen…</div>}
                  {editingLocation.link_foto && (
                    <img src={editingLocation.link_foto} alt="Vista previa" className={styles.previewImg}
                         onError={(e) => { e.currentTarget.style.display = 'none'; }}/>
                  )}
                </div>

                <div className={`${styles.inputGroup} ${styles.inputGroupFullWidth}`}>
                  <label htmlFor="edit-detalles">Detalles</label>
                  <textarea id="edit-detalles" rows="4" value={editingLocation.detalles || ''}
                            onChange={(e) => updateEditingLocationState({ ...editingLocation, detalles: e.target.value })}/>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={`${styles.modalButton} ${styles.modalButtonSecondary}`} onClick={closeEditModal}>Cancelar</button>
                <button type="submit" className={`${styles.modalButton} ${styles.modalButtonPrimary}`}>Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

/* --------------------------- Pagina ---------------------------- */
export default function GpsPage() {
  const [activeView, setActiveView] = useState('clientes');

  return (
    <Layout backgroundClassName="gpsBackground">
      <div className={styles.tabs}>
        <button
          className={`${styles.tabBtn} ${activeView === 'clientes' ? styles.active : ''}`}
          onClick={() => setActiveView('clientes')}
        >Clientes</button>
        <button
          className={`${styles.tabBtn} ${activeView === 'parkings' ? styles.active : ''}`}
          onClick={() => setActiveView('parkings')}
        >Parkings</button>
        <button
          className={`${styles.tabBtn} ${activeView === 'servicios' ? styles.active : ''}`}
          onClick={() => setActiveView('servicios')}
        >Servicios</button>
        <button
          className={`${styles.tabBtn} ${activeView === 'terminale' ? styles.active : ''}`}
          onClick={() => setActiveView('terminale')}
        >Terminales</button>
      </div>

      {activeView === 'clientes'  && <LocationList tableName="gps_clientes"  title="Cliente"  />}
      {activeView === 'parkings'  && <LocationList tableName="gps_parkings"  title="Parking"  />}
      {activeView === 'servicios' && <LocationList tableName="gps_servicios" title="Servicio" />}
      {activeView === 'terminale' && <LocationList tableName="gps_terminale" title="Terminal" />}
    </Layout>
  );
}
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import styles from './GpsPage.module.css';
import depotStyles from './DepotPage.module.css';
import {
  SearchIcon,
  PlusIcon,
  CloseIcon,
  GpsFixedIcon,
  EditIcon
} from './Icons'; // presupunem că iconițele sunt exportate dintr-un fișier separat

const ITEMS_PER_PAGE = 25;

const LocationList = ({ tableName, title }) => {
  const { profile } = useAuth();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [newLocation, setNewLocation] = useState({
    nombre: '',
    direccion: '',
    link_maps: '',
    tiempo_espera: '',
    detalles: '',
    coordenadas: '',
    link_foto: '',
  });

  // Extragem locațiile din Supabase
  const fetchLocations = useCallback(
    async (page = currentPage, term = searchTerm) => {
      setLoading(true);
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase.from(tableName).select('*', { count: 'exact' });
      if (term) {
        query = query.ilike('nombre', `%${term}%`);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error(`Error fetching ${tableName}:`, error);
      } else {
        setLocations(data || []);
        setTotalCount(count || 0);
      }
      setLoading(false);
    },
    [tableName, currentPage, searchTerm]
  );

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleGetLocation = (setter) => {
    if (!navigator.geolocation) {
      alert('Geolocalizarea nu este suportată de acest browser.');
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude, longitude } }) => {
        const coordsString = `${latitude},${longitude}`;
        setter((prev) => ({ ...prev, coordenadas: coordsString }));
        setGettingLocation(false);
      },
      (error) => {
        alert(`Eroare la obținerea locației: ${error.message}`);
        setGettingLocation(false);
      }
    );
  };

  const handleAddLocation = async (e) => {
    e.preventDefault();
    // Transformă câmpurile goale în null
    const locationToInsert = {};
    Object.keys(newLocation).forEach((key) => {
      locationToInsert[key] = newLocation[key] === '' ? null : newLocation[key];
    });
    const { error } = await supabase.from(tableName).insert([locationToInsert]);
    if (error) {
      alert(`Error al añadir la ubicación: ${error.message}`);
    } else {
      alert('Ubicación añadida con éxito!');
      setIsAddModalOpen(false);
      setCurrentPage(1);
      setSearchTerm('');
      fetchLocations(1, '');
      setNewLocation({
        nombre: '',
        direccion: '',
        link_maps: '',
        tiempo_espera: '',
        detalles: '',
        coordenadas: '',
        link_foto: '',
      });
    }
  };

  const handleEditClick = (location) => {
    setEditingLocation(location);
    setIsEditModalOpen(true);
    setSelectedLocation(null);
  };

  const handleUpdateLocation = async (e) => {
    e.preventDefault();
    const { id, ...updateData } = editingLocation;
    const { error } = await supabase.from(tableName).update(updateData).eq('id', id);
    if (error) {
      alert(`Error al actualizar la ubicación: ${error.message}`);
    } else {
      alert('Ubicación actualizada con éxito!');
      setIsEditModalOpen(false);
      setEditingLocation(null);
      fetchLocations();
    }
  };

  // Calculează linkul pentru Maps
  const getMapsLink = (location) => {
    if (location.link_maps) return location.link_maps;
    if (location.coordenadas) {
      return `https://www.google.com/maps/search/?api=1&query=${location.coordenadas}`;
    }
    return null;
  };

  // Roluri care pot adăuga/edita
  const canEdit = profile?.role === 'dispecer' || profile?.role === 'sofer';

  return (
    <>
      {/* Toolbar (căutare + add) */}
      <div className={depotStyles.toolbar}>
        <div className={depotStyles.searchBar}>
          <SearchIcon />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
        {canEdit && (
          <button className={depotStyles.addButton} onClick={() => setIsAddModalOpen(true)}>
            <PlusIcon />
            <span>Añadir {title}</span>
          </button>
        )}
      </div>

      {/* Lista locațiilor sau mesaj de încărcare */}
      {loading ? (
        <p style={{ color: 'white', textAlign: 'center' }}>Cargando...</p>
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
                  src={
                    location.link_foto ||
                    'https://placehold.co/600x400/cccccc/ffffff?text=Fara+Foto'
                  }
                  alt={`Foto de ${location.nombre}`}
                  className={styles.locationCardImage}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src =
                      'https://placehold.co/600x400/cccccc/ffffff?text=Eroare+Imagine';
                  }}
                />
                {/* Titlu pe card */}
                <div className={styles.locationCardOverlay}>
                  <h3 className={styles.locationCardTitle}>{location.nombre}</h3>
                </div>
                {/* Buton de editare pe card */}
                {canEdit && (
                  <button
                    className={styles.locationCardEditBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditClick(location);
                    }}
                  >
                    <EditIcon />
                  </button>
                )}
              </div>
            ))}
          </div>
          {/* Paginare */}
          {totalPages > 1 && (
            <div className={styles.paginationContainer}>
              <button
                className={styles.paginationButton}
                onClick={() => setCurrentPage((p) => p - 1)}
                disabled={currentPage === 1}
              >
                Anterior
              </button>
              <span className={styles.pageIndicator}>
                Página {currentPage} de {totalPages}
              </span>
              <button
                className={styles.paginationButton}
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={currentPage >= totalPages}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal cu detalii */}
      {selectedLocation && (
        <div className="modal-overlay" onClick={() => setSelectedLocation(null)}>
          <div className={`modal-content ${styles.locationModal}`} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{selectedLocation.nombre}</h3>
              <div className={styles.modalHeaderActions}>
                {canEdit && (
                  <button
                    onClick={() => handleEditClick(selectedLocation)}
                    className={styles.editButtonModal}
                  >
                    <EditIcon />
                  </button>
                )}
                <button onClick={() => setSelectedLocation(null)} className="close-button">
                  <CloseIcon />
                </button>
              </div>
            </div>
            <div className="modal-body">
              <img
                src={
                  selectedLocation.link_foto ||
                  'https://placehold.co/600x400/cccccc/ffffff?text=Fara+Foto'
                }
                alt={`Foto de ${selectedLocation.nombre}`}
                className={styles.locationModalImage}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src =
                    'https://placehold.co/600x400/cccccc/ffffff?text=Eroare+Imagine';
                }}
              />
              <div className={styles.locationDetails}>
                {selectedLocation.direccion && (
                  <p>
                    <strong>Dirección:</strong> {selectedLocation.direccion}
                  </p>
                )}
                {/* Arată Tiempo de Espera doar pentru clienți */}
                {selectedLocation.tiempo_espera && tableName === 'gps_clientes' && (
                  <p>
                    <strong>Tiempo de Espera:</strong> {selectedLocation.tiempo_espera}
                  </p>
                )}
                {selectedLocation.detalles && (
                  <p>
                    <strong>Detalles:</strong> {selectedLocation.detalles}
                  </p>
                )}
              </div>
            </div>
            <div className="modal-footer">
              {getMapsLink(selectedLocation) ? (
                <a
                  href={getMapsLink(selectedLocation)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`modal-button primary ${styles.irButton}`}
                >
                  Cómo llegar
                </a>
              ) : (
                <button className={`modal-button secondary ${styles.irButton}`} disabled>
                  Maps no disponible
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de adăugare */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Añadir Nuevo {title}</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="close-button">
                <CloseIcon />
              </button>
            </div>
            <form onSubmit={handleAddLocation} className="modal-body">
              <div className={depotStyles.inputGroup}>
                <label>Nombre</label>
                <input
                  type="text"
                  value={newLocation.nombre}
                  onChange={(e) => setNewLocation({ ...newLocation, nombre: e.target.value })}
                  required
                />
              </div>
              <div className={depotStyles.inputGroup}>
                <label>Dirección</label>
                <input
                  type="text"
                  value={newLocation.direccion}
                  onChange={(e) => setNewLocation({ ...newLocation, direccion: e.target.value })}
                />
              </div>
              <div className={depotStyles.inputGroup}>
                <label>Link Google Maps (opțional)</label>
                <input
                  type="text"
                  value={newLocation.link_maps}
                  onChange={(e) => setNewLocation({ ...newLocation, link_maps: e.target.value })}
                />
              </div>
              <div className={depotStyles.inputGroup}>
                <label>Coordenadas</label>
                <div className={styles.geolocationGroup}>
                  <input
                    type="text"
                    value={newLocation.coordenadas}
                    onChange={(e) =>
                      setNewLocation({ ...newLocation, coordenadas: e.target.value })
                    }
                    placeholder="Ej: 41.15, 1.10"
                  />
                  <button
                    type="button"
                    className={styles.geolocationButton}
                    onClick={() => handleGetLocation(setNewLocation)}
                    disabled={gettingLocation}
                  >
                    {gettingLocation ? '...' : <GpsFixedIcon />}
                  </button>
                </div>
              </div>
              {/* Campo Tiempo de Espera doar pentru clienți */}
              {tableName === 'gps_clientes' && (
                <div className={depotStyles.inputGroup}>
                  <label>Tiempo de Espera</label>
                  <input
                    type="text"
                    value={newLocation.tiempo_espera}
                    onChange={(e) =>
                      setNewLocation({ ...newLocation, tiempo_espera: e.target.value })
                    }
                  />
                </div>
              )}
              <div className={depotStyles.inputGroup}>
                <label>Link Foto</label>
                <input
                  type="text"
                  value={newLocation.link_foto}
                  onChange={(e) => setNewLocation({ ...newLocation, link_foto: e.target.value })}
                />
              </div>
              <div className={`${depotStyles.inputGroup} ${depotStyles.fullWidth}`}>
                <label>Detalles</label>
                <textarea
                  value={newLocation.detalles}
                  onChange={(e) => setNewLocation({ ...newLocation, detalles: e.target.value })}
                ></textarea>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="modal-button secondary"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="modal-button primary">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de editare */}
      {isEditModalOpen && editingLocation && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Editar {editingLocation.nombre}</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="close-button">
                <CloseIcon />
              </button>
            </div>
            <form onSubmit={handleUpdateLocation} className="modal-body">
              <div className={depotStyles.inputGroup}>
                <label>Nombre</label>
                <input
                  type="text"
                  value={editingLocation.nombre || ''}
                  onChange={(e) =>
                    setEditingLocation({ ...editingLocation, nombre: e.target.value })
                  }
                  required
                />
              </div>
              <div className={depotStyles.inputGroup}>
                <label>Dirección</label>
                <input
                  type="text"
                  value={editingLocation.direccion || ''}
                  onChange={(e) =>
                    setEditingLocation({ ...editingLocation, direccion: e.target.value })
                  }
                />
              </div>
              <div className={depotStyles.inputGroup}>
                <label>Link Google Maps (opcional)</label>
                <input
                  type="text"
                  value={editingLocation.link_maps || ''}
                  onChange={(e) =>
                    setEditingLocation({ ...editingLocation, link_maps: e.target.value })
                  }
                />
              </div>
              <div className={depotStyles.inputGroup}>
                <label>Coordenadas</label>
                <div className={styles.geolocationGroup}>
                  <input
                    type="text"
                    value={editingLocation.coordenadas || ''}
                    onChange={(e) =>
                      setEditingLocation({ ...editingLocation, coordenadas: e.target.value })
                    }
                    placeholder="Ej: 41.15, 1.10"
                  />
                  <button
                    type="button"
                    className={styles.geolocationButton}
                    onClick={() => handleGetLocation(setEditingLocation)}
                    disabled={gettingLocation}
                  >
                    {gettingLocation ? '...' : <GpsFixedIcon />}
                  </button>
                </div>
              </div>
              {/* Afișează Tiempo de Espera doar la clienți */}
              {tableName === 'gps_clientes' && (
                <div className={depotStyles.inputGroup}>
                  <label>Tiempo de Espera</label>
                  <input
                    type="text"
                    value={editingLocation.tiempo_espera || ''}
                    onChange={(e) =>
                      setEditingLocation({ ...editingLocation, tiempo_espera: e.target.value })
                    }
                  />
                </div>
              )}
              <div className={depotStyles.inputGroup}>
                <label>Link Foto</label>
                <input
                  type="text"
                  value={editingLocation.link_foto || ''}
                  onChange={(e) =>
                    setEditingLocation({ ...editingLocation, link_foto: e.target.value })
                  }
                />
              </div>
              <div className={`${depotStyles.inputGroup} ${depotStyles.fullWidth}`}>
                <label>Detalles</label>
                <textarea
                  value={editingLocation.detalles || ''}
                  onChange={(e) =>
                    setEditingLocation({ ...editingLocation, detalles: e.target.value })
                  }
                ></textarea>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="modal-button secondary"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="modal-button primary">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default LocationList;
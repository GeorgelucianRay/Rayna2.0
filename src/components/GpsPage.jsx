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
  
  const addFormStorageKey = `addForm-${tableName}`;
  const editFormStorageKey = `editForm-${tableName}`;

  const [newLocation, setNewLocation] = useState({
    nombre: '', direccion: '', link_maps: '', tiempo_espera: '', detalles: '', coordenadas: '', link_foto: '',
  });

  const updateNewLocationState = (newState) => {
    setNewLocation(newState);
    localStorage.setItem(addFormStorageKey, JSON.stringify(newState));
  };
  
  const updateEditingLocationState = (newState) => {
    setEditingLocation(newState);
    localStorage.setItem(editFormStorageKey, JSON.stringify(newState));
  };

  const fetchLocations = useCallback(
    async (page, term) => {
      setLoading(true);
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase.from(tableName).select('*', { count: 'exact' });
      if (term) { query = query.ilike('nombre', `%${term}%`); }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) { console.error(`Error fetching ${tableName}:`, error); } 
      else {
        setLocations(data || []);
        setTotalCount(count || 0);
      }
      setLoading(false);
    },
    [tableName]
  );

  useEffect(() => {
    try {
      const savedAddForm = localStorage.getItem(addFormStorageKey);
      // AICI A FOST EROAREA, ACUM ESTE CORECTATĂ
      if (savedAddForm) {
        setNewLocation(JSON.parse(savedAddForm));
        setIsAddModalOpen(true);
      }

      const savedEditForm = localStorage.getItem(editFormStorageKey);
      if (savedEditForm) {
        setEditingLocation(JSON.parse(savedEditForm));
        setIsEditModalOpen(true);
      }
    } catch(e) {
      console.error("Failed to parse saved form state", e);
      localStorage.removeItem(addFormStorageKey);
      localStorage.removeItem(editFormStorageKey);
    }
    
    fetchLocations(currentPage, searchTerm);

  }, [fetchLocations, currentPage, searchTerm]);


  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); 
  };
  
  const handleGetLocation = (setter, stateUpdater) => {
    if (!navigator.geolocation) {
      alert('Geolocalizarea nu este suportată de acest browser.');
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude, longitude } }) => {
        const coordsString = `${latitude},${longitude}`;
        setter((prev) => {
          const newState = { ...prev, coordenadas: coordsString };
          stateUpdater(newState);
          return newState;
        });
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
    const locationToInsert = {};
    Object.keys(newLocation).forEach((key) => {
      locationToInsert[key] = newLocation[key] === '' ? null : newLocation[key];
    });
    const { error } = await supabase.from(tableName).insert([locationToInsert]);
    if (error) {
      alert(`Error al añadir la ubicación: ${error.message}`);
    } else {
      alert('Ubicación añadida con éxito!');
      closeAddModal();
      setSearchTerm('');
      setCurrentPage(1);
    }
  };
  
  const handleEditClick = (location) => {
    updateEditingLocationState(location);
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
      closeEditModal();
      fetchLocations(currentPage, searchTerm);
    }
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    localStorage.removeItem(addFormStorageKey);
    setNewLocation({ nombre: '', direccion: '', link_maps: '', tiempo_espera: '', detalles: '', coordenadas: '', link_foto: '' });
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    localStorage.removeItem(editFormStorageKey);
    setEditingLocation(null);
  };
  
  const getMapsLink = (location) => {
    if (location.link_maps) return location.link_maps;
    if (location.coordenadas) {
      return `https://www.google.com/maps/search/?api=1&query=${location.coordenadas}`;
    }
    return null;
  };

  const canEdit = profile?.role === 'dispecer' || profile?.role === 'sofer';

  // --- JSX (partea de randare) rămâne complet neschimbată ---
  return (
    <>
      <div className={depotStyles.toolbar}>
        <div className={depotStyles.searchBar}>
          <SearchIcon />
          <input type="text" placeholder="Buscar por nombre..." value={searchTerm} onChange={handleSearchChange} />
        </div>
        {canEdit && ( <button className={depotStyles.addButton} onClick={() => setIsAddModalOpen(true)}><PlusIcon /><span>Añadir {title}</span></button> )}
      </div>
      {loading ? ( <p style={{ color: 'white', textAlign: 'center' }}>Cargando...</p> ) : (
        <>
          <div className={styles.locationGrid}>
            {locations.map((location) => (
              <div key={location.id} className={styles.locationCard} onClick={() => setSelectedLocation(location)}>
                <img src={location.link_foto || 'https://placehold.co/600x400/cccccc/ffffff?text=Fara+Foto'} alt={`Foto de ${location.nombre}`} className={styles.locationCardImage} onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/600x400/cccccc/ffffff?text=Eroare+Imagine'; }}/>
                <div className={styles.locationCardOverlay}><h3 className={styles.locationCardTitle}>{location.nombre}</h3></div>
                {canEdit && ( <button className={styles.locationCardEditBtn} onClick={(e) => { e.stopPropagation(); handleEditClick(location); }}> <EditIcon /></button>)}
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className={styles.paginationContainer}>
              <button className={styles.paginationButton} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>Anterior</button>
              <span className={styles.pageIndicator}>Página {currentPage} de {totalPages}</span>
              <button className={styles.paginationButton} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>Siguiente</button>
            </div>
          )}
        </>
      )}
      {/* Restul codului JSX (modalele) rămâne identic... */}
      {selectedLocation && (
        <div className={styles.modalOverlay} onClick={() => setSelectedLocation(null)}>
          <div className={`${styles.modalContent} ${styles.locationModal}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{selectedLocation.nombre}</h3>
              <div className={styles.modalHeaderActions}>
                {canEdit && ( <button onClick={() => handleEditClick(selectedLocation)} className={styles.editButtonModal}><EditIcon /></button>)}
                <button onClick={() => setSelectedLocation(null)} className={styles.closeButton}><CloseIcon /></button>
              </div>
            </div>
            <div className={styles.modalBody}>
              <img src={selectedLocation.link_foto || 'https://placehold.co/600x400/cccccc/ffffff?text=Fara+Foto'} alt={`Foto de ${selectedLocation.nombre}`} className={styles.locationModalImage} onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/600x400/cccccc/ffffff?text=Eroare+Imagine'; }}/>
              <div className={styles.locationDetails}>
                {selectedLocation.direccion && ( <p><strong>Dirección:</strong> {selectedLocation.direccion}</p> )}
                {selectedLocation.tiempo_espera && tableName === 'gps_clientes' && ( <p><strong>Tiempo de Espera:</strong> {selectedLocation.tiempo_espera}</p> )}
                {selectedLocation.detalii && ( <p><strong>Detalles:</strong> {selectedLocation.detalii}</p> )}
              </div>
            </div>
            <div className={styles.modalFooter}>
              {getMapsLink(selectedLocation) ? ( <a href={getMapsLink(selectedLocation)} target="_blank" rel="noopener noreferrer" className={`${styles.modalButton} ${styles.modalButtonPrimary} ${styles.irButton}`}>Cómo llegar</a> ) : ( <button className={`${styles.modalButton} ${styles.modalButtonSecondary} ${styles.irButton}`} disabled>Maps no disponible</button> )}
            </div>
          </div>
        </div>
      )}
      
      {isAddModalOpen && (
        <div className={styles.modalOverlay} onClick={closeAddModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Añadir Nuevo {title}</h3>
              <button onClick={closeAddModal} className={styles.closeButton}><CloseIcon /></button>
            </div>
            <form onSubmit={handleAddLocation} className={styles.formWrapper}>
              <div className={styles.modalBody}>
                <div className={styles.inputGroup}><label htmlFor="nombre">Nombre</label><input id="nombre" type="text" value={newLocation.nombre} onChange={(e) => updateNewLocationState({ ...newLocation, nombre: e.target.value })} required /></div>
                <div className={styles.inputGroup}><label htmlFor="direccion">Dirección</label><input id="direccion" type="text" value={newLocation.direccion} onChange={(e) => updateNewLocationState({ ...newLocation, direccion: e.target.value })} /></div>
                <div className={styles.inputGroup}><label htmlFor="link_maps">Link Google Maps (opcional)</label><input id="link_maps" type="text" value={newLocation.link_maps} onChange={(e) => updateNewLocationState({ ...newLocation, link_maps: e.target.value })} /></div>
                <div className={styles.inputGroup}><label htmlFor="coordenadas">Coordenadas</label><div className={styles.geolocationGroup}><input id="coordenadas" type="text" value={newLocation.coordenadas} onChange={(e) => updateNewLocationState({ ...newLocation, coordenadas: e.target.value })} placeholder="Ej: 41.15, 1.10" /><button type="button" className={styles.geolocationButton} onClick={() => handleGetLocation(setNewLocation, updateNewLocationState)} disabled={gettingLocation}>{gettingLocation ? '...' : <GpsFixedIcon />}</button></div></div>
                {tableName === 'gps_clientes' && ( <div className={styles.inputGroup}><label htmlFor="tiempo_espera">Tiempo de Espera</label><input id="tiempo_espera" type="text" value={newLocation.tiempo_espera} onChange={(e) => updateNewLocationState({ ...newLocation, tiempo_espera: e.target.value })} /></div> )}
                <div className={styles.inputGroup}><label htmlFor="link_foto">Link Foto</label><input id="link_foto" type="text" value={newLocation.link_foto} onChange={(e) => updateNewLocationState({ ...newLocation, link_foto: e.target.value })} /></div>
                <div className={`${styles.inputGroup} ${styles.inputGroupFullWidth}`}><label htmlFor="detalles">Detalles</label><textarea id="detalles" value={newLocation.detalles} onChange={(e) => updateNewLocationState({ ...newLocation, detalles: e.target.value })} rows="4"></textarea></div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={`${styles.modalButton} ${styles.modalButtonSecondary}`} onClick={closeAddModal}>Cancelar</button>
                <button type="submit" className={`${styles.modalButton} ${styles.modalButtonPrimary}`}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {isEditModalOpen && editingLocation && (
        <div className={styles.modalOverlay} onClick={closeEditModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Editar {editingLocation.nombre}</h3>
              <button onClick={closeEditModal} className={styles.closeButton}><CloseIcon /></button>
            </div>
            <form onSubmit={handleUpdateLocation} className={styles.formWrapper}>
              <div className={styles.modalBody}>
                <div className={styles.inputGroup}><label htmlFor="edit-nombre">Nombre</label><input id="edit-nombre" type="text" value={editingLocation.nombre || ''} onChange={(e) => updateEditingLocationState({ ...editingLocation, nombre: e.target.value })} required /></div>
                <div className={styles.inputGroup}><label htmlFor="edit-direccion">Dirección</label><input id="edit-direccion" type="text" value={editingLocation.direccion || ''} onChange={(e) => updateEditingLocationState({ ...editingLocation, direccion: e.target.value })} /></div>
                <div className={styles.inputGroup}><label htmlFor="edit-link_maps">Link Google Maps (opcional)</label><input id="edit-link_maps" type="text" value={editingLocation.link_maps || ''} onChange={(e) => updateEditingLocationState({ ...editingLocation, link_maps: e.target.value })} /></div>
                <div className={styles.inputGroup}><label htmlFor="edit-coordenadas">Coordenadas</label><div className={styles.geolocationGroup}><input id="edit-coordenadas" type="text" value={editingLocation.coordenadas || ''} onChange={(e) => updateEditingLocationState({ ...editingLocation, coordenadas: e.target.value })} placeholder="Ej: 41.15, 1.10" /><button type="button" className={styles.geolocationButton} onClick={() => handleGetLocation(setEditingLocation, updateEditingLocationState)} disabled={gettingLocation}>{gettingLocation ? '...' : <GpsFixedIcon />}</button></div></div>
                {tableName === 'gps_clientes' && ( <div className={styles.inputGroup}><label htmlFor="edit-tiempo_espera">Tiempo de Espera</label><input id="edit-tiempo_espera" type="text" value={editingLocation.tiempo_espera || ''} onChange={(e) => updateEditingLocationState({ ...editingLocation, tiempo_espera: e.target.value })} /></div> )}
                <div className={styles.inputGroup}><label htmlFor="edit-link_foto">Link Foto</label><input id="edit-link_foto" type="text" value={editingLocation.link_foto || ''} onChange={(e) => updateEditingLocationState({ ...editingLocation, link_foto: e.target.value })} /></div>
                <div className={`${styles.inputGroup} ${styles.inputGroupFullWidth}`}><label htmlFor="edit-detalles">Detalles</label><textarea id="edit-detalles" value={editingLocation.detalles || ''} onChange={(e) => updateEditingLocationState({ ...editingLocation, detalles: e.target.value })} rows="4"></textarea></div>
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

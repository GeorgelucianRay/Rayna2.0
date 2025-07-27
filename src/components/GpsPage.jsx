import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import Layout from './Layout';
import './GpsPage.css';

// --- Iconițe SVG ---
const SearchIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>;
const PlusIcon = () => <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"></path></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>;
const GpsFixedIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="22" y1="12" x2="18" y2="12"></line><line x1="6" y1="12" x2="2" y2="12"></line></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>;


// --- Componenta REUTILIZABILĂ pentru afișarea și adăugarea locațiilor ---
const LocationList = ({ tableName, title }) => {
    const { profile } = useAuth();
    const [locations, setLocations] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingLocation, setEditingLocation] = useState(null);
    const [gettingLocation, setGettingLocation] = useState(false);
    const [newLocation, setNewLocation] = useState({
        nombre: '', direccion: '', link_maps: '', tiempo_espera: '', detalles: '', coordenadas: '', link_foto: ''
    });

    const fetchLocations = async () => {
        const { data, error } = await supabase.from(tableName).select('*');
        if (error) console.error(`Error fetching ${tableName}:`, error);
        else setLocations(data);
    };

    useEffect(() => {
        fetchLocations();
    }, [tableName]);

    const handleGetLocation = (targetStateSetter) => {
        if (!navigator.geolocation) {
            alert('Geolocalizarea nu este suportată de acest browser.');
            return;
        }
        setGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const coordsString = `${latitude},${longitude}`;
                targetStateSetter(prevState => ({ ...prevState, coordenadas: coordsString }));
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
        for (const key in newLocation) {
            locationToInsert[key] = newLocation[key] === '' ? null : newLocation[key];
        }
        const { error } = await supabase.from(tableName).insert([locationToInsert]);
        if (error) {
            alert(`Error al añadir la ubicación: ${error.message}`);
        } else {
            alert('Ubicación añadida con éxito!');
            setIsAddModalOpen(false);
            fetchLocations();
            setNewLocation({ nombre: '', direccion: '', link_maps: '', tiempo_espera: '', detalles: '', coordenadas: '', link_foto: '' });
        }
    };

    const handleEditClick = (location) => {
        setEditingLocation(location);
        setIsEditModalOpen(true);
        setSelectedLocation(null); // Închide modalul de vizualizare
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

    const filteredLocations = locations.filter(loc =>
        loc.nombre && loc.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getMapsLink = (location) => {
        if (location.link_maps) return location.link_maps;
        if (location.coordenadas) return `https://www.google.com/maps?q=${location.coordenadas}`;
        return null;
    };

    // MODIFICARE: Doar dispecerii și șoferii pot edita.
    const canEdit = profile?.role === 'dispecer' || profile?.role === 'sofer';

    return (
        <>
            <div className="toolbar">
                <div className="search-bar">
                    <SearchIcon />
                    <input type="text" placeholder="Buscar por nombre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                {canEdit && (
                    <button className="add-button" onClick={() => setIsAddModalOpen(true)}>
                        <PlusIcon />
                        <span>Añadir {title}</span>
                    </button>
                )}
            </div>
            <div className="location-grid">
                {filteredLocations.map(location => (
                    <div className="location-card" key={location.id} onClick={() => setSelectedLocation(location)}>
                        <img src={location.link_foto || 'https://placehold.co/600x400/cccccc/ffffff?text=Fara+Foto'} alt={`Foto de ${location.nombre}`} className="location-card-image" onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/600x400/cccccc/ffffff?text=Eroare+Imagine'; }} />
                        <div className="location-card-overlay"><h3 className="location-card-title">{location.nombre}</h3></div>
                    </div>
                ))}
            </div>

            {/* Modal de Vizualizare */}
            {selectedLocation && (
                <div className="modal-overlay" onClick={() => setSelectedLocation(null)}>
                    <div className="modal-content location-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{selectedLocation.nombre}</h3>
                            <div className="modal-header-actions">
                                {canEdit && (
                                    <button onClick={() => handleEditClick(selectedLocation)} className="edit-button-modal"><EditIcon /></button>
                                )}
                                <button onClick={() => setSelectedLocation(null)} className="close-button"><CloseIcon /></button>
                            </div>
                        </div>
                        <div className="modal-body">
                            <img src={selectedLocation.link_foto || 'https://placehold.co/600x400/cccccc/ffffff?text=Fara+Foto'} alt={`Foto de ${selectedLocation.nombre}`} className="location-modal-image" onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/600x400/cccccc/ffffff?text=Eroare+Imagine'; }} />
                            <div className="location-details"><p><strong>Dirección:</strong> {selectedLocation.direccion}</p><p><strong>Tiempo de Espera:</strong> {selectedLocation.tiempo_espera}</p><p><strong>Detalles:</strong> {selectedLocation.detalles}</p></div>
                        </div>
                        <div className="modal-footer">
                            {getMapsLink(selectedLocation) ? (
                                <a href={getMapsLink(selectedLocation)} target="_blank" rel="noopener noreferrer" className="modal-button primary ir-button">IR A MAPS</a>
                            ) : (
                                <button className="modal-button secondary ir-button" disabled>Maps no disponible</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Adăugare */}
            {isAddModalOpen && (
                 <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header"><h3 className="modal-title">Añadir Nuevo {title}</h3><button onClick={() => setIsAddModalOpen(false)} className="close-button"><CloseIcon /></button></div>
                        <form onSubmit={handleAddLocation} className="modal-body">
                            <div className="input-group full-width"><label>Nombre</label><input type="text" value={newLocation.nombre} onChange={(e) => setNewLocation({...newLocation, nombre: e.target.value})} /></div>
                            <div className="input-group full-width"><label>Dirección</label><input type="text" value={newLocation.direccion} onChange={(e) => setNewLocation({...newLocation, direccion: e.target.value})} /></div>
                            <div className="input-group full-width"><label>Link Google Maps (opcional)</label><input type="text" value={newLocation.link_maps} onChange={(e) => setNewLocation({...newLocation, link_maps: e.target.value})} /></div>
                            <div className="input-group full-width">
                                <label>Coordenadas</label>
                                <div className="geolocation-group">
                                    <input type="text" value={newLocation.coordenadas} onChange={(e) => setNewLocation({...newLocation, coordenadas: e.target.value})} placeholder="Ej: 41.15, 1.10" />
                                    <button type="button" className="geolocation-button" onClick={() => handleGetLocation(setNewLocation)} disabled={gettingLocation}>
                                        {gettingLocation ? '...' : <GpsFixedIcon />}
                                    </button>
                                </div>
                            </div>
                            <div className="input-group"><label>Tiempo de Espera</label><input type="text" value={newLocation.tiempo_espera} onChange={(e) => setNewLocation({...newLocation, tiempo_espera: e.target.value})} /></div>
                            <div className="input-group full-width"><label>Link Foto</label><input type="text" value={newLocation.link_foto} onChange={(e) => setNewLocation({...newLocation, link_foto: e.target.value})} /></div>
                            <div className="input-group full-width"><label>Detalles</label><textarea value={newLocation.detalles} onChange={(e) => setNewLocation({...newLocation, detalles: e.target.value})}></textarea></div>
                            <div className="modal-footer"><button type="button" className="modal-button secondary" onClick={() => setIsAddModalOpen(false)}>Cancelar</button><button type="submit" className="modal-button primary">Guardar</button></div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Editare */}
            {isEditModalOpen && editingLocation && (
                 <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header"><h3 className="modal-title">Editar {editingLocation.nombre}</h3><button onClick={() => setIsEditModalOpen(false)} className="close-button"><CloseIcon /></button></div>
                        <form onSubmit={handleUpdateLocation} className="modal-body">
                            <div className="input-group full-width"><label>Nombre</label><input type="text" value={editingLocation.nombre} onChange={(e) => setEditingLocation({...editingLocation, nombre: e.target.value})} /></div>
                            <div className="input-group full-width"><label>Dirección</label><input type="text" value={editingLocation.direccion} onChange={(e) => setEditingLocation({...editingLocation, direccion: e.target.value})} /></div>
                            <div className="input-group full-width"><label>Link Google Maps (opcional)</label><input type="text" value={editingLocation.link_maps} onChange={(e) => setEditingLocation({...editingLocation, link_maps: e.target.value})} /></div>
                            <div className="input-group full-width">
                                <label>Coordenadas</label>
                                <div className="geolocation-group">
                                    <input type="text" value={editingLocation.coordenadas} onChange={(e) => setEditingLocation({...editingLocation, coordenadas: e.target.value})} placeholder="Ej: 41.15, 1.10" />
                                    <button type="button" className="geolocation-button" onClick={() => handleGetLocation(setEditingLocation)} disabled={gettingLocation}>
                                        {gettingLocation ? '...' : <GpsFixedIcon />}
                                    </button>
                                </div>
                            </div>
                            <div className="input-group"><label>Tiempo de Espera</label><input type="text" value={editingLocation.tiempo_espera} onChange={(e) => setEditingLocation({...editingLocation, tiempo_espera: e.target.value})} /></div>
                            <div className="input-group full-width"><label>Link Foto</label><input type="text" value={editingLocation.link_foto} onChange={(e) => setEditingLocation({...editingLocation, link_foto: e.target.value})} /></div>
                            <div className="input-group full-width"><label>Detalles</label><textarea value={editingLocation.detalles} onChange={(e) => setEditingLocation({...editingLocation, detalles: e.target.value})}></textarea></div>
                            <div className="modal-footer"><button type="button" className="modal-button secondary" onClick={() => setIsEditModalOpen(false)}>Cancelar</button><button type="submit" className="modal-button primary">Guardar Cambios</button></div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

// --- Componenta Principală GPS ---
function GpsPage() {
    const [activeView, setActiveView] = useState('clientes');

    return (
        <Layout backgroundClassName="gps-background">
            <main className="main-content">
                <div className="depot-header">
                    <button className={`depot-tab-button ${activeView === 'clientes' ? 'active' : ''}`} onClick={() => setActiveView('clientes')}>Clientes</button>
                    <button className={`depot-tab-button ${activeView === 'parkings' ? 'active' : ''}`} onClick={() => setActiveView('parkings')}>Parkings</button>
                    <button className={`depot-tab-button ${activeView === 'servicios' ? 'active' : ''}`} onClick={() => setActiveView('servicios')}>Servicios</button>
                    <button className={`depot-tab-button ${activeView === 'terminale' ? 'active' : ''}`} onClick={() => setActiveView('terminale')}>Terminale</button>
                </div>
                
                {activeView === 'clientes' && <LocationList tableName="gps_clientes" title="Cliente" />}
                {activeView === 'parkings' && <LocationList tableName="gps_parkings" title="Parking" />}
                {activeView === 'servicios' && <LocationList tableName="gps_servicios" title="Servicio" />}
                {activeView === 'terminale' && <LocationList tableName="gps_terminale" title="Terminal" />}
            </main>
        </Layout>
    );
}

export default GpsPage;
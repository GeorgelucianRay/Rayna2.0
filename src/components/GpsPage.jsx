import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import Layout from './Layout';
import './GpsPage.css';

// --- Iconițe SVG ---
const SearchIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>;
const PlusIcon = () => <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"></path></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>;
const GpsFixedIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="22" y1="12" x2="18" y2="12"></line><line x1="6" y1="12" x2="2" y2="12"></line></svg>;

// --- Componenta REUTILIZABILĂ pentru afișarea și adăugarea locațiilor ---
const LocationList = ({ tableName, title }) => {
    const [locations, setLocations] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocalizarea nu este suportată de acest browser.');
            return;
        }
        setGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const coordsString = `${latitude},${longitude}`;
                setNewLocation({ ...newLocation, coordenadas: coordsString });
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

    const filteredLocations = locations.filter(loc =>
        loc.nombre && loc.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getMapsLink = (location) => {
        if (location.link_maps) return location.link_maps;
        if (location.coordenadas) return `https://www.google.com/maps?q=${location.coordenadas}`;
        return null;
    };

    return (
        <>
            <div className="toolbar">
                <div className="search-bar">
                    <SearchIcon />
                    <input type="text" placeholder="Buscar por nombre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <button className="add-button" onClick={() => setIsAddModalOpen(true)}>
                    <PlusIcon />
                    <span>Añadir {title}</span>
                </button>
            </div>
            <div className="location-grid">
                {filteredLocations.map(location => (
                    <div className="location-card" key={location.id} onClick={() => setSelectedLocation(location)}>
                        <img src={location.link_foto || 'https://placehold.co/600x400/cccccc/ffffff?text=Fara+Foto'} alt={`Foto de ${location.nombre}`} className="location-card-image" onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/600x400/cccccc/ffffff?text=Eroare+Imagine'; }} />
                        <div className="location-card-overlay"><h3 className="location-card-title">{location.nombre}</h3></div>
                    </div>
                ))}
            </div>

            {selectedLocation && (
                <div className="modal-overlay" onClick={() => setSelectedLocation(null)}>
                    <div className="modal-content location-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header"><h3 className="modal-title">{selectedLocation.nombre}</h3><button onClick={() => setSelectedLocation(null)} className="close-button"><CloseIcon /></button></div>
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
                                    <button type="button" className="geolocation-button" onClick={handleGetLocation} disabled={gettingLocation}>
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

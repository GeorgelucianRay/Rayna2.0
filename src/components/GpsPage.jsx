import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import Layout from './Layout';
import styles from './GpsPage.module.css'; // Importăm modulul CSS specific
import depotStyles from './DepotPage.module.css'; // Refolosim stiluri din Depot pentru consistență

// --- Iconițe SVG ---
const SearchIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>;
const PlusIcon = () => <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"></path></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>;
const GpsFixedIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="22" y1="12" x2="18" y2="12"></line><line x1="6" y1="12" x2="2" y2="12"></line></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>;

const ITEMS_PER_PAGE = 25;

// --- Componenta REUTILIZABILĂ pentru afișarea și adăugarea locațiilor ---
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
        nombre: '', direccion: '', link_maps: '', tiempo_espera: '', detalles: '', coordenadas: '', link_foto: ''
    });

    useEffect(() => {
        const fetchLocations = async () => {
            setLoading(true);
            const from = (currentPage - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            let query = supabase.from(tableName).select('*', { count: 'exact' });

            if (searchTerm) {
                query = query.ilike('nombre', `%${searchTerm}%`);
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
        };
        fetchLocations();
    }, [tableName, currentPage, searchTerm]);

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1); // Resetăm la prima pagină la fiecare căutare
    };

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

    const getMapsLink = (location) => {
        if (location.link_maps) return location.link_maps;
        if (location.coordenadas) return `https://www.google.com/maps?q=${location.coordenadas}`;
        return null;
    };

    const canEdit = profile?.role === 'dispecer' || profile?.role === 'sofer';

    return (
        <>
            <div className={depotStyles.toolbar}>
                <div className={depotStyles.searchBar}>
                    <SearchIcon />
                    <input type="text" placeholder="Buscar por nombre..." value={searchTerm} onChange={handleSearchChange} />
                </div>
                {canEdit && (
                    <button className={depotStyles.addButton} onClick={() => setIsAddModalOpen(true)}>
                        <PlusIcon />
                        <span>Añadir {title}</span>
                    </button>
                )}
            </div>

            {loading ? (
                <p style={{ color: 'white', textAlign: 'center' }}>Cargando...</p>
            ) : (
                <>
                    <div className={styles.locationGrid}>
                        {locations.map(location => (
                            <div className={styles.locationCard} key={location.id} onClick={() => setSelectedLocation(location)}>
                                <img src={location.link_foto || 'https://placehold.co/600x400/cccccc/ffffff?text=Fara+Foto'} alt={`Foto de ${location.nombre}`} className={styles.locationCardImage} onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/600x400/cccccc/ffffff?text=Eroare+Imagine'; }} />
                                <div className={styles.locationCardOverlay}><h3 className={styles.locationCardTitle}>{location.nombre}</h3></div>
                            </div>
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className={styles.paginationContainer}>
                            <button 
                                className={styles.paginationButton} 
                                onClick={() => setCurrentPage(p => p - 1)} 
                                disabled={currentPage === 1}
                            >
                                Anterior
                            </button>
                            <span className={styles.pageIndicator}>Página {currentPage} de {totalPages}</span>
                            <button 
                                className={styles.paginationButton} 
                                onClick={() => setCurrentPage(p => p + 1)} 
                                disabled={currentPage >= totalPages}
                            >
                                Siguiente
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* ... JSX-ul pentru ferestrele modale (Vizualizare, Adăugare, Editare) ... */}
            
        </>
    );
};

// --- Componenta Principală GPS ---
function GpsPage() {
    const [activeView, setActiveView] = useState('clientes');

    const handleTabChange = (tab) => {
        setActiveView(tab);
    };

    return (
        <Layout backgroundClassName="gps-background">
            <div className={depotStyles.depotHeader}>
                <button className={`${depotStyles.depotTabButton} ${activeView === 'clientes' ? depotStyles.active : ''}`} onClick={() => handleTabChange('clientes')}>Clientes</button>
                <button className={`${depotStyles.depotTabButton} ${activeView === 'parkings' ? depotStyles.active : ''}`} onClick={() => handleTabChange('parkings')}>Parkings</button>
                <button className={`${depotStyles.depotTabButton} ${activeView === 'servicios' ? depotStyles.active : ''}`} onClick={() => handleTabChange('servicios')}>Servicios</button>
                <button className={`${depotStyles.depotTabButton} ${activeView === 'terminale' ? depotStyles.active : ''}`} onClick={() => handleTabChange('terminale')}>Terminale</button>
            </div>
            
            {activeView === 'clientes' && <LocationList tableName="gps_clientes" title="Cliente" />}
            {activeView === 'parkings' && <LocationList tableName="gps_parkings" title="Parking" />}
            {activeView === 'servicios' && <LocationList tableName="gps_servicios" title="Servicio" />}
            {activeView === 'terminale' && <LocationList tableName="gps_terminale" title="Terminal" />}
        </Layout>
    );
}

export default GpsPage;

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import Layout from './Layout';
import styles from './ReparatiiPage.module.css';

// --- Iconițe SVG ---
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"></path><polyline points="12 19 5 12 12 5"></polyline></svg>;
const PlusIcon = () => <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"></path></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;


function ReparatiiPage() {
    const { type, id } = useParams();
    const navigate = useNavigate();
    const { profile } = useAuth();
    const ITEMS_PER_PAGE = 10;

    const [vehicle, setVehicle] = useState(null);
    const [repairs, setRepairs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    
    const [newRepair, setNewRepair] = useState({
        nombre_operacion: '',
        detalii: '',
        kilometri: ''
    });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const tableName = type === 'camion' ? 'camioane' : 'remorci';
            const foreignKey = type === 'camion' ? 'camion_id' : 'remorca_id';

            // Fetch vehicle details (nu se schimbă)
            const { data: vehicleData, error: vehicleError } = await supabase
                .from(tableName)
                .select('matricula')
                .eq('id', id)
                .single();

            if (vehicleError) console.error(`Error fetching vehicle:`, vehicleError);
            else setVehicle(vehicleData);

            // Fetch repairs with search and pagination
            const from = (currentPage - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            let repairsQuery = supabase
                .from('reparatii')
                .select('*', { count: 'exact' })
                .eq(foreignKey, id);
            
            if (searchTerm) {
                repairsQuery = repairsQuery.ilike('nombre_operacion', `%${searchTerm}%`);
            }

            const { data: repairsData, error: repairsError, count } = await repairsQuery
                .order('created_at', { ascending: false })
                .range(from, to);

            if (repairsError) console.error(`Error fetching repairs:`, repairsError);
            else {
                setRepairs(repairsData || []);
                setTotalCount(count || 0);
            }

            setLoading(false);
        };

        fetchData();
    }, [id, type, currentPage, searchTerm]);

    const handleAddRepair = async (e) => {
        e.preventDefault();
        const foreignKey = type === 'camion' ? 'camion_id' : 'remorca_id';
        
        const repairData = {
            nombre_operacion: newRepair.nombre_operacion,
            detalii: newRepair.detalii,
            kilometri: type === 'camion' ? parseInt(newRepair.kilometri, 10) || null : null,
            [foreignKey]: id,
        };

        const { data: newRecord, error } = await supabase.from('reparatii').insert([repairData]).select().single();

        if (error) {
            alert(`Error al añadir la reparación: ${error.message}`);
        } else {
            alert('Reparación añadida con éxito!');
            setIsAddModalOpen(false);
            setNewRepair({ nombre_operacion: '', detalii: '', kilometri: '' });
            // Reîmprospătăm lista pentru a afișa noua reparație
            setSearchTerm(''); // Resetăm căutarea pentru a vedea noua intrare
            setCurrentPage(1); // Mergem la prima pagină
        }
    };
    
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1); // Resetăm paginația la fiecare căutare nouă
    };

    const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
    const canEdit = profile?.role === 'dispecer' || profile?.role === 'mecanic';

    if (loading) {
        return <div className={styles.loadingScreen}>Cargando...</div>;
    }

    return (
        <Layout backgroundClassName="taller-background">
            <div className={styles.repairsHeaderContainer}>
                <div>
                    <h1 className={styles.pageTitle}>Historial de Reparaciones</h1>
                    {vehicle && <h2 className={styles.vehicleSubtitle}>{vehicle.matricula}</h2>}
                </div>
                <div className={styles.headerActions}>
                    {canEdit && (
                        <button className={styles.addButton} onClick={() => setIsAddModalOpen(true)}>
                            <PlusIcon /> Añadir
                        </button>
                    )}
                    <button onClick={() => navigate('/taller')} className={styles.backButton}>
                        <BackIcon /> Volver
                    </button>
                </div>
            </div>

            <div className={styles.searchBar}>
                <SearchIcon />
                <input
                    type="text"
                    placeholder="Buscar por nombre de operación..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                />
            </div>

            {repairs.length > 0 ? (
                <>
                    <div className={styles.repairsList}>
                        {repairs.map(repair => (
                            <div className={styles.repairCard} key={repair.id}>
                                <div className={styles.repairHeader}>
                                    <div className={styles.repairTitle}>
                                        <h4>{repair.nombre_operacion || 'Reparación'}</h4>
                                        <span className={styles.repairDate}>del {new Date(repair.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className={styles.repairMeta}>
                                        {type === 'camion' && repair.kilometri && <span className={styles.repairKilometers}><strong>KM:</strong> {repair.kilometri.toLocaleString('es-ES')}</span>}
                                    </div>
                                </div>
                                <p className={styles.repairDetails}>{repair.detalii}</p>
                            </div>
                        ))}
                    </div>
                    {totalPages > 1 && (
                        <div className={styles.paginationContainer}>
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className={styles.paginationButton}>Anterior</button>
                            <span className={styles.pageIndicator}>Página {currentPage} de {totalPages}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className={styles.paginationButton}>Siguiente</button>
                        </div>
                    )}
                </>
            ) : (
                <p className={styles.noRepairs}>No hay reparaciones registradas para este vehículo.</p>
            )}

            {isAddModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>Añadir Nueva Reparación</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className={styles.modalCloseButton}><CloseIcon /></button>
                        </div>
                        <form onSubmit={handleAddRepair} className={styles.modalForm}>
                            <div className={styles.formGroup}><label>Nombre de Operación</label><input type="text" placeholder="Ej: Cambio de aceite" value={newRepair.nombre_operacion} onChange={(e) => setNewRepair({...newRepair, nombre_operacion: e.target.value})} required /></div>
                            
                            {type === 'camion' && (
                                <div className={styles.formGroup}><label>Kilómetros</label><input type="number" placeholder="Ej: 125000" value={newRepair.kilometri} onChange={(e) => setNewRepair({...newRepair, kilometri: e.target.value})} /></div>
                            )}
                            
                            <div className={styles.formGroupFull}><label>Detalles de la Reparación</label><textarea value={newRepair.detalii} onChange={(e) => setNewRepair({...newRepair, detalii: e.target.value})} required rows="6"></textarea></div>
                            
                            <div className={styles.modalActions}>
                                <button type="button" className={styles.cancelButton} onClick={() => setIsAddModalOpen(false)}>Cancelar</button>
                                <button type="submit" className={styles.saveButton}>Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}

export default ReparatiiPage;

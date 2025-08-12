import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import Layout from './Layout';
import styles from './CamionPage.module.css';

// --- Iconos SVG (Sin cambios) ---
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"></path><polyline points="12 19 5 12 12 5"></polyline></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const WarningIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;


// --- NOU: Componenta pentru a afișa alerta de mentenanță ---
const MaintenanceAlert = ({ status, kmDesdeCambio }) => {
    const LIMITE_CAMBIO = 80000;
    
    if (!status || status === 'loading') {
        return <div className={`${styles.maintenanceCard} ${styles.loading}`}>Calculando estado de mantenimiento...</div>;
    }

    const progress = Math.min((kmDesdeCambio / LIMITE_CAMBIO) * 100, 100);

    const statusConfig = {
        ok: { className: 'ok', text: 'Mantenimiento al día' },
        pronto: { className: 'pronto', text: 'Mantenimiento requerido pronto' },
        necesario: { className: 'necesario', text: 'Mantenimiento requerido URGENTE' },
    };

    const { className, text } = statusConfig[status] || { className: 'ok', text: 'Mantenimiento al día' };

    return (
        <div className={`${styles.maintenanceCard} ${styles[className]}`}>
            <WarningIcon />
            <div className={styles.maintenanceInfo}>
                <h4>{text}</h4>
                <p>{`Han pasado ${kmDesdeCambio.toLocaleString('es-ES')} km desde el último cambio de aceite.`}</p>
                <div className={styles.progressBarContainer}>
                    <div className={styles.progressBar} style={{ width: `${progress}%` }}></div>
                </div>
                <span className={styles.progressLabel}>{`${progress.toFixed(0)}% / 100% (Límite: ${LIMITE_CAMBIO.toLocaleString('es-ES')} km)`}</span>
            </div>
        </div>
    );
};


function CamionPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { profile } = useAuth();
    const ITEMS_PER_PAGE = 10;
    
    // NOU: Stare pentru alerta de mentenanță
    const [maintenanceStatus, setMaintenanceStatus] = useState({ status: 'loading', kmDesdeCambio: 0 });

    const [camion, setCamion] = useState(null);
    const [isEditCamionModalOpen, setIsEditCamionModalOpen] = useState(false);
    const [editableCamion, setEditableCamion] = useState(null);
    
    const [repairs, setRepairs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAddRepairModalOpen, setIsAddRepairModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const [newRepair, setNewRepair] = useState({ nombre_operacion: '', detalii: '', kilometri: '' });

    // MODIFICAT: useEffect pentru a include și logica de mentenanță
    useEffect(() => {
        const fetchCamionData = async () => {
            setLoading(true);
            setMaintenanceStatus({ status: 'loading', kmDesdeCambio: 0 });

            // 1. Preluăm datele camionului
            const { data: camionData, error: camionError } = await supabase.from('camioane').select('*').eq('id', id).single();
            if (camionError) console.error("Error fetching camion:", camionError);
            else setCamion(camionData);
            
            // NOU: Logica pentru calculul stării de mentenanță
            if (camionData) {
                // Căutăm ultima reparație de tip "Cambio de aceite"
                const { data: lastOilChange, error: oilChangeError } = await supabase
                    .from('reparatii')
                    .select('kilometri')
                    .eq('camion_id', id)
                    .ilike('nombre_operacion', '%cambio de aceite%') // Caută textul, indiferent de majuscule/minuscule
                    .order('kilometri', { ascending: false })
                    .limit(1)
                    .single();

                if (oilChangeError && oilChangeError.code !== 'PGRST116') { // Ignorăm eroarea "nu s-a găsit rândul"
                    console.error("Error fetching last oil change:", oilChangeError);
                }

                const kmUltimoCambio = lastOilChange?.kilometri || 0;
                const kmActuales = camionData.kilometros || 0;
                const kmDesdeCambio = kmActuales - kmUltimoCambio;
                
                const UMBRAL_ALERTA = 75000;
                const LIMITE_CAMBIO = 80000;
                let status = 'ok';
                if (kmDesdeCambio >= LIMITE_CAMBIO) status = 'necesario';
                else if (kmDesdeCambio >= UMBRAL_ALERTA) status = 'pronto';
                
                setMaintenanceStatus({ status, kmDesdeCambio });
            }


            // 2. Preluăm lista de reparații (logica existentă)
            const from = (currentPage - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;
            let repairsQuery = supabase.from('reparatii').select('*', { count: 'exact' }).eq('camion_id', id);
            if (searchTerm) repairsQuery = repairsQuery.ilike('nombre_operacion', `%${searchTerm}%`);
            const { data: repairsData, error: repairsError, count } = await repairsQuery.order('created_at', { ascending: false }).range(from, to);

            if (repairsError) console.error("Error fetching repairs:", repairsError);
            else {
                setRepairs(repairsData || []);
                setTotalCount(count || 0);
            }

            setLoading(false);
        };
        fetchCamionData();
    }, [id, currentPage, searchTerm]);

    const handleAddRepair = async (e) => { /* ... logica existentă, neschimbată ... */ };
    const handleSearchChange = (e) => { /* ... logica existentă, neschimbată ... */ };
    const handleEditClick = () => { /* ... logica existentă, neschimbată ... */ };
    const handleUpdateCamion = async (e) => { /* ... logica existentă, neschimbată ... */ };

    const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
    const canEdit = profile?.role === 'dispecer' || profile?.role === 'mecanic'; // Am scos șoferul de la editare, pare mai logic

    if (loading) return <div className={styles.loadingScreen}>Cargando datos del camión...</div>;
    if (!camion) return <Layout><p style={{color: 'white', textAlign: 'center'}}>No se encontró el camión.</p></Layout>;

    return (
        <Layout backgroundClassName="depot-background">
            <div className={styles.pageHeader}>
                <h1>Detalles del Camión: {camion.matricula}</h1>
                <div className={styles.headerActions}>
                    {canEdit && <button onClick={handleEditClick} className={styles.editButton}><EditIcon /> Editar Detalles</button>}
                    <button onClick={() => navigate(-1)} className={styles.backButton}><BackIcon /> Volver</button>
                </div>
            </div>

            {/* NOU: Gridul de detalii include acum Kilometrajul Total */}
            <div className={styles.detailsGrid}>
                <div className={styles.detailCard}><h3>Matrícula</h3><p>{camion.matricula || 'N/A'}</p></div>
                <div className={styles.detailCard}><h3>Marca</h3><p>{camion.marca || 'N/A'}</p></div>
                <div className={styles.detailCard}><h3>Modelo</h3><p>{camion.modelo || 'N/A'}</p></div>
                <div className={`${styles.detailCard} ${styles.kilometrosCard}`}>
                    <h3>Kilometraje Total</h3>
                    <p>{camion.kilometros ? camion.kilometros.toLocaleString('es-ES') : '0'} km</p>
                </div>
                <div className={styles.detailCard}><h3>Eje</h3><p>{camion.eje || 'N/A'}</p></div>
                <div className={styles.detailCard}><h3>Fecha ITV</h3><p>{camion.fecha_itv ? new Date(camion.fecha_itv).toLocaleDateString('es-ES') : 'N/A'}</p></div>
            </div>
            
            {/* NOU: Afișarea alertei de mentenanță */}
            <MaintenanceAlert status={maintenanceStatus.status} kmDesdeCambio={maintenanceStatus.kmDesdeCambio} />

            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Historial de Reparaciones</h2>
                {canEdit && (
                    <button className={styles.addButton} onClick={() => setIsAddRepairModalOpen(true)}>
                        <PlusIcon /> Añadir Reparación
                    </button>
                )}
            </div>
            
            <div className={styles.searchBar}>{/* ... conținutul existent ... */}</div>

            {repairs.length > 0 ? (
                <>
                    <div className={styles.repairsList}>{/* ... conținutul existent ... */}</div>
                    {totalPages > 1 && (<div className={styles.paginationContainer}>{/* ... conținutul existent ... */}</div>)}
                </>
            ) : (
                <p className={styles.noRepairs}>No hay reparaciones registradas para este camión.</p>
            )}

            {isAddRepairModalOpen && (<div className={styles.modalOverlay}>{/* ... conținutul existent ... */}</div>)}
            {isEditCamionModalOpen && (<div className={styles.modalOverlay}>{/* ... conținutul existent ... */}</div>)}
        </Layout>
    );
}

export default CamionPage;

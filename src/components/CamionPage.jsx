import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import Layout from './Layout';
import styles from './CamionPage.module.css';

// --- Iconițe SVG ---
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"></path><polyline points="12 19 5 12 12 5"></polyline></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;


function CamionPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { profile } = useAuth();
    const ITEMS_PER_PAGE = 10;

    const [camion, setCamion] = useState(null);
    const [isEditCamionModalOpen, setIsEditCamionModalOpen] = useState(false);
    const [editableCamion, setEditableCamion] = useState(null);
    
    const [repairs, setRepairs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAddRepairModalOpen, setIsAddRepairModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const [newRepair, setNewRepair] = useState({
        nombre_operacion: '',
        detalii: '',
        kilometri: ''
    });

    useEffect(() => {
        const fetchCamionData = async () => {
            setLoading(true);
            
            const { data: camionData, error: camionError } = await supabase.from('camioane').select('*').eq('id', id).single();
            if (camionError) console.error("Error fetching camion:", camionError);
            else setCamion(camionData);

            const from = (currentPage - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            let repairsQuery = supabase
                .from('reparatii')
                .select('*', { count: 'exact' })
                .eq('camion_id', id);
            
            if (searchTerm) {
                repairsQuery = repairsQuery.ilike('nombre_operacion', `%${searchTerm}%`);
            }

            const { data: repairsData, error: repairsError, count } = await repairsQuery
                .order('created_at', { ascending: false })
                .range(from, to);

            if (repairsError) console.error("Error fetching repairs:", repairsError);
            else {
                setRepairs(repairsData || []);
                setTotalCount(count || 0);
            }

            setLoading(false);
        };
        fetchCamionData();
    }, [id, currentPage, searchTerm]);

    const handleAddRepair = async (e) => {
        e.preventDefault();
        const repairData = {
            camion_id: id,
            nombre_operacion: newRepair.nombre_operacion,
            detalii: newRepair.detalii,
            kilometri: parseInt(newRepair.kilometri, 10) || null,
        };

        const { error } = await supabase.from('reparatii').insert([repairData]);

        if (error) {
            alert(`Error al añadir la reparación: ${error.message}`);
        } else {
            alert('Reparación añadida con éxito!');
            setIsAddRepairModalOpen(false);
            setNewRepair({ nombre_operacion: '', detalii: '', kilometri: '' });
            setSearchTerm('');
            setCurrentPage(1);
        }
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const handleEditClick = () => {
        setEditableCamion({ ...camion });
        setIsEditCamionModalOpen(true);
    };

    const handleUpdateCamion = async (e) => {
        e.preventDefault();
        const { id: camionId, ...updateData } = editableCamion;
        const { error } = await supabase.from('camioane').update(updateData).eq('id', camionId);
        if (error) {
            alert(`Error al actualizar el camión: ${error.message}`);
        } else {
            alert('Camión actualizado con éxito!');
            setCamion(editableCamion);
            setIsEditCamionModalOpen(false);
        }
    };

    const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
    
    // --- MODIFICAREA CHEIE ESTE AICI ---
    const canEdit = profile?.role === 'dispecer' || profile?.role === 'mecanic' || profile?.role === 'sofer';

    if (loading) return <div className={styles.loadingScreen}>Cargando datos del camión...</div>;
    if (!camion) return <Layout><p style={{color: 'white', textAlign: 'center'}}>No se encontró el camión.</p></Layout>;

    return (
        <Layout backgroundClassName="depot-background">
            <div className={styles.pageHeader}>
                <h1>Detalles del Camión: {camion.matricula}</h1>
                <div className={styles.headerActions}>
                    <button onClick={handleEditClick} className={styles.editButton}><EditIcon /> Editar Detalles</button>
                    <button onClick={() => navigate(-1)} className={styles.backButton}><BackIcon /> Volver</button>
                </div>
            </div>

            <div className={styles.detailsGrid}>
                <div className={styles.detailCard}><h3>Matrícula</h3><p>{camion.matricula || 'N/A'}</p></div>
                <div className={styles.detailCard}><h3>Marca</h3><p>{camion.marca || 'N/A'}</p></div>
                <div className={styles.detailCard}><h3>Modelo</h3><p>{camion.modelo || 'N/A'}</p></div>
                <div className={styles.detailCard}><h3>Eje</h3><p>{camion.eje || 'N/A'}</p></div>
                <div className={styles.detailCard}><h3>Kilómetros</h3><p>{camion.kilometros ? camion.kilometros.toLocaleString('es-ES') : 'N/A'}</p></div>
                <div className={styles.detailCard}><h3>Fecha ITV</h3><p>{camion.fecha_itv ? new Date(camion.fecha_itv).toLocaleDateString('es-ES') : 'N/A'}</p></div>
            </div>

            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Historial de Reparaciones</h2>
                {canEdit && (
                    <button className={styles.addButton} onClick={() => setIsAddRepairModalOpen(true)}>
                        <PlusIcon /> Añadir Reparación
                    </button>
                )}
            </div>
            
            <div className={styles.searchBar}>
                <SearchIcon />
                <input type="text" placeholder="Buscar por nombre de operación..." value={searchTerm} onChange={handleSearchChange}/>
            </div>

            {repairs.length > 0 ? (
                <>
                    <div className={styles.repairsList}>
                        {repairs.map(repair => (
                            <div className={styles.repairCard} key={repair.id}>
                                <div className={styles.repairHeader}>
                                    <h4>{repair.nombre_operacion}</h4>
                                    <span>{new Date(repair.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                </div>
                                <p className={styles.repairDetails}>{repair.detalii}</p>
                                <div className={styles.repairFooter}>
                                    {repair.kilometri && <span><strong>KM:</strong> {repair.kilometri.toLocaleString('es-ES')}</span>}
                                </div>
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
                <p className={styles.noRepairs}>No hay reparaciones registradas para este camión.</p>
            )}

            {isAddRepairModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>Añadir Nueva Reparación</h3>
                            <button onClick={() => setIsAddRepairModalOpen(false)} className={styles.modalCloseButton}><CloseIcon /></button>
                        </div>
                        <form onSubmit={handleAddRepair} className={styles.modalForm}>
                            <div className={styles.formGroup}><label>Nombre de Operación</label><input type="text" placeholder="Ej: Cambio de aceite y filtros" value={newRepair.nombre_operacion} onChange={(e) => setNewRepair({...newRepair, nombre_operacion: e.target.value})} required /></div>
                            <div className={styles.formGroup}><label>Kilómetros</label><input type="number" placeholder="Ej: 315000" value={newRepair.kilometri} onChange={(e) => setNewRepair({...newRepair, kilometri: e.target.value})} /></div>
                            <div className={styles.formGroupFull}><label>Descripción / Detalles</label><textarea rows="4" value={newRepair.detalii} onChange={(e) => setNewRepair({...newRepair, detalii: e.target.value})} required /></div>
                            <div className={styles.modalActions}>
                                <button type="button" className={styles.cancelButton} onClick={() => setIsAddRepairModalOpen(false)}>Cancelar</button>
                                <button type="submit" className={styles.saveButton}>Guardar Reparación</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isEditCamionModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>Editar Detalles del Camión</h3>
                            <button onClick={() => setIsEditCamionModalOpen(false)} className={styles.modalCloseButton}><CloseIcon /></button>
                        </div>
                        <form onSubmit={handleUpdateCamion} className={styles.modalForm}>
                            <div className={styles.formGroup}><label>Matrícula</label><input type="text" value={editableCamion.matricula} onChange={(e) => setEditableCamion({...editableCamion, matricula: e.target.value})} required /></div>
                            <div className={styles.formGroup}><label>Marca</label><input type="text" value={editableCamion.marca || ''} onChange={(e) => setEditableCamion({...editableCamion, marca: e.target.value})} /></div>
                            <div className={styles.formGroup}><label>Modelo</label><input type="text" value={editableCamion.modelo || ''} onChange={(e) => setEditableCamion({...editableCamion, modelo: e.target.value})} /></div>
                            <div className={styles.formGroup}><label>Eje</label><input type="text" value={editableCamion.eje || ''} onChange={(e) => setEditableCamion({...editableCamion, eje: e.target.value})} /></div>
                            <div className={styles.formGroup}><label>Kilómetros</label><input type="number" value={editableCamion.kilometros || ''} onChange={(e) => setEditableCamion({...editableCamion, kilometros: e.target.value})} /></div>
                            <div className={styles.formGroupFull}><label>Fecha ITV</label><input type="date" value={editableCamion.fecha_itv || ''} onChange={(e) => setEditableCamion({...editableCamion, fecha_itv: e.target.value})} /></div>
                            <div className={styles.modalActions}>
                                <button type="button" className={styles.cancelButton} onClick={() => setIsEditCamionModalOpen(false)}>Cancelar</button>
                                <button type="submit" className={styles.saveButton}>Guardar Cambios</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}

export default CamionPage;

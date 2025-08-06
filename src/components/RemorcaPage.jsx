import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import Layout from './Layout';
import styles from './RemorcaPage.module.css'; // Asigură-te că acest fișier CSS este o copie a celui actualizat pentru CamionPage

// --- Iconițe SVG ---
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"></path><polyline points="12 19 5 12 12 5"></polyline></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;


function RemorcaPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { profile } = useAuth();
    const ITEMS_PER_PAGE = 10;

    const [remorca, setRemorca] = useState(null);
    const [isEditRemorcaModalOpen, setIsEditRemorcaModalOpen] = useState(false);
    const [editableRemorca, setEditableRemorca] = useState(null);
    
    const [repairs, setRepairs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAddRepairModalOpen, setIsAddRepairModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const [newRepair, setNewRepair] = useState({
        nombre_operacion: '',
        detalii: '',
    });

    useEffect(() => {
        const fetchRemorcaData = async () => {
            setLoading(true);
            
            const { data: remorcaData, error: remorcaError } = await supabase.from('remorci').select('*').eq('id', id).single();
            if (remorcaError) console.error("Error fetching remorca:", remorcaError);
            else setRemorca(remorcaData);

            const from = (currentPage - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            let repairsQuery = supabase
                .from('reparatii')
                .select('*', { count: 'exact' })
                .eq('remorca_id', id);
            
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
        fetchRemorcaData();
    }, [id, currentPage, searchTerm]);

    const handleAddRepair = async (e) => {
        e.preventDefault();
        const repairData = {
            remorca_id: id,
            nombre_operacion: newRepair.nombre_operacion,
            detalii: newRepair.detalii,
            // Kilometri este omis intenționat pentru remorcă
        };

        const { error } = await supabase.from('reparatii').insert([repairData]);

        if (error) {
            alert(`Error al añadir la reparación: ${error.message}`);
        } else {
            alert('Reparación añadida con éxito!');
            setIsAddRepairModalOpen(false);
            setNewRepair({ nombre_operacion: '', detalii: '' });
            setSearchTerm('');
            setCurrentPage(1);
        }
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const handleEditClick = () => {
        setEditableRemorca({ ...remorca });
        setIsEditRemorcaModalOpen(true);
    };

    const handleUpdateRemorca = async (e) => {
        e.preventDefault();
        const { id: remorcaId, ...updateData } = editableRemorca;
        const { error } = await supabase.from('remorci').update(updateData).eq('id', remorcaId);
        if (error) {
            alert(`Error al actualizar la remorca: ${error.message}`);
        } else {
            alert('Remorca actualizada con éxito!');
            setRemorca(editableRemorca);
            setIsEditRemorcaModalOpen(false);
        }
    };

    const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
    const canEdit = profile?.role === 'dispecer' || profile?.role === 'mecanic' || profile?.role === 'sofer';

    if (loading) return <div className={styles.loadingScreen}>Cargando datos de la remorca...</div>;
    if (!remorca) return <Layout><p style={{color: 'white', textAlign: 'center'}}>No se encontró la remorca.</p></Layout>;

    return (
        <Layout backgroundClassName="depot-background">
            <div className={styles.pageHeader}>
                <h1>Detalles de la Remorca: {remorca.matricula}</h1>
                <div className={styles.headerActions}>
                    <button onClick={handleEditClick} className={styles.editButton}><EditIcon /> Editar Detalles</button>
                    <button onClick={() => navigate(-1)} className={styles.backButton}><BackIcon /> Volver</button>
                </div>
            </div>

            <div className={styles.detailsGrid}>
                <div className={styles.detailCard}><h3>Matrícula</h3><p>{remorca.matricula || 'N/A'}</p></div>
                <div className={styles.detailCard}><h3>Fecha ITV</h3><p>{remorca.fecha_itv ? new Date(remorca.fecha_itv).toLocaleDateString('es-ES') : 'N/A'}</p></div>
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
                <p className={styles.noRepairs}>No hay reparaciones registradas para esta remorca.</p>
            )}

            {isAddRepairModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>Añadir Nueva Reparación</h3>
                            <button onClick={() => setIsAddRepairModalOpen(false)} className={styles.modalCloseButton}><CloseIcon /></button>
                        </div>
                        <form onSubmit={handleAddRepair} className={styles.modalForm}>
                            <div className={styles.formGroupFull}><label>Nombre de Operación</label><input type="text" placeholder="Ej: Cambio de luces" value={newRepair.nombre_operacion} onChange={(e) => setNewRepair({...newRepair, nombre_operacion: e.target.value})} required /></div>
                            <div className={styles.formGroupFull}><label>Descripción / Detalles</label><textarea rows="5" value={newRepair.detalii} onChange={(e) => setNewRepair({...newRepair, detalii: e.target.value})} required /></div>
                            <div className={styles.modalActions}>
                                <button type="button" className={styles.cancelButton} onClick={() => setIsAddRepairModalOpen(false)}>Cancelar</button>
                                <button type="submit" className={styles.saveButton}>Guardar Reparación</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isEditRemorcaModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>Editar Detalles de la Remorca</h3>
                            <button onClick={() => setIsEditRemorcaModalOpen(false)} className={styles.modalCloseButton}><CloseIcon /></button>
                        </div>
                        <form onSubmit={handleUpdateRemorca} className={styles.modalForm}>
                            <div className={styles.formGroup}><label>Matrícula</label><input type="text" value={editableRemorca.matricula} onChange={(e) => setEditableRemorca({...editableRemorca, matricula: e.target.value})} required /></div>
                            <div className={styles.formGroup}><label>Fecha ITV</label><input type="date" value={editableRemorca.fecha_itv || ''} onChange={(e) => setEditableRemorca({...editableRemorca, fecha_itv: e.target.value})} /></div>
                            <div className={styles.modalActions}>
                                <button type="button" className={styles.cancelButton} onClick={() => setIsEditRemorcaModalOpen(false)}>Cancelar</button>
                                <button type="submit" className={styles.saveButton}>Guardar Cambios</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}

export default RemorcaPage;

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Layout from './Layout';
import styles from './CamionPage.module.css';

// --- Iconițe SVG ---
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"></path><polyline points="12 19 5 12 12 5"></polyline></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>;


function CamionPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [camion, setCamion] = useState(null);
    const [repairs, setRepairs] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Stare pentru modalul de adăugare reparație
    const [isAddRepairModalOpen, setIsAddRepairModalOpen] = useState(false);
    const [newRepair, setNewRepair] = useState({
        data_reparatie: new Date().toISOString().split('T')[0],
        piesa: '',
        km: '',
        detalii: '',
    });

    // Stare pentru modalul de editare camion
    const [isEditCamionModalOpen, setIsEditCamionModalOpen] = useState(false);
    const [editableCamion, setEditableCamion] = useState(null);

    useEffect(() => {
        const fetchCamionData = async () => {
            setLoading(true);
            
            const { data: camionData, error: camionError } = await supabase.from('camioane').select('*').eq('id', id).single();
            if (camionError) console.error("Error fetching camion:", camionError);
            else setCamion(camionData);

            const { data: repairsData, error: repairsError } = await supabase.from('reparatii').select('*').eq('camion_id', id).order('data_reparatie', { ascending: false });
            if (repairsError) console.error("Error fetching repairs:", repairsError);
            else setRepairs(repairsData || []);

            setLoading(false);
        };
        fetchCamionData();
    }, [id]);

    const handleAddRepair = async (e) => {
        e.preventDefault();
        if (!newRepair.piesa || !newRepair.km || !newRepair.detalii) {
            alert('Todos los campos son obligatorios.');
            return;
        }
        const repairDataToInsert = {
            camion_id: id,
            data_reparatie: newRepair.data_reparatie,
            piesa: newRepair.piesa,
            km: parseInt(newRepair.km, 10),
            detalii: newRepair.detalii,
        };
        const { data: insertedRepair, error } = await supabase.from('reparatii').insert(repairDataToInsert).select().single();
        if (error) {
            alert(`Error al añadir la reparación: ${error.message}`);
        } else {
            setRepairs([insertedRepair, ...repairs]);
            setIsAddRepairModalOpen(false);
            setNewRepair({ data_reparatie: new Date().toISOString().split('T')[0], piesa: '', km: '', detalii: '' });
        }
    };

    const handleEditClick = () => {
        setEditableCamion({ ...camion });
        setIsEditCamionModalOpen(true);
    };

    const handleUpdateCamion = async (e) => {
        e.preventDefault();
        const { id: camionId, ...updateData } = editableCamion;

        const { error } = await supabase
            .from('camioane')
            .update(updateData)
            .eq('id', camionId);

        if (error) {
            alert(`Error al actualizar el camión: ${error.message}`);
        } else {
            alert('Camión actualizado con éxito!');
            setCamion(editableCamion);
            setIsEditCamionModalOpen(false);
        }
    };

    if (loading) return <div className={styles.loadingScreen}>Cargando datos del camión...</div>;
    if (!camion) return <Layout><p style={{color: 'white', textAlign: 'center'}}>No se encontró el camión.</p></Layout>;

    return (
        <Layout backgroundClassName="depot-background">
            <div className={styles.pageHeader}>
                <h1>Detalles del Camión: {camion.matricula}</h1>
                <div className={styles.headerActions}>
                    <button onClick={handleEditClick} className={styles.editButton}>
                        <EditIcon /> Editar Detalles
                    </button>
                    <button onClick={() => navigate(-1)} className={styles.backButton}>
                        <BackIcon /> Volver
                    </button>
                </div>
            </div>

            <div className={styles.detailsGrid}>
                <div className={styles.detailCard}><h3>Matrícula</h3><p>{camion.matricula || 'N/A'}</p></div>
                <div className={styles.detailCard}><h3>Marca</h3><p>{camion.marca || 'N/A'}</p></div>
                <div className={styles.detailCard}><h3>Modelo</h3><p>{camion.modelo || 'N/A'}</p></div>
                <div className={styles.detailCard}><h3>Eje</h3><p>{camion.eje || 'N/A'}</p></div>
                <div className={styles.detailCard}><h3>Fecha ITV</h3><p>{camion.fecha_itv ? new Date(camion.fecha_itv).toLocaleDateString('es-ES') : 'N/A'}</p></div>
            </div>

            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Historial de Reparaciones</h2>
                <button className={styles.addButton} onClick={() => setIsAddRepairModalOpen(true)}>
                    <PlusIcon /> Añadir Reparación
                </button>
            </div>
            
            {repairs.length > 0 ? (
                <div className={styles.repairsList}>
                    {repairs.map(repair => (
                        <div className={styles.repairCard} key={repair.id}>
                            <div className={styles.repairHeader}>
                                <h4>{repair.piesa}</h4>
                                <span>{new Date(repair.data_reparatie).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                            <p className={styles.repairDetails}>{repair.detalii}</p>
                            <div className={styles.repairFooter}>
                                <span><strong>KM:</strong> {repair.km.toLocaleString('es-ES')}</span>
                            </div>
                        </div>
                    ))}
                </div>
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
                            <div className={styles.formGroup}>
                                <label htmlFor="data_reparatie">Fecha de Reparación</label>
                                <input id="data_reparatie" type="date" value={newRepair.data_reparatie} onChange={(e) => setNewRepair({...newRepair, data_reparatie: e.target.value})} required />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="piesa">Pieza Cambiada / Tarea Realizada</label>
                                <input id="piesa" type="text" placeholder="Ej: Cambio de aceite" value={newRepair.piesa} onChange={(e) => setNewRepair({...newRepair, piesa: e.target.value})} required />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="km">Kilómetros</label>
                                <input id="km" type="number" placeholder="Ej: 250000" value={newRepair.km} onChange={(e) => setNewRepair({...newRepair, km: e.target.value})} required />
                            </div>
                            <div className={styles.formGroupFull}>
                                <label htmlFor="detalii">Descripción / Detalles</label>
                                <textarea id="detalii" rows="4" value={newRepair.detalii} onChange={(e) => setNewRepair({...newRepair, detalii: e.target.value})} required />
                            </div>
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

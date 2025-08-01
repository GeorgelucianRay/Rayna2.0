import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Layout from './Layout';
import styles from './CamionPage.module.css';
import reparatiiStyles from './ReparatiiPage.module.css';

// --- Iconițe SVG ---
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"></path><polyline points="12 19 5 12 12 5"></polyline></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>;

function CamionPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [camion, setCamion] = useState(null);
    const [repairs, setRepairs] = useState([]);
    const [loading, setLoading] = useState(true);

    // MODIFICAT: Starea formularului cu noile câmpuri
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newRepair, setNewRepair] = useState({
        data_reparatie: new Date().toISOString().split('T')[0], // Data de azi ca valoare implicită
        piesa: '',
        km: '',
        detalii: '',
    });

    useEffect(() => {
        const fetchCamionData = async () => {
            setLoading(true);
            
            const { data: camionData, error: camionError } = await supabase.from('camioane').select('*').eq('id', id).single();
            if (camionError) console.error("Error fetching camion:", camionError);
            else setCamion(camionData);

            // MODIFICAT: sortare după `data_reparatie`
            const { data: repairsData, error: repairsError } = await supabase.from('reparatii').select('*').eq('camion_id', id).order('data_reparatie', { ascending: false });
            if (repairsError) console.error("Error fetching repairs:", repairsError);
            else setRepairs(repairsData || []);

            setLoading(false);
        };
        fetchCamionData();
    }, [id]);

    // MODIFICAT: Logica de adăugare pentru noile câmpuri
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
            setIsModalOpen(false);
            setNewRepair({ data_reparatie: new Date().toISOString().split('T')[0], piesa: '', km: '', detalii: '' });
        }
    };

    if (loading) return <div className="loading-screen">Cargando datos del camión...</div>;
    if (!camion) return <Layout><p style={{color: 'white', textAlign: 'center'}}>No se encontró el camión.</p></Layout>;

    return (
        <Layout backgroundClassName="depot-background">
            <div className={styles.pageHeader}>
                {/* TRADUS */}
                <h1>Detalles del Camión: {camion.matricula}</h1>
                <button onClick={() => navigate(-1)} className={styles.backButton}>
                    <BackIcon /> Volver
                </button>
            </div>

            {/* RESTAURAT: Afișarea detaliilor camionului */}
            <div className={styles.detailsGrid}>
                <div className={styles.detailCard}>
                    <h3>Matrícula</h3>
                    <p>{camion.matricula}</p>
                </div>
                <div className={styles.detailCard}>
                    <h3>Fecha ITV</h3>
                    <p>{camion.fecha_itv ? new Date(camion.fecha_itv).toLocaleDateString('es-ES') : 'N/A'}</p>
                </div>
            </div>

            {/* TRADUS */}
            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Historial de Reparaciones</h2>
                <button className={styles.addButton} onClick={() => setIsModalOpen(true)}>
                    <PlusIcon /> Añadir Reparación
                </button>
            </div>
            
            {repairs.length > 0 ? (
                <div className={reparatiiStyles.repairsList}>
                    {repairs.map(repair => (
                        // MODIFICAT: Afișarea noilor detalii pentru reparații
                        <div className={reparatiiStyles.repairCard} key={repair.id}>
                            <div className={reparatiiStyles.repairHeader}>
                                <h4>{repair.piesa}</h4>
                                <span>{new Date(repair.data_reparatie).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                            <p className={reparatiiStyles.repairDetails}>{repair.detalii}</p>
                            <div className={reparatiiStyles.repairFooter}>
                                <span><strong>KM:</strong> {repair.km.toLocaleString('es-ES')}</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className={reparatiiStyles.noRepairs}>No hay reparaciones registradas para este camión.</p>
            )}

            {/* MODIFICAT: Formularul din modal actualizat și tradus */}
            {isModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h3>Añadir Nueva Reparación</h3>
                        <form onSubmit={handleAddRepair}>
                            <div className={styles.inputGroup}>
                                <label htmlFor="data_reparatie">Fecha de Reparación</label>
                                <input id="data_reparatie" type="date" value={newRepair.data_reparatie} onChange={(e) => setNewRepair({...newRepair, data_reparatie: e.target.value})} required />
                            </div>
                            <div className={styles.inputGroup}>
                                <label htmlFor="piesa">Pieza Cambiada / Tarea Realizada</label>
                                <input id="piesa" type="text" value={newRepair.piesa} onChange={(e) => setNewRepair({...newRepair, piesa: e.target.value})} required />
                            </div>
                            <div className={styles.inputGroup}>
                                <label htmlFor="km">Kilómetros</label>
                                <input id="km" type="number" placeholder="Ej: 250000" value={newRepair.km} onChange={(e) => setNewRepair({...newRepair, km: e.target.value})} required />
                            </div>
                            <div className={styles.inputGroup}>
                                <label htmlFor="detalii">Descripción / Detalles</label>
                                <textarea id="detalii" rows="4" value={newRepair.detalii} onChange={(e) => setNewRepair({...newRepair, detalii: e.target.value})} required />
                            </div>
                            <div className={styles.modalActions}>
                                <button type="button" className={styles.cancelButton} onClick={() => setIsModalOpen(false)}>Cancelar</button>
                                <button type="submit" className={styles.saveButton}>Guardar Reparación</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}

export default CamionPage;

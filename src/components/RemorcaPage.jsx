import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Layout from './Layout';
import styles from './RemorcaPage.module.css'; // Folosim stiluri dedicate pentru remorcă
import reparatiiStyles from './ReparatiiPage.module.css'; // Refolosim stilurile pentru lista de reparații

// --- Iconițe SVG ---
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"></path><polyline points="12 19 5 12 12 5"></polyline></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>;

function RemorcaPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [remorca, setRemorca] = useState(null);
    const [repairs, setRepairs] = useState([]);
    const [loading, setLoading] = useState(true);

    // ADAPTAT: Starea formularului FĂRĂ kilometri
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newRepair, setNewRepair] = useState({
        data_reparatie: new Date().toISOString().split('T')[0],
        piesa: '',
        detalii: '',
    });

    useEffect(() => {
        const fetchRemorcaData = async () => {
            setLoading(true);
            
            const { data: remorcaData, error: remorcaError } = await supabase.from('remorci').select('*').eq('id', id).single();
            if (remorcaError) console.error("Error fetching remorca:", remorcaError);
            else setRemorca(remorcaData);

            // ADAPTAT: Preluarea reparațiilor pentru 'remorca_id'
            const { data: repairsData, error: repairsError } = await supabase.from('reparatii').select('*').eq('remorca_id', id).order('data_reparatie', { ascending: false });
            if (repairsError) console.error("Error fetching repairs:", repairsError);
            else setRepairs(repairsData || []);

            setLoading(false);
        };
        fetchRemorcaData();
    }, [id]);

    // ADAPTAT: Logica de adăugare FĂRĂ kilometri
    const handleAddRepair = async (e) => {
        e.preventDefault();
        if (!newRepair.piesa || !newRepair.detalii) {
            alert('Todos los campos son obligatorios.');
            return;
        }
        const repairDataToInsert = {
            remorca_id: id,
            data_reparatie: newRepair.data_reparatie,
            piesa: newRepair.piesa,
            detalii: newRepair.detalii,
        };
        const { data: insertedRepair, error } = await supabase.from('reparatii').insert(repairDataToInsert).select().single();
        if (error) {
            alert(`Error al añadir la reparación: ${error.message}`);
        } else {
            setRepairs([insertedRepair, ...repairs]);
            setIsModalOpen(false);
            setNewRepair({ data_reparatie: new Date().toISOString().split('T')[0], piesa: '', detalii: '' });
        }
    };

    if (loading) return <div className="loading-screen">Cargando datos de la remorca...</div>;
    if (!remorca) return <Layout><p style={{color: 'white', textAlign: 'center'}}>No se encontró la remorca.</p></Layout>;

    return (
        <Layout backgroundClassName="depot-background">
            <div className={styles.pageHeader}>
                <h1>Detalles de la Remorca: {remorca.matricula}</h1>
                <button onClick={() => navigate(-1)} className={styles.backButton}>
                    <BackIcon /> Volver
                </button>
            </div>

            <div className={styles.detailsGrid}>
                <div className={styles.detailCard}>
                    <h3>Matrícula</h3>
                    <p>{remorca.matricula}</p>
                </div>
                <div className={styles.detailCard}>
                    <h3>Fecha ITV</h3>
                    <p>{remorca.fecha_itv ? new Date(remorca.fecha_itv).toLocaleDateString('es-ES') : 'N/A'}</p>
                </div>
            </div>

            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Historial de Reparaciones</h2>
                <button className={styles.addButton} onClick={() => setIsModalOpen(true)}>
                    <PlusIcon /> Añadir Reparación
                </button>
            </div>
            
            {repairs.length > 0 ? (
                <div className={reparatiiStyles.repairsList}>
                    {repairs.map(repair => (
                        <div className={reparatiiStyles.repairCard} key={repair.id}>
                            <div className={reparatiiStyles.repairHeader}>
                                <h4>{repair.piesa}</h4>
                                <span>{new Date(repair.data_reparatie).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                            <p className={reparatiiStyles.repairDetails}>{repair.detalii}</p>
                            {/* ELIMINAT: Footer-ul cu kilometri nu mai este necesar aici */}
                        </div>
                    ))}
                </div>
            ) : (
                <p className={reparatiiStyles.noRepairs}>No hay reparaciones registradas para esta remorca.</p>
            )}

            {/* ADAPTAT: Formularul din modal FĂRĂ kilometri */}
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

export default RemorcaPage;

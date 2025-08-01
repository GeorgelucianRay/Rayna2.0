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

    // NOU: Stări pentru modalul de adăugare reparație
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newRepair, setNewRepair] = useState({ data: '', detalii: '', cost: '' });

    useEffect(() => {
        const fetchCamionData = async () => {
            setLoading(true);

            const { data: camionData, error: camionError } = await supabase
                .from('camioane')
                .select('*')
                .eq('id', id)
                .single();
            
            if (camionError) console.error("Error fetching camion:", camionError);
            else setCamion(camionData);

            const { data: repairsData, error: repairsError } = await supabase
                .from('reparatii')
                .select('*')
                .eq('camion_id', id)
                .order('data', { ascending: false });

            if (repairsError) console.error("Error fetching repairs:", repairsError);
            else setRepairs(repairsData || []);

            setLoading(false);
        };

        fetchCamionData();
    }, [id]);

    // NOU: Funcția pentru a gestiona adăugarea unei reparații
    const handleAddRepair = async (e) => {
        e.preventDefault();
        if (!newRepair.data || !newRepair.detalii) {
            alert('Data și detaliile reparației sunt obligatorii.');
            return;
        }

        const repairDataToInsert = {
            camion_id: id,
            data: newRepair.data,
            detalii: newRepair.detalii,
            cost: newRepair.cost ? parseFloat(newRepair.cost) : null,
        };

        const { data: insertedRepair, error } = await supabase
            .from('reparatii')
            .insert(repairDataToInsert)
            .select()
            .single();

        if (error) {
            alert(`Eroare la adăugarea reparației: ${error.message}`);
        } else {
            // Actualizăm lista de reparații local pentru a reflecta schimbarea imediat
            setRepairs([insertedRepair, ...repairs]);
            setIsModalOpen(false); // Închidem modalul
            setNewRepair({ data: '', detalii: '', cost: '' }); // Resetăm formularul
        }
    };

    if (loading) {
        return <div className="loading-screen">Cargando datos del camión...</div>;
    }

    if (!camion) {
        return (
            <Layout backgroundClassName="depot-background">
                <p style={{color: 'white', textAlign: 'center'}}>No se encontró el camión.</p>
            </Layout>
        );
    }

    return (
        <Layout backgroundClassName="depot-background">
            <div className={styles.pageHeader}>
                <h1>Detalles Camión: {camion.matricula}</h1>
                <button onClick={() => navigate(-1)} className={styles.backButton}>
                    <BackIcon /> Volver
                </button>
            </div>

            <div className={styles.detailsGrid}>
                {/* ... cardurile cu detalii camion ... */}
            </div>
            
            {/* MODIFICAT: Adăugat butonul de adăugare */}
            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Historial de Reparaciones</h2>
                <button className={styles.addButton} onClick={() => setIsModalOpen(true)}>
                    <PlusIcon /> Adaugă Reparație
                </button>
            </div>
            
            {repairs.length > 0 ? (
                <div className={reparatiiStyles.repairsList}>
                    {/* ... lista de reparații existente ... */}
                </div>
            ) : (
                <p className={reparatiiStyles.noRepairs}>No hay reparaciones registradas para este camión.</p>
            )}

            {/* NOU: Modalul pentru adăugarea unei reparații noi */}
            {isModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h3>Adaugă o Reparație Nouă</h3>
                        <form onSubmit={handleAddRepair}>
                            <div className={styles.inputGroup}>
                                <label htmlFor="data">Data Reparației</label>
                                <input id="data" type="date" value={newRepair.data} onChange={(e) => setNewRepair({...newRepair, data: e.target.value})} required />
                            </div>
                            <div className={styles.inputGroup}>
                                <label htmlFor="detalii">Detalii / Descriere</label>
                                <textarea id="detalii" rows="4" value={newRepair.detalii} onChange={(e) => setNewRepair({...newRepair, detalii: e.target.value})} required />
                            </div>
                            <div className={styles.inputGroup}>
                                <label htmlFor="cost">Cost (€)</label>
                                <input id="cost" type="number" step="0.01" placeholder="Opțional" value={newRepair.cost} onChange={(e) => setNewRepair({...newRepair, cost: e.target.value})} />
                            </div>
                            <div className={styles.modalActions}>
                                <button type="button" className={styles.cancelButton} onClick={() => setIsModalOpen(false)}>Anulează</button>
                                <button type="submit" className={styles.saveButton}>Salvează Reparația</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}

export default CamionPage;

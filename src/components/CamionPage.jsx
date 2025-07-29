import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Layout from './Layout';
import styles from './CamionPage.module.css'; // Importăm ca modul
import reparatiiStyles from './ReparatiiPage.module.css'; // Refolosim stiluri

// --- Iconițe SVG ---
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"></path><polyline points="12 19 5 12 12 5"></polyline></svg>;

function CamionPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [camion, setCamion] = useState(null);
    const [repairs, setRepairs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCamionData = async () => {
            setLoading(true);

            // Fetch camion details
            const { data: camionData, error: camionError } = await supabase
                .from('camioane')
                .select('*')
                .eq('id', id)
                .single();
            
            if (camionError) {
                console.error("Error fetching camion:", camionError);
            } else {
                setCamion(camionData);
            }

            // Fetch repairs for the camion
            const { data: repairsData, error: repairsError } = await supabase
                .from('reparatii')
                .select('*')
                .eq('camion_id', id)
                .order('data', { ascending: false });

            if (repairsError) {
                console.error("Error fetching repairs:", repairsError);
            } else {
                setRepairs(repairsData || []);
            }

            setLoading(false);
        };

        fetchCamionData();
    }, [id]);

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
                <div className={styles.detailCard}>
                    <h3>Matrícula</h3>
                    <p>{camion.matricula}</p>
                </div>
                <div className={styles.detailCard}>
                    <h3>Fecha ITV</h3>
                    <p>{camion.fecha_itv || 'N/A'}</p>
                </div>
                {/* Adăugați aici alte carduri pentru alte detalii ale camionului */}
            </div>

            <h2 className={styles.sectionTitle}>Historial de Reparaciones</h2>
            
            {repairs.length > 0 ? (
                <div className={reparatiiStyles.repairsList}>
                    {repairs.map(repair => (
                        <div className={reparatiiStyles.repairCard} key={repair.id}>
                            <div className={reparatiiStyles.repairHeader}>
                                <h4>Reparación del {new Date(repair.data).toLocaleDateString()}</h4>
                                <span><strong>Coste:</strong> {repair.cost} €</span>
                            </div>
                            <p className={reparatiiStyles.repairDetails}>{repair.detalii}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <p className={reparatiiStyles.noRepairs}>No hay reparaciones registradas para este camión.</p>
            )}
        </Layout>
    );
}

export default CamionPage;

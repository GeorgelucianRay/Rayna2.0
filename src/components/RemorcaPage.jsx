import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Layout from './Layout';
import styles from './RemorcaPage.module.css'; // Importăm ca modul
import reparatiiStyles from './ReparatiiPage.module.css'; // Refolosim stiluri

// --- Iconițe SVG ---
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"></path><polyline points="12 19 5 12 12 5"></polyline></svg>;

function RemorcaPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [remorca, setRemorca] = useState(null);
    const [repairs, setRepairs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRemorcaData = async () => {
            setLoading(true);

            // Fetch remorca details
            const { data: remorcaData, error: remorcaError } = await supabase
                .from('remorci')
                .select('*')
                .eq('id', id)
                .single();
            
            if (remorcaError) {
                console.error("Error fetching remorca:", remorcaError);
            } else {
                setRemorca(remorcaData);
            }

            // Fetch repairs for the remorca
            const { data: repairsData, error: repairsError } = await supabase
                .from('reparatii')
                .select('*')
                .eq('remorca_id', id)
                .order('data', { ascending: false });

            if (repairsError) {
                console.error("Error fetching repairs:", repairsError);
            } else {
                setRepairs(repairsData || []);
            }

            setLoading(false);
        };

        fetchRemorcaData();
    }, [id]);

    if (loading) {
        return <div className="loading-screen">Cargando datos de la remorca...</div>;
    }

    if (!remorca) {
        return (
            <Layout backgroundClassName="depot-background">
                <p style={{color: 'white', textAlign: 'center'}}>No se encontró la remorca.</p>
            </Layout>
        );
    }

    return (
        <Layout backgroundClassName="depot-background">
            <div className={styles.pageHeader}>
                <h1>Detalles Remorca: {remorca.matricula}</h1>
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
                    <p>{remorca.fecha_itv || 'N/A'}</p>
                </div>
                {/* Adăugați aici alte carduri pentru alte detalii ale remorcii */}
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
                <p className={reparatiiStyles.noRepairs}>No hay reparaciones registradas para esta remorca.</p>
            )}
        </Layout>
    );
}

export default RemorcaPage;

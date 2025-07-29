import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Layout from './Layout';
import styles from './TallerPage.module.css'; // Importăm ca modul

function TallerPage() {
    const [camioane, setCamioane] = useState([]);
    const [remorci, setRemorci] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVehicles = async () => {
            setLoading(true);
            const { data: camioaneData, error: camioaneError } = await supabase.from('camioane').select('*');
            if (camioaneError) console.error("Error fetching camioane:", camioaneError);
            else setCamioane(camioaneData || []);

            const { data: remorciData, error: remorciError } = await supabase.from('remorci').select('*');
            if (remorciError) console.error("Error fetching remorci:", remorciError);
            else setRemorci(remorciData || []);
            
            setLoading(false);
        };
        fetchVehicles();
    }, []);

    if (loading) {
        return <div className="loading-screen">Cargando...</div>;
    }

    return (
        <Layout backgroundClassName="taller-background">
            <div className={styles.pageHeader}>
                <h1>Taller</h1>
            </div>

            <section>
                <h2 className={styles.sectionTitle}>Camioane</h2>
                <div className={styles.vehicleGrid}>
                    {camioane.map(camion => (
                        <Link to={`/reparatii/camion/${camion.id}`} key={camion.id} className={styles.vehicleCard}>
                            <h3>{camion.matricula}</h3>
                            <p>Ver historial de reparaciones</p>
                        </Link>
                    ))}
                </div>
            </section>

            <section style={{ marginTop: '3rem' }}>
                <h2 className={styles.sectionTitle}>Remorci</h2>
                <div className={styles.vehicleGrid}>
                    {remorci.map(remorca => (
                        <Link to={`/reparatii/remorca/${remorca.id}`} key={remorca.id} className={styles.vehicleCard}>
                            <h3>{remorca.matricula}</h3>
                            <p>Ver historial de reparaciones</p>
                        </Link>
                    ))}
                </div>
            </section>
        </Layout>
    );
}

export default TallerPage;

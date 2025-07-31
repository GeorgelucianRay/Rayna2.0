import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import Layout from './Layout';
import styles from './ChoferesPage.module.css';
import depotStyles from './DepotPage.module.css';

// --- Iconițe SVG ---
const AlarmIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="M12 8v4l2 2"></path><path d="M19.94 15.5a.5.5 0 0 0 .06.7l.6.6a.5.5 0 0 0 .7-.06l1.42-1.42a.5.5 0 0 0-.06-.7l-.6-.6a.5.5 0 0 0-.7.06z"></path><path d="M4.06 15.5a.5.5 0 0 1-.06.7l-.6.6a.5.5 0 0 1-.7-.06L1.28 15.4a.5.5 0 0 1 .06-.7l.6-.6a.5.5 0 0 1 .7.06z"></path><path d="M12 4V2"></path><path d="M12 22v-2"></path></svg>;
const SearchIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>;

function ChoferesPage() {
    const [drivers, setDrivers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const { alarms, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchDrivers = async () => {
            const { data: profilesData, error } = await supabase
                .from('profiles')
                .select('*, camioane:camion_id(matricula), remorci:remorca_id(matricula)')
                .eq('role', 'sofer');
            
            if (error) {
                console.error("Eroare la preluarea șoferilor:", error.message);
            } else {
                setDrivers(profilesData || []);
            }
        };

        // Așteptăm ca starea de încărcare din context să se termine
        if (!loading) {
            fetchDrivers();
        }
    }, [loading]);

    // Folosim useMemo pentru a optimiza filtrarea pe liste mari
    const filteredDrivers = useMemo(() => {
        if (!searchTerm) {
            return drivers;
        }
        return drivers.filter(d =>
            d.nombre_completo && d.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [drivers, searchTerm]);


    if (loading) {
        // CORECTAT: Folosim clasa din modulul CSS
        return <div className={styles.loadingScreen}>Cargando...</div>;
    }

    return (
        <Layout backgroundClassName="profile-background">
            {/* CORECTAT: Folosim clasa din modulul CSS */}
            <div className={styles.profileHeader}>
                <h1>Administración de Choferes</h1>
            </div>

            {alarms.length > 0 && (
                <div className={styles.alarmSection}>
                    <div className={styles.alarmHeader}><AlarmIcon /><h3>Alertas de Caducidad</h3></div>
                    <ul>
                        {alarms.map((alarm, index) => (
                            <li key={index}>{alarm.message}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className={depotStyles.toolbar}>
                <div className={depotStyles.searchBar}>
                    <SearchIcon />
                    <input type="text" placeholder="Buscar chofer por nombre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
            </div>

            <div className={styles.choferesGrid}>
                {filteredDrivers.map(driver => (
                    <div className={styles.choferCard} key={driver.id} onClick={() => navigate(`/chofer/${driver.id}`)}>
                        <h4>{driver.nombre_completo || 'Nombre desconocido'}</h4>
                        <p>Camión: {driver.camioane?.matricula || 'N/A'}</p>
                        <p>Remolque: {driver.remorci?.matricula || 'N/A'}</p>
                    </div>
                ))}
            </div>
        </Layout>
    );
}

export default ChoferesPage;

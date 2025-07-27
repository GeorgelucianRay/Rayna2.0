import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import Layout from './Layout';
import './ChoferesPage.css';
import './MiPerfilPage.css'; // Reutilizăm stilurile

const AlarmIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="M12 8v4l2 2"></path><path d="M19.94 15.5a.5.5 0 0 0 .06.7l.6.6a.5.5 0 0 0 .7-.06l1.42-1.42a.5.5 0 0 0-.06-.7l-.6-.6a.5.5 0 0 0-.7.06z"></path><path d="M4.06 15.5a.5.5 0 0 1-.06.7l-.6.6a.5.5 0 0 1-.7-.06L1.28 15.4a.5.5 0 0 1 .06-.7l.6-.6a.5.5 0 0 1 .7.06z"></path><path d="M12 4V2"></path><path d="M12 22v-2"></path></svg>;
const SearchIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>;

function ChoferesPage() {
    const [drivers, setDrivers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const { alarms, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchDrivers = async () => {
            // MODIFICARE: Am făcut interogarea explicită pentru a se potrivi cu structura bazei de date.
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

        if (!loading) {
            fetchDrivers();
        }
    }, [loading]);

    if (loading) {
        return <div className="loading-screen">Cargando...</div>;
    }

    const filteredDrivers = drivers.filter(d =>
        d.nombre_completo && d.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Layout backgroundClassName="profile-background">
            <main className="main-content">
                <div className="profile-header">
                    <h1>Administración de Choferes</h1>
                </div>

                {alarms.length > 0 && (
                    <div className="alarm-section">
                        <div className="alarm-header"><AlarmIcon /><h3>Alertas de Caducidad</h3></div>
                        <ul>
                            {alarms.map((alarm, index) => (
                                <li key={index}>{alarm.message}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="toolbar">
                    <div className="search-bar">
                        <SearchIcon />
                        <input type="text" placeholder="Buscar chofer por nombre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </div>

                <div className="choferes-grid">
                    {filteredDrivers.map(driver => (
                        <div className="chofer-card" key={driver.id} onClick={() => navigate(`/chofer/${driver.id}`)}>
                            <h4>{driver.nombre_completo || 'Nombre desconocido'}</h4>
                            <p>Camión: {driver.camioane?.matricula || 'N/A'}</p>
                            <p>Remolque: {driver.remorci?.matricula || 'N/A'}</p>
                        </div>
                    ))}
                </div>
            </main>
        </Layout>
    );
}

export default ChoferesPage;
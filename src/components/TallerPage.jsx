import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Layout from './Layout';
import './TallerPage.css';

const SearchIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>;

// --- Componenta pentru afișarea listei de vehicule ---
const VehicleList = ({ type, data, displayName }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    const filteredData = data.filter(item =>
        item.matricula && item.matricula.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCardClick = (id) => {
        navigate(`/reparatii/${type}/${id}`);
    };

    return (
        <>
            <div className="toolbar">
                <div className="search-bar">
                    <SearchIcon />
                    <input type="text" placeholder={`Buscar ${displayName} por matrícula...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
            </div>
            <div className="vehicle-grid">
                {filteredData.map(item => (
                    <div className="vehicle-card" key={item.id} onClick={() => handleCardClick(item.id)}>
                        <h3>{item.matricula}</h3>
                        <p>{type === 'camion' ? `${item.marca || ''} ${item.modelo || ''}` : item.tipo || ''}</p>
                    </div>
                ))}
            </div>
        </>
    );
};

// --- Componenta Principală Taller ---
function TallerPage() {
    const [activeView, setActiveView] = useState('camiones');
    const [camioane, setCamioane] = useState([]);
    const [remorci, setRemorci] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            const { data: camioaneData } = await supabase.from('camioane').select('*');
            const { data: remorciData } = await supabase.from('remorci').select('*');
            setCamioane(camioaneData || []);
            setRemorci(remorciData || []);
        };
        fetchData();
    }, []);

    return (
        <Layout backgroundClassName="taller-background">
            <main className="main-content">
                <div className="depot-header">
                    <button className={`depot-tab-button ${activeView === 'camiones' ? 'active' : ''}`} onClick={() => setActiveView('camiones')}>Camiones</button>
                    <button className={`depot-tab-button ${activeView === 'remolques' ? 'active' : ''}`} onClick={() => setActiveView('remolques')}>Remolques</button>
                </div>
                
                {activeView === 'camiones' && <VehicleList type="camion" data={camioane} displayName="camión" />}
                {activeView === 'remolques' && <VehicleList type="remorca" data={remorci} displayName="remolque" />}
            </main>
        </Layout>
    );
}

export default TallerPage;
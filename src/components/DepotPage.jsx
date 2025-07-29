import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Layout from './Layout';
import styles from './DepotPage.module.css'; // Importăm ca modul

// --- Iconițe SVG ---
const SearchIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>;
const PlusIcon = () => <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"></path></svg>;

const ITEMS_PER_PAGE = 25;

function DepotPage() {
    const [activeTab, setActiveTab] = useState('contenedores');
    const [containers, setContainers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        const fetchContainers = async () => {
            setLoading(true);
            const from = (currentPage - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            let query = supabase.from(activeTab).select('*', { count: 'exact' });

            if (searchTerm) {
                query = query.ilike('id_container', `%${searchTerm}%`);
            }

            const { data, error, count } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) {
                console.error(`Error fetching ${activeTab}:`, error);
            } else {
                setContainers(data || []);
                setTotalCount(count || 0);
            }
            setLoading(false);
        };

        fetchContainers();
    }, [activeTab, currentPage, searchTerm]);

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setCurrentPage(1); // Resetăm la prima pagină la schimbarea tab-ului
        setSearchTerm('');
    };

    return (
        <Layout backgroundClassName="depot-background">
            <div className={styles.depotHeader}>
                <button className={`${styles.depotTabButton} ${activeTab === 'contenedores' ? styles.active : ''}`} onClick={() => handleTabChange('contenedores')}>En Depósito</button>
                <button className={`${styles.depotTabButton} ${activeTab === 'contenedores_rotos' ? styles.active : ''}`} onClick={() => handleTabChange('contenedores_rotos')}>Defectos</button>
                <button className={`${styles.depotTabButton} ${activeTab === 'contenedores_salidos' ? styles.active : ''}`} onClick={() => handleTabChange('contenedores_salidos')}>Salidos</button>
            </div>

            <div className={styles.toolbar}>
                <div className={styles.searchBar}>
                    <SearchIcon />
                    <input type="text" placeholder="Buscar por ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                {/* Aici va veni butonul de adăugare și logica modalului */}
            </div>

            {loading ? (
                <p style={{ color: 'white', textAlign: 'center' }}>Cargando...</p>
            ) : (
                <>
                    <div className={styles.containersGrid}>
                        {containers.map(container => (
                            <div key={container.id} className={styles.containerCard}>
                                <div className={styles.cardHeader}>
                                    <h3 className={styles.cardMatricula}>{container.id_container}</h3>
                                    {/* Aici puteți adăuga logica pentru tipul containerului */}
                                </div>
                                <div className={styles.cardBody}>
                                    <p><strong>Fecha de entrada:</strong> {new Date(container.created_at).toLocaleDateString()}</p>
                                    {container.problema && <p><strong>Problema:</strong> {container.problema}</p>}
                                </div>
                                <div className={styles.cardFooter}>
                                    {/* Aici vor veni butoanele de editare/mutare */}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className={styles.paginationContainer}>
                        <button 
                            className={styles.paginationButton} 
                            onClick={() => setCurrentPage(p => p - 1)} 
                            disabled={currentPage === 1}
                        >
                            Anterior
                        </button>
                        <span className={styles.pageIndicator}>Página {currentPage} de {totalPages}</span>
                        <button 
                            className={styles.paginationButton} 
                            onClick={() => setCurrentPage(p => p + 1)} 
                            disabled={currentPage >= totalPages}
                        >
                            Siguiente
                        </button>
                    </div>
                </>
            )}
        </Layout>
    );
}

export default DepotPage;

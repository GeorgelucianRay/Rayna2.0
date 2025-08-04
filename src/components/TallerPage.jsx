import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Layout from './Layout';
import styles from './TallerPage.module.css';

// Icoană pentru bara de căutare
const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

function TallerPage() {
  const ITEMS_PER_PAGE = 10;
  // MODIFICARE: Folosim numele la singular pentru tabele
  const [activeTab, setActiveTab] = useState('camion');
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState(null);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase.from(activeTab).select('*', { count: 'exact' });

      if (searchTerm) {
        query = query.ilike('matricula', `%${searchTerm}%`);
      }
      
      const { data, error: queryError, count } = await query.range(from, to);

      if (queryError) {
        throw queryError;
      }

      setVehicles(data || []);
      setTotalCount(count || 0);

    } catch (err) {
      console.error(`Error fetching data from '${activeTab}':`, err);
      setError(`A apărut o eroare: ${err.message}. Verificați consola și regulile de securitate (RLS) din Supabase.`);
      setVehicles([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentPage, searchTerm]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSearchTerm('');
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  return (
    <Layout backgroundClassName="taller-background">
      <div className={styles.pageHeader}>
        <h1>Taller</h1>
      </div>

      <div className={styles.controlsHeader}>
        <div className={styles.tabContainer}>
          <button
            className={`${styles.tabButton} ${activeTab === 'camion' ? styles.active : ''}`}
            onClick={() => handleTabChange('camion')}
          >
            Camiones
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'remorca' ? styles.active : ''}`}
            onClick={() => handleTabChange('remorca')}
          >
            Remolques
          </button>
        </div>
        <div className={styles.searchBar}>
          <SearchIcon />
          <input
            type="text"
            placeholder="Buscar por matrícula..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {/* Afișare conținut */}
      {loading ? (
        <div className={styles.loadingText}>Cargando vehículos...</div>
      ) : error ? (
        <div className={styles.noDataText} style={{ color: '#ef4444' }}>{error}</div>
      ) : vehicles.length === 0 ? (
        <div className={styles.noDataText}>No se encontraron vehículos.</div>
      ) : (
        <>
          <div className={styles.vehicleGrid}>
            {vehicles.map(vehicle => (
              // MODIFICARE: Logica pentru link este acum mai simplă
              <Link to={`/reparatii/${activeTab}/${vehicle.id}`} key={vehicle.id} className={styles.vehicleCard}>
                <h3>{vehicle.matricula}</h3>
                <p>Ver historial de reparaciones</p>
              </Link>
            ))}
          </div>

          <div className={styles.paginationContainer}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={styles.paginationButton}
            >
              Anterior
            </button>
            <span className={styles.pageIndicator}>
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className={styles.paginationButton}
            >
              Siguiente
            </button>
          </div>
        </>
      )}
    </Layout>
  );
}

export default TallerPage;

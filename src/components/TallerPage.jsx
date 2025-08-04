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
  const [activeTab, setActiveTab] = useState('camioane'); // 'camioane' sau 'remolques'
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Funcție pentru a prelua vehiculele din Supabase cu paginare și căutare
  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase.from(activeTab).select('*', { count: 'exact' });

      if (searchTerm) {
        // Căutăm în coloana 'matricula'
        query = query.ilike('matricula', `%${searchTerm}%`);
      }

      // Asigură-te că ai o coloană 'created_at' în ambele tabele
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      // Dacă Supabase returnează o eroare, o aruncăm pentru a fi prinsă de blocul catch
      if (error) {
        throw error;
      }

      setVehicles(data || []);
      setTotalCount(count || 0);

    } catch (error) {
      console.error(`Error fetching data from '${activeTab}':`, error.message);
      // Afișăm o eroare în consolă pentru a vedea exact ce nu a funcționat
      setVehicles([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentPage, searchTerm]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  // Gestionează schimbarea tab-ului
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSearchTerm('');
  };

  // Gestionează modificarea textului de căutare
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Resetează la prima pagină la o nouă căutare
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  return (
    <Layout backgroundClassName="taller-background">
      <div className={styles.pageHeader}>
        <h1>Taller</h1>
      </div>

      {/* Controale: Tab-uri și Căutare */}
      <div className={styles.controlsHeader}>
        <div className={styles.tabContainer}>
          <button
            className={`${styles.tabButton} ${activeTab === 'camioane' ? styles.active : ''}`}
            onClick={() => handleTabChange('camiones')}
          >
            Camiones
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'remolques' ? styles.active : ''}`}
            onClick={() => handleTabChange('remolques')}
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
      ) : vehicles.length === 0 ? (
        <div className={styles.noDataText}>No se encontraron vehículos.</div>
      ) : (
        <>
          <div className={styles.vehicleGrid}>
            {vehicles.map(vehicle => (
              <Link to={`/reparatii/${activeTab === 'camiones' ? 'camion' : 'remorca'}/${vehicle.id}`} key={vehicle.id} className={styles.vehicleCard}>
                <h3>{vehicle.matricula}</h3>
                <p>Ver historial de reparaciones</p>
              </Link>
            ))}
          </div>

          {/* Paginare */}
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

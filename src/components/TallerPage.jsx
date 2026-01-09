import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Layout from './Layout';
import styles from './TallerPage.module.css';

/* ============ ICONS ============ */
const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const TruckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10 17h4M1 17h2m18 0h2M3 17V7a2 2 0 0 1 2-2h9v12M22 17v-5a2 2 0 0 0-2-2h-4" />
    <circle cx="7.5" cy="17.5" r="1.5" />
    <circle cx="16.5" cy="17.5" r="1.5" />
  </svg>
);

const TrailerIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="8" width="13" height="7" rx="1" />
    <circle cx="8" cy="17" r="1.5" />
    <circle cx="15" cy="17" r="1.5" />
  </svg>
);

/* ============ COMPONENT ============ */
export default function TallerPage() {
  const ITEMS_PER_PAGE = 10;

  const [activeTab, setActiveTab] = useState('camioane');
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState(null);

  /* ============ FETCH ============ */
  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from(activeTab)
        .select('*', { count: 'exact' });

      if (searchTerm.trim()) {
        query = query.ilike('matricula', `%${searchTerm}%`);
      }

      const { data, error: qError, count } = await query.range(from, to);
      if (qError) throw qError;

      setVehicles(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error(err);
      setError(`Error: ${err.message}`);
      setVehicles([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentPage, searchTerm]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  /* ============ HANDLERS ============ */
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchTerm('');
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  /* ============ RENDER ============ */
  return (
    <Layout backgroundClassName="taller-background">
      {/* ===== HERO HEADER ===== */}
      <div className={styles.pageHeader}>
        <img
  src="/taller.jpg"
  alt="Taller"
  className={styles.heroImg}
/>
        <div className={styles.heroOverlay} />

        <div className={styles.heroContent}>
          <div>
            <h1>Taller</h1>
            <p className={styles.subTitle}>
              Gestión de Camiones y Remolques
            </p>
          </div>
        </div>
      </div>

      {/* ===== CONTROLS ===== */}
      <div className={styles.controlsHeader}>
        <div className={styles.tabContainer}>
          <button
            className={`${styles.tabButton} ${activeTab === 'camioane' ? styles.active : ''}`}
            onClick={() => handleTabChange('camioane')}
          >
            <span className={styles.tabIcon}><TruckIcon /></span>
            Camiones
          </button>

          <button
            className={`${styles.tabButton} ${activeTab === 'remorci' ? styles.active : ''}`}
            onClick={() => handleTabChange('remorci')}
          >
            <span className={styles.tabIcon}><TrailerIcon /></span>
            Remolques
          </button>
        </div>

        <div className={styles.searchBar}>
          <SearchIcon />
          <input
            type="text"
            placeholder="Buscar por matrícula…"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* ===== CONTENT ===== */}
      {loading ? (
        <div className={styles.loadingText}>Cargando vehículos…</div>
      ) : error ? (
        <div className={styles.noDataText} style={{ color: '#ef4444' }}>
          {error}
        </div>
      ) : vehicles.length === 0 ? (
        <div className={styles.noDataText}>
          No se encontraron vehículos.
        </div>
      ) : (
        <>
          <div className={styles.vehicleGrid}>
            {vehicles.map((v) => (
              <Link
                key={v.id}
                to={`/reparatii/${activeTab === 'camioane' ? 'camion' : 'remorca'}/${v.id}`}
                className={styles.vehicleCard}
              >
                <div className={styles.cardHeader}>
                  <h3>{v.matricula}</h3>
                  <span className={styles.cardType}>
                    {activeTab === 'camioane' ? 'Camión' : 'Remolque'}
                  </span>
                </div>
                <p>Ver historial de reparaciones</p>
              </Link>
            ))}
          </div>

          {/* ===== PAGINATION ===== */}
          <div className={styles.paginationContainer}>
            <button
              className={styles.paginationButton}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </button>

            <span className={styles.pageIndicator}>
              Página {currentPage} de {totalPages}
            </span>

            <button
              className={styles.paginationButton}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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
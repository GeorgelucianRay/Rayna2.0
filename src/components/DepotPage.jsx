import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from './Layout';
import { supabase } from '../supabaseClient';
import styles from './DepotPage.module.css';

// Importă noile componente pentru modaluri
import AddContainerModal from './AddContainerModal';
import EditContainerModal from './EditContainerModal';
import SalidaContainerModal from './SalidaContainerModal';

/* Pictogramă pentru căutare */
const SearchIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
  >
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

/* Pictogramă pentru butonul de adăugare */
const PlusIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    fill="currentColor"
    viewBox="0 0 20 20"
  >
    <path
      fillRule="evenodd"
      d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a 1 1 0 011-1z"
      clipRule="evenodd"
    />
  </svg>
);

function DepotPage() {
  const ITEMS_PER_PAGE = 25;
  const [activeTab, setActiveTab] = useState('contenedores');
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const navigate = useNavigate();

  // Stări pentru modalul de adăugare
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newMatricula, setNewMatricula] = useState('');
  const [newNaviera, setNewNaviera] = useState('');
  const [newTipo, setNewTipo] = useState('20');
  const [newPosicion, setNewPosicion] = useState('');
  const [newEstado, setNewEstado] = useState('lleno');
  const [newMatriculaCamion, setNewMatriculaCamion] = useState('');
  const [isBroken, setIsBroken] = useState(false);
  const [newDetalles, setNewDetalles] = useState('');

  // Stări pentru modalul de editare
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editPosicion, setEditPosicion] = useState('');
  // Stări pentru modalul de ieșire
  const [isSalidaModalOpen, setIsSalidaModalOpen] = useState(false);
  const [salidaMatriculaCamion, setSalidaMatriculaCamion] = useState('');
  // Container selectat pentru editare / ieșire
  const [selectedContainer, setSelectedContainer] = useState(null);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error || !user) {
        navigate('/login');
      }
    };
    checkSession();
  }, [navigate]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase.from(activeTab).select('*', { count: 'exact' });
      if (searchTerm) {
        query = query.ilike('matricula_contenedor', `%${searchTerm}%`);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching containers:', error);
      } else {
        setContainers(data || []);
        setTotalCount(count || 0);
      }
      setLoading(false);
    };

    fetchData();
  }, [activeTab, currentPage, searchTerm, ITEMS_PER_PAGE]);

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSearchTerm('');
  };

  const openAddModal = () => {
    setNewMatricula('');
    setNewNaviera('');
    setNewTipo('20');
    setNewPosicion('');
    setNewEstado('lleno');
    setNewMatriculaCamion('');
    setIsBroken(false);
    setNewDetalles('');
    setIsAddModalOpen(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const data = {
      matricula_contenedor: newMatricula,
      naviera: newNaviera,
      tipo: newTipo,
      posicion: newPosicion,
      matricula_camion: newMatriculaCamion || null,
    };

    if (isBroken) {
      data.detalles = newDetalles || null;
      const { error } = await supabase.from('contenedores_rotos').insert([data]);
      if (error) {
        console.error('Error adding broken container:', error);
        alert('A apărut o eroare la adăugarea containerului defect. Vă rugăm să încercați din nou.');
      } else {
        setActiveTab('contenedores_rotos');
      }
    } else {
      data.estado = newEstado || null;
      const { error } = await supabase.from('contenedores').insert([data]);
      if (error) {
        console.error('Error adding container:', error);
        alert('A apărut o eroare la adăugarea containerului. Vă rugăm să încercați din nou.');
      } else {
        setActiveTab('contenedores');
      }
    }
    setIsAddModalOpen(false);
    setCurrentPage(1);
    setSearchTerm('');
  };

  const openEditModal = (container) => {
    setSelectedContainer(container);
    setEditPosicion(container.posicion || '');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedContainer) return;
    const { id } = selectedContainer;
    const { error } = await supabase
      .from(activeTab)
      .update({ posicion: editPosicion || null })
      .eq('id', id);
    if (error) {
      console.error('Error updating position:', error);
    } else {
      setContainers((prev) => prev.map((c) => (c.id === id ? { ...c, posicion: editPosicion } : c)));
    }
    setIsEditModalOpen(false);
  };

  const openSalidaModal = (container) => {
    setSelectedContainer(container);
    setSalidaMatriculaCamion('');
    setIsSalidaModalOpen(true);
  };

  const handleSalidaSubmit = async (e) => {
    e.preventDefault();
    if (!selectedContainer) return;
    const { id, created_at, estado: selectedEstado, detalles: selectedDetalles, ...rest } = selectedContainer;

    const newRecord = {
      ...rest,
      estado: selectedEstado || null,
      detalles: selectedDetalles || null,
      matricula_camion: salidaMatriculaCamion || null,
    };

    const { error: insertError } = await supabase.from('contenedores_salidos').insert([newRecord]);
    if (insertError) {
        console.error('Error moving container to salidos:', insertError);
        alert('A apărut o eroare la înregistrarea ieșirii containerului. Vă rugăm să încercați din nou.');
    } else {
      const { error: deleteError } = await supabase.from(activeTab).delete().eq('id', id);
      if (deleteError) {
        console.error('Error deleting container:', deleteError);
        alert('A apărut o eroare la ștergerea containerului din tabla curentă.');
      } else {
        setContainers((prev) => prev.filter((c) => c.id !== id));
        setActiveTab('contenedores_salidos');
      }
    }
    setIsSalidaModalOpen(false);
  };

  return (
    <Layout backgroundClassName="depotBackground">
      {/* Containerul pentru butoanele noi */}
      <div className={styles.depotHeaderPrimary}>
        <button className={styles.depotTabButton} onClick={() => navigate('/programacion')}>
          Programación
        </button>
        <button className={styles.depotTabButton} onClick={() => navigate('/mapa')}>
          Mapa 3D
        </button>
      </div>

      <div className={styles.depotHeader}>
        <button
          className={`${styles.depotTabButton} ${activeTab === 'contenedores' ? styles.active : ''}`}
          onClick={() => handleTabChange('contenedores')}
        >
          En Depósito
        </button>
        <button
          className={`${styles.depotTabButton} ${activeTab === 'contenedores_rotos' ? styles.active : ''}`}
          onClick={() => handleTabChange('contenedores_rotos')}
        >
          Defectos
        </button>
        <button
          className={`${styles.depotTabButton} ${activeTab === 'contenedores_salidos' ? styles.active : ''}`}
          onClick={() => handleTabChange('contenedores_salidos')}
        >
          Salidos
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBar}>
          <SearchIcon />
          <input
            type="text"
            placeholder="Buscar por matrícula..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        {activeTab === 'contenedores' && (
          <button className={styles.addButton} onClick={openAddModal}>
            <PlusIcon />
            Añadir Contenedor
          </button>
        )}
      </div>

      {loading ? (
        <p className={styles.loadingText}>Cargando...</p>
      ) : containers.length === 0 ? (
        <p className={styles.noDataText}>No hay contenedores.</p>
      ) : (
        <>
          <div className={styles.containersGrid}>
            {containers.map((container) => (
              <div key={container.id} className={styles.containerCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.cardMatricula}>{container.matricula_contenedor}</h3>
                    <p className={styles.cardNaviera}>{container.naviera}</p>
                  </div>
                  {activeTab !== 'contenedores_salidos' && (
                    <div className={styles.cardActions}>
                      <button className={styles.cardButton} onClick={() => openEditModal(container)}>
                        Editar
                      </button>
                      <button className={styles.cardButtonSalida} onClick={() => openSalidaModal(container)}>
                        Salida
                      </button>
                    </div>
                  )}
                </div>
                <div className={styles.cardBody}>
                  <p>
                    <strong>Fecha de entrada:</strong>{' '}
                    {new Date(container.created_at).toLocaleDateString()}
                  </p>
                  {container.tipo && (
                    <p>
                      <strong>Tipo:</strong> {container.tipo}
                    </p>
                  )}
                  {container.posicion && (
                    <p>
                      <strong>Posición:</strong> {container.posicion}
                    </p>
                  )}
                  {activeTab === 'contenedores' && container.estado && (
                    <p>
                      <strong>Estado:</strong> {container.estado}
                    </p>
                  )}
                  {(activeTab === 'contenedores_rotos' || activeTab === 'contenedores_salidos') &&
                    container.detalles && (
                      <p>
                        <strong>Detalles:</strong> {container.detalles}
                      </p>
                    )}
                  {activeTab === 'contenedores_salidos' && container.matricula_camion && (
                    <p>
                      <strong>Matrícula Camión:</strong>{' '}
                      {container.matricula_camion}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.paginationContainer}>
            <button
              className={styles.paginationButton}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </button>
            <span className={styles.pageIndicator}>
              Página {currentPage} de {totalPages}
            </span>
            <button
              className={styles.paginationButton}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              Siguiente
            </button>
          </div>
        </>
      )}

      {/* Aici folosim noile componente, trecând stările și funcțiile ca props */}
      <AddContainerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddSubmit}
        newMatricula={newMatricula} setNewMatricula={setNewMatricula}
        newNaviera={newNaviera} setNewNaviera={setNewNaviera}
        newTipo={newTipo} setNewTipo={setNewTipo}
        newPosicion={newPosicion} setNewPosicion={setNewPosicion}
        newEstado={newEstado} setNewEstado={setNewEstado}
        isBroken={isBroken} setIsBroken={setIsBroken}
        newDetalles={newDetalles} setNewDetalles={setNewDetalles}
        newMatriculaCamion={newMatriculaCamion} setNewMatriculaCamion={setNewMatriculaCamion}
      />
      <EditContainerModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleEditSubmit}
        editPosicion={editPosicion} setEditPosicion={setEditPosicion}
        selectedContainer={selectedContainer}
      />
      <SalidaContainerModal
        isOpen={isSalidaModalOpen}
        onClose={() => setIsSalidaModalOpen(false)}
        onSubmit={handleSalidaSubmit}
        salidaMatriculaCamion={salidaMatriculaCamion} setSalidaMatriculaCamion={setSalidaMatriculaCamion}
        selectedContainer={selectedContainer}
      />
    </Layout>
  );
}

export default DepotPage;

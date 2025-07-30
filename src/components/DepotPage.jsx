import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from './Layout';
import { supabase } from '../supabaseClient';
import styles from './DepotPage.module.css';

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
  // Numărul de carduri pe pagină
  const ITEMS_PER_PAGE = 25;

  // Tab activ (contenedores, contenedores_rotos, contenedores_salidos)
  const [activeTab, setActiveTab] = useState('contenedores');
  // Lista contenedores
  const [containers, setContainers] = useState([]);
  // Loader
  const [loading, setLoading] = useState(true);
  // Text de căutare
  const [searchTerm, setSearchTerm] = useState('');
  // Paginare
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Pentru navigare (ex. redirecționare la login dacă nu e sesiune)
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

  /* Efect pentru verificarea sesiunii. 
     Dacă utilizatorul nu este autentificat, se poate redirecționa către login. */
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) {
        console.error('Error fetching user:', error);
        return;
      }
      if (!user) {
        navigate('/login');
      }
    };
    checkSession();
  }, []);

  /* Efect pentru încărcarea datelor */
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
  }, [activeTab, currentPage, searchTerm]);

  /* Calcul număr total de pagini */
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  /* Schimbare tab */
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSearchTerm('');
  };

  /* Deschide modal de adăugare și resetează câmpurile */
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

  /* Adăugăm un container nou */
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const data = {
      // câmpurile principale sunt necesare; cele opționale pot fi null
      matricula_contenedor: newMatricula,
      naviera: newNaviera,
      tipo: newTipo,
      posicion: newPosicion,
      matricula_camion: newMatriculaCamion || null,
    };

    if (isBroken) {
      data.detalles = newDetalles || null;
      // Inserăm în tabela contenedores_rotos
      const { error } = await supabase.from('contenedores_rotos').insert([data]);
      if (error) {
        console.error('Error adding broken container:', error);
        alert('A apărut o eroare la adăugarea containerului defect. Vă rugăm să încercați din nou.');
      } else {
        setActiveTab('contenedores_rotos');
      }
    } else {
      data.estado = newEstado || null; // coloana pentru lleno/vacio; poate fi null
      // Inserăm în tabela contenedores
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

  /* Deschidem modalul de editare și setăm containerul */
  const openEditModal = (container) => {
    setSelectedContainer(container);
    setEditPosicion(container.posicion || '');
    setIsEditModalOpen(true);
  };

  /* Salvăm noua poziție */
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

  /* Deschidem modalul de ieșire */
  const openSalidaModal = (container) => {
    setSelectedContainer(container);
    setSalidaMatriculaCamion('');
    setIsSalidaModalOpen(true);
  };

  /* Mutăm containerul în contenedores_salidos */
  const handleSalidaSubmit = async (e) => {
    e.preventDefault();
    if (!selectedContainer) return;
    const {
      id,
      created_at,
      estado: selectedEstado,
      detalles: selectedDetalles,
      ...rest
    } = selectedContainer;

    const newRecord = {
      ...rest,
      estado: selectedEstado || null,
      detalles: selectedDetalles || null,
      matricula_camion: salidaMatriculaCamion || null,
    };

    const { error: insertError } = await supabase
      .from('contenedores_salidos')
      .insert([newRecord]);
    if (insertError) {
      console.error('Error moving container to salidos:', insertError);
      alert('A apărut o eroare la înregistrarea ieșirii containerului. Vă rugăm să încercați din nou.');
    } else {
      const { error: deleteError } = await supabase
        .from(activeTab)
        .delete()
        .eq('id', id);
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

  // Nu verificăm rolul aici – logica de autorizare este gestionată în altă parte.

  return (
    <Layout backgroundClassName="depotBackground">
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

      {/* Modal: Añadir contenedor */}
      {isAddModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Añadir Contenedor</h3>
            <form onSubmit={handleAddSubmit}>
              <div className={styles.formGroup}>
                <label htmlFor="newMatricula">Matrícula Contenedor</label>
                <input
                  id="newMatricula"
                  type="text"
                  value={newMatricula}
                  onChange={(e) => setNewMatricula(e.target.value)}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="newNaviera">Naviera</label>
                <input
                  id="newNaviera"
                  type="text"
                  value={newNaviera}
                  onChange={(e) => setNewNaviera(e.target.value)}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="newTipo">Tipo</label>
                <select id="newTipo" value={newTipo} onChange={(e) => setNewTipo(e.target.value)}>
                  <option value="20">20</option>
                  <option value="20 OpenTop">20 OpenTop</option>
                  <option value="40 Alto">40 Alto</option>
                  <option value="40 Bajo">40 Bajo</option>
                  <option value="40 OpenTop">40 OpenTop</option>
                  <option value="45">45</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="newPosicion">Posición</label>
                <input
                  id="newPosicion"
                  type="text"
                  value={newPosicion}
                  onChange={(e) => setNewPosicion(e.target.value)}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="newEstado">Estado</label>
                <select
                  id="newEstado"
                  value={newEstado}
                  onChange={(e) => setNewEstado(e.target.value)}
                  disabled={isBroken}
                >
                  <option value="lleno">Lleno</option>
                  <option value="vacio">Vacío</option>
                </select>
              </div>
              <div className={styles.formGroupInline}>
                <input
                  id="brokenCheckbox"
                  type="checkbox"
                  checked={isBroken}
                  onChange={(e) => setIsBroken(e.target.checked)}
                />
                <label htmlFor="brokenCheckbox">Roto</label>
              </div>
              {isBroken && (
                <div className={styles.formGroup}>
                  <label htmlFor="newDetalles">Detalles</label>
                  <input
                    id="newDetalles"
                    type="text"
                    value={newDetalles}
                    onChange={(e) => setNewDetalles(e.target.value)}
                  />
                </div>
              )}
              <div className={styles.formGroup}>
                <label htmlFor="newMatriculaCamion">Matrícula Camión (opțional)</label>
                <input
                  id="newMatriculaCamion"
                  type="text"
                  value={newMatriculaCamion}
                  onChange={(e) => setNewMatriculaCamion(e.target.value)}
                />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelButton} onClick={() => setIsAddModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className={styles.saveButton}>
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar poziție */}
      {isEditModalOpen && selectedContainer && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Editar Posición</h3>
            <form onSubmit={handleEditSubmit}>
              <div className={styles.formGroup}>
                <label htmlFor="editPosicion">Nueva Posición</label>
                <input
                  id="editPosicion"
                  type="text"
                  value={editPosicion}
                  onChange={(e) => setEditPosicion(e.target.value)}
                  required
                />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelButton} onClick={() => setIsEditModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className={styles.saveButton}>
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registrar salida */}
      {isSalidaModalOpen && selectedContainer && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Registrar Salida</h3>
            <form onSubmit={handleSalidaSubmit}>
              <div className={styles.formGroup}>
                <label htmlFor="salidaMatriculaCamion">Matrícula Camión</label>
                <input
                  id="salidaMatriculaCamion"
                  type="text"
                  value={salidaMatriculaCamion}
                  onChange={(e) => setSalidaMatriculaCamion(e.target.value)}
                  required
                />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelButton} onClick={() => setIsSalidaModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className={styles.saveButton}>
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default DepotPage;
// src/components/Depot/DepotPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../Layout';
import { supabase } from '../../supabaseClient';
import * as XLSX from 'xlsx';
import styles from './DepotPage.module.css';
import AddContainerModal from './modals/AddContainerModal';
import EditContainerModal from './modals/EditContainerModal';
import SalidaContainerModal from './modals/SalidaContainerModal';
import { useAuth } from '../../AuthContext';

/* Iconos (top-level) */
const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
  </svg>
);

function DepotPage() {
  // ✅ Gardă de autentificare (fără useEffect suplimentar)
  const { session, sessionReady } = useAuth();
  const navigate = useNavigate();
  const ITEMS_PER_PAGE = 25;

  if (!sessionReady) return <p style={{ padding: 16 }}>Conectando…</p>;
  if (!session) { window.location.replace('/login'); return null; }

  // Tabs: 'contenedores' | 'contenedores_rotos' | 'contenedores_salidos'
  const [activeTab, setActiveTab] = useState('contenedores');

  // Lista + UI
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Búsqueda + paginación
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modales
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newMatricula, setNewMatricula] = useState('');
  const [newNaviera, setNewNaviera] = useState('');
  const [newTipo, setNewTipo] = useState('20');
  const [newPosicion, setNewPosicion] = useState('');
  const [newEstado, setNewEstado] = useState('lleno');
  const [newMatriculaCamion, setNewMatriculaCamion] = useState('');
  const [isBroken, setIsBroken] = useState(false);
  const [newDetalles, setNewDetalles] = useState('');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editPosicion, setEditPosicion] = useState('');

  const [isSalidaModalOpen, setIsSalidaModalOpen] = useState(false);
  const [salidaMatriculaCamion, setSalidaMatriculaCamion] = useState('');
  const [selectedContainer, setSelectedContainer] = useState(null);

  // Fetch principal (lista vizibilă)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      if (activeTab === 'contenedores') {
        // En Depósito = contenedores ∪ contenedores_programados
        const { data: enDeposito, error: errA } = await supabase
          .from('contenedores')
          .select('*')
          .order('created_at', { ascending: false });

        const { data: programados, error: errB } = await supabase
          .from('contenedores_programados')
          .select('id, created_at, matricula_contenedor, naviera, tipo, posicion, empresa_descarga, fecha, hora, matricula_camion, estado')
          .order('created_at', { ascending: false });

        if (errA) console.error('Error contenedores:', errA);
        if (errB) console.error('Error programados:', errB);

        const combinedRaw = [
          ...(enDeposito || []).map(x => ({ ...x, __from: 'contenedores' })),
          ...(programados || []).map(x => ({ ...x, __from: 'programados' })),
        ];

        const filtered = searchTerm
          ? combinedRaw.filter(x =>
              (x.matricula_contenedor || '').toLowerCase().includes(searchTerm.toLowerCase())
            )
          : combinedRaw;

        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        const total = filtered.length;
        setTotalCount(total);
        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        const to = Math.min(from + ITEMS_PER_PAGE, total);
        setContainers(filtered.slice(from, to));

        setLoading(false);
        return;
      }

      // 'contenedores_rotos' | 'contenedores_salidos' (paginación server-side)
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase.from(activeTab).select('*', { count: 'exact' });
      if (searchTerm) query = query.ilike('matricula_contenedor', `%${searchTerm}%`);

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching containers:', error);
        setContainers([]);
        setTotalCount(0);
      } else {
        setContainers(data || []);
        setTotalCount(count || 0);
      }
      setLoading(false);
    };

    fetchData();
  }, [activeTab, currentPage, searchTerm]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE)),
    [totalCount]
  );

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSearchTerm('');
  };

  /* ---------- ADD ---------- */
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
      matricula_contenedor: newMatricula || null,
      naviera: newNaviera || null,
      tipo: newTipo || null,
      posicion: newPosicion || null,
      matricula_camion: newMatriculaCamion || null,
    };

    if (isBroken) {
      data.detalles = newDetalles || null;
      const { error } = await supabase.from('contenedores_rotos').insert([data]);
      if (error) {
        console.error('Error adding broken container:', error);
        alert('Error al añadir contenedor defectuoso.');
      } else {
        setActiveTab('contenedores_rotos');
      }
    } else {
      data.estado = newEstado || null;
      const { error } = await supabase.from('contenedores').insert([data]);
      if (error) {
        console.error('Error adding container:', error);
        alert('Error al añadir contenedor.');
      } else {
        setActiveTab('contenedores');
      }
    }
    setIsAddModalOpen(false);
    setCurrentPage(1);
    setSearchTerm('');
  };

  /* ---------- EDIT ---------- */
  const openEditModal = (container) => {
    setSelectedContainer(container);
    setEditPosicion(container.posicion || '');
    setIsEditModalOpen(true);
  };

  // permite editar posición pentru TOATE (inclusiv programados)
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedContainer) return;
    const { id } = selectedContainer;

    const table =
      selectedContainer.__from === 'programados'
        ? 'contenedores_programados'
        : activeTab;

    const patch = { posicion: editPosicion || null };

    const { error } = await supabase.from(table).update(patch).eq('id', id);
    if (error) {
      console.error('Error updating position:', error);
      alert(`Error al actualizar posición:\n${error.message || error}`);
    } else {
      setContainers(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)));
    }
    setIsEditModalOpen(false);
  };

  /* ---------- SALIDA ---------- */
  const openSalidaModal = (container) => {
    setSelectedContainer(container);
    setSalidaMatriculaCamion('');
    setIsSalidaModalOpen(true);
  };

  const handleSalidaSubmit = async (e) => {
    e.preventDefault();
    if (!selectedContainer) return;

    const {
      id,
      __from,
      matricula_contenedor,
      naviera,
      tipo,
      posicion,
      estado: estadoActual,
      detalles,
      empresa_descarga,
      fecha,
      hora,
    } = selectedContainer;

    try {
      // Din Depot NU permitem salida pentru "programados"
      if (__from === 'programados') {
        alert('Este contenedor está programado. Realiza la salida desde "Programación" → Hecho.');
        setIsSalidaModalOpen(false);
        return;
      }

      // șterge orice programare existentă cu aceeași matrícula
      await supabase.from('contenedores_programados')
        .delete()
        .eq('matricula_contenedor', matricula_contenedor);

      // payload conform `contenedores_salidos`
      const salidaPayload = {
        matricula_contenedor: matricula_contenedor || null,
        naviera: naviera || null,
        tipo: tipo || null,
        posicion: posicion || null,
        matricula_camion: salidaMatriculaCamion || null,
        detalles: detalles || null,
        estado: estadoActual || null,

        empresa_descarga: empresa_descarga || null,
        fecha: fecha || null,
        hora: hora || null,

        desde_programados: __from === 'programados',
        fecha_programada: fecha || null,
        hora_programada: hora || null,
        fecha_salida: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from('contenedores_salidos')
        .insert([salidaPayload]);

      if (insertError) {
        console.error('[SALIDA insert error]', insertError);
        alert(`Error al registrar la salida:\n${insertError.message || insertError}`);
        setIsSalidaModalOpen(false);
        return;
      }

      // elimină din tabela activă
      const { error: deleteError } = await supabase
        .from(activeTab)
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('[SALIDA delete error]', deleteError);
        alert(`Error al limpiar el contenedor de "${activeTab}":\n${deleteError.message || deleteError}`);
        setIsSalidaModalOpen(false);
        return;
      }

      // UI
      setContainers(prev => prev.filter(c => c.id !== id));
      setActiveTab('contenedores_salidos');
    } catch (err) {
      console.error('Error en salida (catch):', err);
      alert(`Ocurrió un error al registrar la salida.\n${err?.message || ''}`);
    }

    setIsSalidaModalOpen(false);
  };

  /* ---------- EXPORT EXCEL (toate tab-urile) ---------- */

  // helper comun
  const exportRowsToExcel = (rows, sheetName, fileName) => {
    if (!rows || rows.length === 0) {
      alert('No hay datos para exportar.');
      return;
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows, { cellDates: false });
    // lățimi coloane (heuristic)
    const colWidths = Object.keys(rows[0]).map(() => ({ wch: 22 }));
    if (colWidths.length > 0) colWidths[0] = { wch: 5 };
    ws['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, fileName);
  };

  const nowFileStamp = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
  };

  // En Depósito (UNION) — respectă filtrul de căutare
  const handleExportExcelEnDeposito = async () => {
    try {
      const [{ data: enDeposito, error: errA }, { data: programados, error: errB }] = await Promise.all([
        supabase.from('contenedores')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase.from('contenedores_programados')
          .select('id, created_at, matricula_contenedor, naviera, tipo, posicion, empresa_descarga, fecha, hora, matricula_camion, estado')
          .order('created_at', { ascending: false }),
      ]);
      if (errA) throw errA;
      if (errB) throw errB;

      const combined = [
        ...(enDeposito || []).map(x => ({ ...x, __from: 'contenedores' })),
        ...(programados || []).map(x => ({ ...x, __from: 'programados' })),
      ];

      const filtered = searchTerm
        ? combined.filter(x => (x.matricula_contenedor || '').toLowerCase().includes(searchTerm.toLowerCase()))
        : combined;

      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      const rows = filtered.map((x, idx) => ({
        '#': idx + 1,
        'Matrícula Contenedor': x.matricula_contenedor || '',
        'Naviera': x.naviera || '',
        'Tipo': x.tipo || '',
        'Posición': x.posicion || '',
        'Estado': x.estado || '',
        'Matrícula Camión': x.matricula_camion || '',
        'Empresa Descarga (programado)': x.empresa_descarga || '',
        'Fecha Programada': x.fecha || '',
        'Hora Programada': x.hora || '',
        'Desde Programados': x.__from === 'programados' ? 'Sí' : 'No',
        'Fecha Entrada (created_at)': x.created_at ? new Date(x.created_at).toLocaleString() : '',
      }));

      exportRowsToExcel(rows, 'En Deposito', `Depot_EnDeposito_${nowFileStamp()}.xlsx`);
    } catch (err) {
      console.error('[Excel export EnDepósito]', err);
      alert(`No se pudo generar el Excel (En Depósito):\n${err.message || err}`);
    }
  };

  // Defectos
  const handleExportExcelRotos = async () => {
    try {
      const { data, error } = await supabase
        .from('contenedores_rotos')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const filtered = searchTerm
        ? (data || []).filter(x => (x.matricula_contenedor || '').toLowerCase().includes(searchTerm.toLowerCase()))
        : (data || []);

      const rows = filtered.map((x, idx) => ({
        '#': idx + 1,
        'Matrícula Contenedor': x.matricula_contenedor || '',
        'Naviera': x.naviera || '',
        'Tipo': x.tipo || '',
        'Posición': x.posicion || '',
        'Matrícula Camión': x.matricula_camion || '',
        'Detalles (defecto)': x.detalles || '',
        'Fecha Entrada (created_at)': x.created_at ? new Date(x.created_at).toLocaleString() : '',
      }));

      exportRowsToExcel(rows, 'Defectos', `Depot_Defectos_${nowFileStamp()}.xlsx`);
    } catch (err) {
      console.error('[Excel export Rotos]', err);
      alert(`No se pudo generar el Excel (Defectos):\n${err.message || err}`);
    }
  };

  // Salidos — conform schema shared (incluye fecha_salida etc.)
  const handleExportExcelSalidos = async () => {
    try {
      const { data, error } = await supabase
        .from('contenedores_salidos')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const filtered = searchTerm
        ? (data || []).filter(x => (x.matricula_contenedor || '').toLowerCase().includes(searchTerm.toLowerCase()))
        : (data || []);

      const rows = filtered.map((x, idx) => ({
        '#': idx + 1,
        'Matrícula Contenedor': x.matricula_contenedor || '',
        'Naviera': x.naviera || '',
        'Tipo': x.tipo || '',
        'Posición (al salir)': x.posicion || '',
        'Estado (al salir)': x.estado || '',
        'Matrícula Camión (salida)': x.matricula_camion || '',
        'Empresa Descarga (prog)': x.empresa_descarga || '',
        'Fecha Programada': x.fecha || '',
        'Hora Programada': x.hora || '',
        'Desde Programados': x.desde_programados ? 'Sí' : 'No',
        'Fecha salida': x.fecha_salida ? new Date(x.fecha_salida).toLocaleString() : '',
        'Fecha registro (created_at)': x.created_at ? new Date(x.created_at).toLocaleString() : '',
      }));

      exportRowsToExcel(rows, 'Salidos', `Depot_Salidos_${nowFileStamp()}.xlsx`);
    } catch (err) {
      console.error('[Excel export Salidos]', err);
      alert(`No se pudo generar el Excel (Salidos):\n${err.message || err}`);
    }
  };

  // handler generic în toolbar în funcție de tab
  const handleExportExcel = () => {
    if (activeTab === 'contenedores') return handleExportExcelEnDeposito();
    if (activeTab === 'contenedores_rotos') return handleExportExcelRotos();
    if (activeTab === 'contenedores_salidos') return handleExportExcelSalidos();
  };

  return (
    <Layout backgroundClassName="depotBackground">
      <div className={styles.pageWrap}>
        {/* Tabs */}
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

        {/* Accesos rápidos */}
        <div className={styles.extraButtons}>
          <button
            className={`${styles.actionButton} ${styles.programButton}`}
            onClick={() => navigate('/programacion')}
          >
            📅 Programación
          </button>
          <button
            className={`${styles.actionButton} ${styles.mapButton}`}
            onClick={() => navigate('/mapa')}
          >
            🗺️ Ver Mapa
          </button>
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
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

          {/* Buton Excel */}
          <img
            src="/excel_circle_green.png"
            alt="Exportar Excel"
            className={styles.excelButton}
            onClick={handleExportExcel}
          />

          {activeTab === 'contenedores' && (
            <button className={styles.addButton} onClick={openAddModal}>
              <PlusIcon />
              Añadir contenedor
            </button>
          )}
        </div>

        {/* Lista */}
        {loading ? (
          <p className={styles.loadingText}>Cargando…</p>
        ) : containers.length === 0 ? (
          <p className={styles.noDataText}>No hay contenedores.</p>
        ) : (
          <>
            <div className={styles.containersGrid}>
              {containers.map((container) => (
                <div key={`${container.__from || activeTab}-${container.id}`} className={styles.containerCard}>
                  <div className={styles.cardHeader}>
                    <div>
                      <h3 className={styles.cardMatricula}>{container.matricula_contenedor}</h3>
                      <p className={styles.cardNaviera}>{container.naviera}</p>
                    </div>

                    {/* Editar: mereu; Salida: doar dacă nu e programado și nu suntem în "salidos" */}
                    {activeTab !== 'contenedores_salidos' && (
                      <div className={styles.cardActions}>
                        <button className={styles.cardButton} onClick={() => openEditModal(container)}>
                          Editar
                        </button>
                        {container.__from !== 'programados' && (
                          <button className={styles.cardButtonSalida} onClick={() => openSalidaModal(container)}>
                            Salida
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className={styles.cardBody}>
                    <p>
                      <strong>Fecha de entrada:</strong>{' '}
                      {new Date(container.created_at).toLocaleDateString()}
                    </p>

                    {container.tipo && <p><strong>Tipo:</strong> {container.tipo}</p>}
                    {container.posicion && <p><strong>Posición:</strong> {container.posicion}</p>}

                    {/* Badge pentru programados în En Depósito */}
                    {activeTab === 'contenedores' && container.__from === 'programados' && (
                      <p><span className={styles.badgeOrange}>Programado</span></p>
                    )}

                    {(activeTab === 'contenedores_rotos' || activeTab === 'contenedores_salidos') && container.detalles && (
                      <p><strong>Detalles:</strong> {container.detalles}</p>
                    )}

                    {activeTab === 'contenedores_salidos' && container.matricula_camion && (
                      <p><strong>Matrícula camión:</strong> {container.matricula_camion}</p>
                    )}

                    {/* Info extra dacă vine din programados */}
                    {activeTab === 'contenedores' && container.__from === 'programados' && (
                      <>
                        {container.empresa_descarga && <p><strong>Empresa:</strong> {container.empresa_descarga}</p>}
                        {container.fecha && <p><strong>Fecha programada:</strong> {container.fecha}</p>}
                        {container.hora && <p><strong>Hora programada:</strong> {container.hora}</p>}
                        {container.matricula_camion && <p><strong>Camión:</strong> {container.matricula_camion}</p>}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Paginación */}
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

        {/* Modales */}
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
      </div>
    </Layout>
  );
}

export default DepotPage;
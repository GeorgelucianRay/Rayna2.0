// src/components/depot/DepotPage.jsx
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

/* Iconos inline */
const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd"
          d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
          clipRule="evenodd" />
  </svg>
);

export default function DepotPage() {
  const { session, sessionReady } = useAuth();
  const navigate = useNavigate();

  // Gate pe auth (fără a rupe router-ul)
  if (!sessionReady) {
    return (
      <Layout backgroundClassName="depotBackground">
        <p className={styles.loadingText} style={{ padding: 16 }}>Conectando…</p>
      </Layout>
    );
  }
  if (!session) {
    navigate('/login');
    return null;
  }

  /* ------- State ------- */
  const ITEMS_PER_PAGE = 25;
  const [activeTab, setActiveTab] = useState('contenedores'); // 'contenedores'|'contenedores_rotos'|'contenedores_salidos'
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // modale
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSalidaModalOpen, setIsSalidaModalOpen] = useState(false);

  const [editPosicion, setEditPosicion] = useState('');
  const [salidaMatriculaCamion, setSalidaMatriculaCamion] = useState('');
  const [selectedContainer, setSelectedContainer] = useState(null);

  /* ------- Fetch listă ------- */
  useEffect(() => {
    let alive = true;
    const fetchData = async () => {
      setLoading(true);

      if (activeTab === 'contenedores') {
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
              (x.matricula_contenedor || '').toLowerCase().includes(searchTerm.toLowerCase()))
          : combinedRaw;

        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        const total = filtered.length;
        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        const to = Math.min(from + ITEMS_PER_PAGE, total);
        if (!alive) return;

        setContainers(filtered.slice(from, to));
        setTotalCount(total);
        setLoading(false);
        return;
      }

      // 'contenedores_rotos' | 'contenedores_salidos' (paginare server)
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase.from(activeTab).select('*', { count: 'exact' });
      if (searchTerm) query = query.ilike('matricula_contenedor', `%${searchTerm}%`);

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (!alive) return;
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
    return () => { alive = false; };
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

  /* ------- ADD (folosește API-ul AddContainerModal: onAdd(data,isBroken)) ------- */
  const openAddModal = () => setIsAddModalOpen(true);

  const handleAddFromModal = async (data, isBroken) => {
    // data: { matricula_contenedor, naviera, tipo, posicion, matricula_camion, (estado|detalles) }
    try {
      if (isBroken) {
        const { error } = await supabase
          .from('contenedores_rotos')
          .insert([{
            matricula_contenedor: data.matricula_contenedor || null,
            naviera: data.naviera || null,
            tipo: data.tipo || null,
            posicion: data.posicion || null,
            matricula_camion: data.matricula_camion || null,
            detalles: data.detalles || null
          }]);
        if (error) throw error;
        setActiveTab('contenedores_rotos');
      } else {
        const { error } = await supabase
          .from('contenedores')
          .insert([{
            matricula_contenedor: data.matricula_contenedor || null,
            naviera: data.naviera || null,
            tipo: data.tipo || null,
            posicion: data.posicion || null,
            matricula_camion: data.matricula_camion || null, // ✅ inclus
            estado: data.estado || null
          }]);
        if (error) throw error;
        setActiveTab('contenedores');
      }
      setIsAddModalOpen(false);
      setCurrentPage(1);
      setSearchTerm('');
    } catch (err) {
      console.error('[Depot:add] supabase error:', err);
      alert(`Error al añadir contenedor:\n${err.message || err}`);
    }
  };

  /* ------- EDIT ------- */
  const openEditModal = (c) => {
    setSelectedContainer(c);
    setEditPosicion(c.posicion || '');
    setIsEditModalOpen(true);
  };
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedContainer) return;
    const table = selectedContainer.__from === 'programados'
      ? 'contenedores_programados'
      : activeTab;
    const { error } = await supabase
      .from(table)
      .update({ posicion: editPosicion || null })
      .eq('id', selectedContainer.id);
    if (error) {
      console.error(error);
      alert(`Error al actualizar posición:\n${error.message || error}`);
    } else {
      setContainers(prev =>
        prev.map(c => (c.id === selectedContainer.id ? { ...c, posicion: editPosicion || null } : c))
      );
    }
    setIsEditModalOpen(false);
  };

  /* ------- SALIDA ------- */
  const openSalidaModal = (c) => {
    setSelectedContainer(c);
    setSalidaMatriculaCamion('');
    setIsSalidaModalOpen(true);
  };

  const handleSalidaSubmit = async (e) => {
    e.preventDefault();
    if (!selectedContainer) return;

    const { id, __from, matricula_contenedor, naviera, tipo, posicion, estado, detalles,
            empresa_descarga, fecha, hora } = selectedContainer;

    try {
      if (__from === 'programados') {
        alert('Este contenedor está programado. Realiza la salida desde "Programación" → Hecho.');
        setIsSalidaModalOpen(false);
        return;
      }

      // curățăm eventuale programări ale aceleiași matricule
      await supabase.from('contenedores_programados').delete().eq('matricula_contenedor', matricula_contenedor);

      const salidaPayload = {
        matricula_contenedor: matricula_contenedor || null,
        naviera: naviera || null,
        tipo: tipo || null,
        posicion: posicion || null,
        matricula_camion: salidaMatriculaCamion || null,
        detalles: detalles || null,
        estado: estado || null,
        empresa_descarga: empresa_descarga || null,
        fecha: fecha || null,
        hora: hora || null,
        desde_programados: false,
        fecha_programada: fecha || null,
        hora_programada: hora || null,
        fecha_salida: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from('contenedores_salidos')
        .insert([salidaPayload]);
      if (insertError) {
        console.error(insertError);
        alert(`Error al registrar la salida:\n${insertError.message || insertError}`);
        setIsSalidaModalOpen(false);
        return;
      }

      const { error: deleteError } = await supabase
        .from(activeTab)
        .delete()
        .eq('id', id);
      if (deleteError) {
        console.error(deleteError);
        alert(`Error al limpiar el contenedor de "${activeTab}":\n${deleteError.message || deleteError}`);
        setIsSalidaModalOpen(false);
        return;
      }

      setContainers(prev => prev.filter(c => c.id !== id));
      setActiveTab('contenedores_salidos');
    } catch (err) {
      console.error('Error en salida (catch):', err);
      alert(`Ocurrió un error al registrar la salida.\n${err?.message || ''}`);
    }
    setIsSalidaModalOpen(false);
  };

  /* ------- EXCEL ------- */
  const exportRowsToExcel = (rows, sheetName, fileName) => {
    if (!rows?.length) { alert('No hay datos para exportar.'); return; }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows, { cellDates: false });
    const colWidths = Object.keys(rows[0]).map(() => ({ wch: 22 }));
    if (colWidths.length > 0) colWidths[0] = { wch: 5 };
    ws['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, fileName);
  };
  const nowFileStamp = () => {
    const now = new Date(); const pad = (n) => String(n).padStart(2,'0');
    return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
  };

  const handleExportExcelEnDeposito = async () => {
    try {
      const [{ data: enDeposito }, { data: programados }] = await Promise.all([
        supabase.from('contenedores').select('*').order('created_at', { ascending: false }),
        supabase.from('contenedores_programados')
          .select('id, created_at, matricula_contenedor, naviera, tipo, posicion, empresa_descarga, fecha, hora, matricula_camion, estado')
          .order('created_at', { ascending: false }),
      ]);

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

  const handleExportExcelRotos = async () => {
    try {
      const { data } = await supabase
        .from('contenedores_rotos')
        .select('*')
        .order('created_at', { ascending: false });

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

  const handleExportExcelSalidos = async () => {
    try {
      const { data } = await supabase
        .from('contenedores_salidos')
        .select('*')
        .order('created_at', { ascending: false });

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

  const handleExportExcel = () => {
    if (activeTab === 'contenedores') return handleExportExcelEnDeposito();
    if (activeTab === 'contenedores_rotos') return handleExportExcelRotos();
    if (activeTab === 'contenedores_salidos') return handleExportExcelSalidos();
  };

  /* ------- UI ------- */
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
          <button className={`${styles.actionButton} ${styles.programButton}`} onClick={() => navigate('/programacion')}>📅 Programación</button>
          <button className={`${styles.actionButton} ${styles.mapButton}`} onClick={() => navigate('/mapa')}>🗺️ Ver Mapa</button>
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.searchBar}>
            <SearchIcon />
            <input
              type="text"
              placeholder="Buscar por matrícula…"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>

          <img
            src="/excel_circle_green.png"
            alt="Exportar Excel"
            className={styles.excelButton}
            onClick={handleExportExcel}
          />

          {activeTab === 'contenedores' && (
            <button className={styles.addButton} onClick={openAddModal}>
              <PlusIcon /> Añadir contenedor
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

                    {activeTab !== 'contenedores_salidos' && (
                      <div className={styles.cardActions}>
                        <button className={styles.cardButton} onClick={() => openEditModal(container)}>Editar</button>
                        {container.__from !== 'programados' && (
                          <button className={styles.cardButtonSalida} onClick={() => openSalidaModal(container)}>Salida</button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className={styles.cardBody}>
                    <p><strong>Fecha de entrada:</strong> {new Date(container.created_at).toLocaleDateString()}</p>
                    {container.tipo && <p><strong>Tipo:</strong> {container.tipo}</p>}
                    {container.posicion && <p><strong>Posición:</strong> {container.posicion}</p>}

                    {activeTab === 'contenedores' && container.__from === 'programados' && (
                      <>
                        <p><span className={styles.badgeOrange}>Programado</span></p>
                        {container.empresa_descarga && <p><strong>Empresa:</strong> {container.empresa_descarga}</p>}
                        {container.fecha && <p><strong>Fecha programada:</strong> {container.fecha}</p>}
                        {container.hora && <p><strong>Hora programada:</strong> {container.hora}</p>}
                        {container.matricula_camion && <p><strong>Camión:</strong> {container.matricula_camion}</p>}
                      </>
                    )}

                    {(activeTab === 'contenedores_rotos' || activeTab === 'contenedores_salidos') && container.detalles && (
                      <p><strong>Detalles:</strong> {container.detalles}</p>
                    )}
                    {activeTab === 'contenedores_salidos' && container.matricula_camion && (
                      <p><strong>Matrícula camión:</strong> {container.matricula_camion}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Paginación */}
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

        {/* Modales */}
        <AddContainerModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddFromModal}           // ✅ API corect
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
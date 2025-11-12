// src/components/depot/DepotPage.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../Layout';
import { supabase } from '../../supabaseClient';
import * as XLSX from 'xlsx';
import styles from './DepotPage.module.css';
import AddContainerModal from './modals/AddContainerModal';
import EditContainerModal from './modals/EditContainerModal';
import SalidaContainerModal from './modals/SalidaContainerModal';
import { useAuth } from '../../AuthContext';

/* Icone */
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

export default function DepotPage() {
  const { session, sessionReady } = useAuth();
  const navigate = useNavigate();

  if (!sessionReady) {
    return (
      <Layout backgroundClassName="depotBackground">
        <p className={styles.loadingText} style={{ padding: 16 }}>Conectando…</p>
      </Layout>
    );
  }
  if (!session) { navigate('/login'); return null; }

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
  const [editPosicion, setEditPosicion] = useState('');

  const [isSalidaModalOpen, setIsSalidaModalOpen] = useState(false);
  const [salidaMatriculaCamion, setSalidaMatriculaCamion] = useState('');
  const [selectedContainer, setSelectedContainer] = useState(null);

  // pentru re-fetch forțat după mutații
  const refreshFlag = useRef(0);
  const bumpRefresh = () => { refreshFlag.current += 1; };

  /* ------- Fetch ------- */
  const fetchData = useCallback(async () => {
    setLoading(true);

    if (activeTab === 'contenedores') {
      // 1) en depósito
      const { data: enDeposito, error: errA } = await supabase
        .from('contenedores')
        .select('*')
        .order('created_at', { ascending: false });

      // 2) programados (se afișează în “En Depósito” ca vizibilitate de ansamblu)
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

      // Căutare mai bogată (matrícula, naviera, posición, camión, empresa)
      const norm = (s) => String(s || '').toLowerCase();
      const q = norm(searchTerm);
      const filtered = q
        ? combinedRaw.filter(x =>
            norm(x.matricula_contenedor).includes(q) ||
            norm(x.naviera).includes(q) ||
            norm(x.posicion).includes(q) ||
            norm(x.matricula_camion).includes(q) ||
            norm(x.empresa_descarga).includes(q)
          )
        : combinedRaw;

      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      const total = filtered.length;
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = Math.min(from + ITEMS_PER_PAGE, total);
      setContainers(filtered.slice(from, to));
      setTotalCount(total);
      setLoading(false);
      return;
    }

    // 'contenedores_rotos' | 'contenedores_salidos' (paginare server)
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase.from(activeTab).select('*', { count: 'exact' });
    if (searchTerm) {
      const q = `%${searchTerm}%`;
      query = query.or([
        `matricula_contenedor.ilike.${q}`,
        `naviera.ilike.${q}`,
        `posicion.ilike.${q}`,
        `matricula_camion.ilike.${q}`,
        `empresa_descarga.ilike.${q}`
      ].join(','));
    }

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
  }, [activeTab, currentPage, searchTerm]);

  useEffect(() => { fetchData(); }, [fetchData, refreshFlag.current]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE)), [totalCount]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSearchTerm('');
  };

  /* ------- ADD (onAdd din AddContainerModal) ------- */
  const openAddModal = () => setIsAddModalOpen(true);

  const handleAddFromModal = async (data, isBroken) => {
    try {
      if (isBroken) {
        const { data: inserted, error } = await supabase
          .from('contenedores_rotos')
          .insert([data])
          .select('*')
          .single();
        if (error) throw error;

        // Optimistic update dacă tab-ul curent e “Defectos”
        if (activeTab === 'contenedores_rotos') {
          setContainers(prev => [{ ...inserted }, ...prev]);
          setTotalCount(c => c + 1);
        }
        // mută pe tabul corect
        setActiveTab('contenedores_rotos');
      } else {
        const { data: inserted, error } = await supabase
          .from('contenedores')
          .insert([data])
          .select('*')
          .single();
        if (error) throw error;

        // Optimistic update dacă suntem pe En Depósito
        if (activeTab === 'contenedores') {
          const newRow = { ...inserted, __from: 'contenedores' };
          setContainers(prev => [newRow, ...prev].slice(0, ITEMS_PER_PAGE)); // păstrăm pagina curentă
          setTotalCount(c => c + 1);
        } else {
          setActiveTab('contenedores');
        }
      }
    } catch (err) {
      console.error('[ADD] insert error:', err);
      alert(`Error al añadir contenedor:\n${err.message || err}`);
    } finally {
      setIsAddModalOpen(false);
      bumpRefresh();      // re-sync „adevărul” din DB
    }
  };

  /* ------- EDIT ------- */
  const openEditModal = (c) => { setSelectedContainer(c); setEditPosicion(c.posicion || ''); setIsEditModalOpen(true); };
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedContainer) return;
    const table = selectedContainer.__from === 'programados' ? 'contenedores_programados' : activeTab;
    const { error } = await supabase.from(table).update({ posicion: editPosicion || null }).eq('id', selectedContainer.id);
    if (error) { console.error(error); alert(`Error al actualizar posición:\n${error.message || error}`); }
    else {
      setContainers(prev => prev.map(c => (c.id === selectedContainer.id ? { ...c, posicion: editPosicion || null } : c)));
      bumpRefresh();
    }
    setIsEditModalOpen(false);
  };

  /* ------- SALIDA ------- */
  const openSalidaModal = (c) => { setSelectedContainer(c); setSalidaMatriculaCamion(''); setIsSalidaModalOpen(true); };

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

      const { error: insertError } = await supabase.from('contenedores_salidos').insert([salidaPayload]);
      if (insertError) { throw insertError; }

      const baseTable = selectedContainer.__from === 'programados' ? 'contenedores_programados' : 'contenedores';
      const { error: deleteError } = await supabase.from(baseTable).delete().eq('id', id);
      if (deleteError) { throw deleteError; }

      setContainers(prev => prev.filter(c => c.id !== id));
      setActiveTab('contenedores_salidos');
      bumpRefresh();
    } catch (err) {
      console.error('Error en salida:', err);
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

  const handleExportExcel = async () => {
    try {
      if (activeTab === 'contenedores') {
        const [{ data: enDeposito }, { data: programados }] = await Promise.all([
          supabase.from('contenedores').select('*').order('created_at', { ascending: false }),
          supabase.from('contenedores_programados').select('id, created_at, matricula_contenedor, naviera, tipo, posicion, empresa_descarga, fecha, hora, matricula_camion, estado').order('created_at', { ascending: false }),
        ]);

        const combined = [
          ...(enDeposito || []).map(x => ({ ...x, __from: 'contenedores' })),
          ...(programados || []).map(x => ({ ...x, __from: 'programados' })),
        ];

        const norm = (s) => String(s || '').toLowerCase();
        const q = norm(searchTerm);
        const filtered = q
          ? combined.filter(x =>
              norm(x.matricula_contenedor).includes(q) ||
              norm(x.naviera).includes(q) ||
              norm(x.posicion).includes(q) ||
              norm(x.matricula_camion).includes(q) ||
              norm(x.empresa_descarga).includes(q)
            )
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
          'Empresa Descarga (prog)': x.empresa_descarga || '',
          'Fecha Programada': x.fecha || '',
          'Hora Programada': x.hora || '',
          'Desde Programados': x.__from === 'programados' ? 'Sí' : 'No',
          'Fecha Entrada (created_at)': x.created_at ? new Date(x.created_at).toLocaleString() : '',
        }));

        exportRowsToExcel(rows, 'En Deposito', `Depot_EnDeposito_${nowFileStamp()}.xlsx`);
        return;
      }

      if (activeTab === 'contenedores_rotos') {
        const { data } = await supabase.from('contenedores_rotos').select('*').order('created_at', { ascending: false });
        const norm = (s) => String(s || '').toLowerCase();
        const q = norm(searchTerm);
        const filtered = q ? (data || []).filter(x =>
          norm(x.matricula_contenedor).includes(q) ||
          norm(x.naviera).includes(q) ||
          norm(x.posicion).includes(q) ||
          norm(x.matricula_camion).includes(q) ||
          norm(x.detalles).includes(q)
        ) : (data || []);

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
        return;
      }

      if (activeTab === 'contenedores_salidos') {
        const { data } = await supabase.from('contenedores_salidos').select('*').order('created_at', { ascending: false });
        const norm = (s) => String(s || '').toLowerCase();
        const q = norm(searchTerm);
        const filtered = q ? (data || []).filter(x =>
          norm(x.matricula_contenedor).includes(q) ||
          norm(x.naviera).includes(q) ||
          norm(x.posicion).includes(q) ||
          norm(x.matricula_camion).includes(q) ||
          norm(x.empresa_descarga).includes(q)
        ) : (data || []);
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
        return;
      }
    } catch (err) {
      console.error('[Excel export]', err);
      alert(`No se pudo generar el Excel:\n${err.message || err}`);
    }
  };

  /* ------- UI ------- */
  return (
    <Layout backgroundClassName="depotBackground">
      <div className={styles.pageWrap}>
        {/* Tabs */}
        <div className={styles.depotHeader}>
          <button className={`${styles.depotTabButton} ${activeTab === 'contenedores' ? styles.active : ''}`} onClick={() => handleTabChange('contenedores')}>En Depósito</button>
          <button className={`${styles.depotTabButton} ${activeTab === 'contenedores_rotos' ? styles.active : ''}`} onClick={() => handleTabChange('contenedores_rotos')}>Defectos</button>
          <button className={`${styles.depotTabButton} ${activeTab === 'contenedores_salidos' ? styles.active : ''}`} onClick={() => handleTabChange('contenedores_salidos')}>Salidos</button>
        </div>

        {/* Accesos rapizi */}
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
              placeholder="Buscar por matrícula, naviera, posición, camión, empresa…"
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
              {containers.map((c) => (
                <div key={`${c.__from || activeTab}-${c.id}`} className={styles.containerCard}>
                  <div className={styles.cardHeader}>
                    <div>
                      <h3 className={styles.cardMatricula}>{(c.matricula_contenedor || '').toUpperCase()}</h3>
                      <p className={styles.cardNaviera}>{c.naviera || '—'}</p>
                    </div>

                    {activeTab !== 'contenedores_salidos' && (
                      <div className={styles.cardActions}>
                        <button className={styles.cardButton} onClick={() => openEditModal(c)}>Editar</button>
                        {c.__from !== 'programados' && (
                          <button className={styles.cardButtonSalida} onClick={() => openSalidaModal(c)}>Salida</button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className={styles.cardBody}>
                    <p><strong>Fecha de entrada:</strong> {c.created_at ? new Date(c.created_at).toLocaleString() : '—'}</p>
                    {c.tipo && <p><strong>Tipo:</strong> {c.tipo}</p>}
                    {c.posicion && <p><strong>Posición:</strong> {c.posicion}</p>}
                    {c.estado && <p><strong>Estado:</strong> {c.estado}</p>}
                    {c.matricula_camion && <p><strong>Camión:</strong> {c.matricula_camion}</p>}

                    {/* info de programados vizibilă și în tab En Depósito */}
                    {c.__from === 'programados' && (
                      <>
                        <p><span className={styles.badgeOrange}>Programado</span></p>
                        {c.empresa_descarga && <p><strong>Empresa:</strong> {c.empresa_descarga}</p>}
                        {c.fecha && <p><strong>Fecha programada:</strong> {c.fecha}</p>}
                        {c.hora && <p><strong>Hora programada:</strong> {c.hora}</p>}
                      </>
                    )}

                    {/* Detalles pentru defecte/salidos */}
                    {c.detalles && <p><strong>Detalles:</strong> {c.detalles}</p>}
                    {activeTab === 'contenedores_salidos' && c.fecha_salida && (
                      <p><strong>Fecha de salida:</strong> {new Date(c.fecha_salida).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Paginación */}
            <div className={styles.paginationContainer}>
              <button className={styles.paginationButton} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Anterior</button>
              <span className={styles.pageIndicator}>Página {currentPage} de {totalPages}</span>
              <button className={styles.paginationButton} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>Siguiente</button>
            </div>
          </>
        )}

        {/* Modale */}
        <AddContainerModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddFromModal}   // 🔴 Asta este cheia
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
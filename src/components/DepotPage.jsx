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
      d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
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
        // Afișăm o alertă pentru a notifica utilizatorul despre eroare
        alert('A apărut o eroare la adăugarea containerului defect. Vă rugăm să încercați din nou.');
      } else {
        // dacă a reușit, trecem la tabul Defectos
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
    // extragem id și created_at pentru a nu le trimite în tabelul salidos
    const {
      id,
      created_at,
      estado: selectedEstado,
      detalles: selectedDetalles,
      ...rest
    } = selectedContainer;

    // construim noua înregistrare; garantăm existența câmpurilor estado și detalles
    const newRecord = {
      ...rest,
      estado: selectedEstado || null,
      detalles: selectedDetalles || null,
      // preluăm matricula_camion din formular; dacă este gol, trimitem null
      matricula_camion: salidaMatriculaCamion || null,
    };

    // inserăm în tabela contenedores_salidos
    const { error: insertError } = await supabase
      .from('contenedores_salidos')
      .insert([newRecord]);
    if (insertError) {
      console.error('Error moving container to salidos:', insertError);
      alert('A apărut o eroare la înregistrarea ieșirii containerului. Vă rugăm să încercați din nou.');
    } else {
      // dacă insertul reușește, eliminăm înregistrarea din tabela activă
      const { error: deleteError } = await supabase
        .from(activeTab)
        .delete()
        .eq('id', id);
      if (deleteError) {
        console.error('Error deleting container:', deleteError);
        alert('A apărut o eroare la ștergerea containerului din tabla curentă.');
      } else {
        // actualizăm state-ul local pentru a elimina containerul
        setContainers((prev) => prev.filter((c) => c.id !== id));
        // comutăm pe tab-ul Salidos pentru a vedea containerul transferat
        setActiveTab('contenedores_salidos');
      }
    }
    setIsSalidaModalOpen(false);
  };

  // Nu verificăm rolul aici – logica de autorizare este gestionată în altă parte.

  return (
    <Layout backgroundClassName="depotBackground">
      {/* ... restul codului rămâne neschimbat ... */}
    </Layout>
  );
}

export default DepotPage;
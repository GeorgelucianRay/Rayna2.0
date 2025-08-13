import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from './Layout';
import { supabase } from '../supabaseClient';
import styles from './SchedulerPage.module.css';

// ... (aici poți adăuga pictograme dacă vrei)

function SchedulerPage() {
  const navigate = useNavigate();
  const [scheduledContainers, setScheduledContainers] = useState([]);
  const [containersForScheduling, setContainersForScheduling] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  
  // Stări pentru formularul de programare
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [client, setClient] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [camionMatricula, setCamionMatricula] = useState('');

  // Efect pentru a încărca lista de containere programate și lista de containere disponibile
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // TODO: Logica de a încărca lista de containere programate
      // Aici ai putea avea o nouă tabelă în Supabase, de exemplu 'contenedores_programados'
      // const { data: scheduled, error: scheduledError } = await supabase.from('contenedores_programados').select('*');
      
      // Încărcăm containerele disponibile pentru programare
      const { data: available, error: availableError } = await supabase.from('contenedores').select('*');
      
      if (!availableError) {
        setContainersForScheduling(available);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const openScheduleModal = (container) => {
    setSelectedContainer(container);
    setClient('');
    setDate('');
    setTime('');
    setCamionMatricula('');
    setIsScheduleModalOpen(true);
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedContainer) return;

    // TODO: Adaugă logica de a insera în 'contenedores_programados'
    // și de a scoate din 'contenedores'

    setIsScheduleModalOpen(false);
  };

  const handleDone = async (containerId) => {
    // TODO: Implementează logica de mutare a containerului
    // din 'contenedores_programados' în 'contenedores_salidos'
    
    alert(`Comanda pentru containerul ${containerId} a fost marcată ca finalizată și mutată în 'salidos'.`);
  };

  return (
    <Layout>
      <div className={styles.schedulerHeader}>
        <h1>Programar Contenedor</h1>
        <button className={styles.nuevoButton} onClick={() => openScheduleModal(null)}>Nuevo</button>
      </div>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div className={styles.schedulerGrid}>
          {/* Aici vei randa lista de containere programate, similar cu imaginea */}
          {scheduledContainers.length === 0 ? (
            <p>No hay contenedores programados.</p>
          ) : (
            // Aici va veni logica de mapare a listei
            // {scheduledContainers.map(container => <SchedulerCard key={container.id} container={container} />)}
            <p>Lista de containere programate va veni aici.</p>
          )}
        </div>
      )}

      {/* Aici poți adăuga modalul pentru programare, similar cu cele din DepotPage */}
      {isScheduleModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Programar Contenedor</h3>
            <form onSubmit={handleScheduleSubmit}>
              {/* Formularul va include:
                  - Select pentru container (din `containersForScheduling`)
                  - Câmpuri pentru client, dată, oră, matriculă camion */}
              <p>Formularul de programare va veni aici.</p>
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelButton} onClick={() => setIsScheduleModalOpen(false)}>Cancelar</button>
                <button type="submit" className={styles.saveButton}>Programar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default SchedulerPage;

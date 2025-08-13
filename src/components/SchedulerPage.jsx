import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from './Layout';
import { supabase } from '../supabaseClient';
import styles from './SchedulerPage.module.css';

const STATUS = ['Pendiente','Programado','En progreso','Completado'];

function SchedulerPage() {
  const navigate = useNavigate();
  const [scheduledContainers, setScheduledContainers] = useState([]);
  const [containersForScheduling, setContainersForScheduling] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  // Formular programare
  const [selectedContainerId, setSelectedContainerId] = useState('');
  const [client, setClient] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [camionMatricula, setCamionMatricula] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [search, setSearch] = useState('');
  const [calendarDate, setCalendarDate] = useState('');

  // === Load data
  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // programări curente
      const { data: programados, error: prErr } = await supabase
        .from('contenedores_programados')
        .select('*')
        .order('fecha', { ascending: true })
        .order('hora', { ascending: true });

      if (prErr) console.error(prErr);

      // containere active disponibile pt. programare (din `contenedores`)
      const { data: activos, error: avErr } = await supabase
        .from('contenedores')
        .select('*')
        .order('created_at', { ascending: false });

      if (avErr) console.error(avErr);

      setScheduledContainers(programados || []);
      setContainersForScheduling(activos || []);
      setLoading(false);
    };
    load();
  }, []);

  // === Helpers UI
  const filteredScheduled = useMemo(() => {
    return (scheduledContainers || []).filter(it => {
      const okStatus = statusFilter === 'Todos' ? true : it.status === statusFilter;
      const okSearch = `${it.cliente || ''} ${it.camion_matricula || ''}`.toLowerCase().includes(search.toLowerCase());
      const okDate = calendarDate ? it.fecha === calendarDate : true;
      return okStatus && okSearch && okDate;
    });
  }, [scheduledContainers, statusFilter, search, calendarDate]);

  // === Open modal
  const openScheduleModal = (prefillId) => {
    setSelectedContainerId(prefillId || '');
    setClient('');
    setDate('');
    setTime('');
    setCamionMatricula('');
    setIsScheduleModalOpen(true);
  };

  // === Create programare
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedContainerId) {
      alert('Alege un container.');
      return;
    }

    const payload = {
      contenedor_id: selectedContainerId,
      cliente: client || null,
      fecha: date || null,
      hora: time || null,
      camion_matricula: camionMatricula || null,
      status: 'Pendiente'
    };

    // 1) insert în programados
    const { data: inserted, error: insErr } = await supabase
      .from('contenedores_programados')
      .insert(payload)
      .select()
      .single();

    if (insErr) {
      console.error(insErr);
      alert('Eroare la programare.');
      return;
    }

    // 2) scoate din `contenedores` (nu mai apare ca „activ” liber)
    const { error: delErr } = await supabase
      .from('contenedores')
      .delete()
      .eq('id', selectedContainerId);

    if (delErr) {
      console.error(delErr);
      alert('A fost creată programarea, dar nu s-a putut elimina containerul din lista activă.');
    }

    // State optimistic
    setScheduledContainers(prev => [inserted, ...prev]);
    setContainersForScheduling(prev => prev.filter(c => c.id !== selectedContainerId));
    setIsScheduleModalOpen(false);
  };

  // === Update status
  const updateStatus = async (rowId, newStatus) => {
    const prev = scheduledContainers;
    setScheduledContainers(list => list.map(x => x.id === rowId ? { ...x, status: newStatus } : x));

    const { error } = await supabase
      .from('contenedores_programados')
      .update({ status: newStatus })
      .eq('id', rowId);

    if (error) {
      console.error(error);
      setScheduledContainers(prev);
      alert('Nu s-a putut actualiza statusul.');
    }
  };

  // === Salida (mută în `contenedores_salidos` și șterge din programados)
  const handleDone = async (row) => {
    // 1) insert în `contenedores_salidos` (conform regulii 4)
    const salidaPayload = {
      // Copiem tot ce avem; câmpurile non-obligatorii pot fi nule (regula 1)
      contenedor_id: row.contenedor_id,
      cliente: row.cliente,
      detalles: null,
      estado: null,            // nu știm „lleno/vacio” aici -> rămâne null (permis)
      fecha: row.fecha,
      hora: row.hora,
      camion_matricula: row.camion_matricula,
      created_at: new Date().toISOString()
    };

    const { error: insErr } = await supabase
      .from('contenedores_salidos')
      .insert(salidaPayload);

    if (insErr) {
      console.error(insErr);
      alert('Nu s-a putut marca ca „Salida”.');
      return;
    }

    // 2) șterge din `contenedores_programados`
    const { error: delErr } = await supabase
      .from('contenedores_programados')
      .delete()
      .eq('id', row.id);

    if (delErr) {
      console.error(delErr);
      alert('S-a inserat în „salidos”, dar nu s-a șters din programări.');
      return;
    }

    // 3) UI
    setScheduledContainers(prev => prev.filter(x => x.id !== row.id));
    alert(`Containerul a fost mutat în 'contenedores_salidos'.`);
  };

  // === Delete programare (revine containerul în „contenedores” ca activ)
  const handleDelete = async (row) => {
    if (!confirm('Ștergi programarea? Containerul va reveni în lista activă.')) return;

    // 1) Șterge programarea
    const { error: delErr } = await supabase
      .from('contenedores_programados')
      .delete()
      .eq('id', row.id);

    if (delErr) {
      console.error(delErr);
      alert('Nu s-a putut șterge programarea.');
      return;
    }

    // 2) Reintrodu în `contenedores` (valoarea minimă: doar id-ul original; restul pot fi nule)
    const { error: insErr } = await supabase
      .from('contenedores')
      .insert({ id: row.contenedor_id });

    if (insErr) {
      console.error(insErr);
      // nu blocăm UI, doar avertizăm
      alert('Programarea a fost ștearsă, dar containerul nu a revenit în lista activă.');
    }

    // 3) UI
    setScheduledContainers(prev => prev.filter(x => x.id !== row.id));
    setContainersForScheduling(prev => [{ id: row.contenedor_id }, ...prev]);
  };

  return (
    <Layout>
      <div className={styles.schedulerHeader}>
        <h1>Programar Contenedor</h1>
        <button className={styles.nuevoButton} onClick={() => openScheduleModal('')}>
          Nuevo
        </button>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.chips}>
          {['Todos', ...STATUS].map(s => (
            <button
              key={s}
              className={`${styles.chip} ${statusFilter === s ? styles.chipActive : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s}
            </button>
          ))}
        </div>

        <div className={styles.inputs}>
          <div className={styles.search}>
            <span>🔎</span>
            <input
              placeholder="Buscar..."
              value={search}
              onChange={(e)=>setSearch(e.target.value)}
            />
          </div>
          <input
            type="date"
            className={styles.date}
            value={calendarDate}
            onChange={(e)=>setCalendarDate(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div className={styles.schedulerGrid}>
          {filteredScheduled.length === 0 ? (
            <p className={styles.empty}>No hay contenedores programados.</p>
          ) : (
            <ul className={styles.list}>
              {filteredScheduled.map(row => (
                <li key={row.id} className={`${styles.item} card`}>
                  <div className={styles.itemLeft}>
                    <div className={styles.itemTop}>
                      <span className={styles.dot} />
                      <span className={styles.cid}>#{String(row.contenedor_id).slice(0,8)}</span>
                      <span className={`${styles.badge} ${styles[`b${row.status.replace(' ','')}`]}`}>
                        {row.status}
                      </span>
                    </div>
                    <div className={styles.meta}>
                      <span className={styles.cliente}>{row.cliente || '—'}</span>
                      <span className={styles.time}>⏱ {row.hora || '—'}</span>
                      <span className={styles.fecha}>📅 {row.fecha || '—'}</span>
                      <span className={styles.plate}>🚚 {row.camion_matricula || '—'}</span>
                    </div>
                  </div>
                  <div className={styles.actions}>
                    {STATUS.map(s => (
                      <button key={s} className={styles.actionMini} onClick={()=>updateStatus(row.id, s)}>{s}</button>
                    ))}
                    <button className={styles.actionOk} onClick={()=>handleDone(row)}>Salida</button>
                    <button className={styles.actionGhost} onClick={()=>handleDelete(row)}>Eliminar</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Modal programare */}
      {isScheduleModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Programar Contenedor</h3>
              <button className={styles.closeButton} onClick={()=>setIsScheduleModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleScheduleSubmit} className={styles.modalBody}>
              <div className={styles.inputGroup}>
                <label>Container</label>
                <select
                  className={styles.select}
                  value={selectedContainerId}
                  onChange={(e)=>setSelectedContainerId(e.target.value)}
                >
                  <option value="">— alege —</option>
                  {containersForScheduling.map(c => (
                    <option key={c.id} value={c.id}>{c.id}</option>
                  ))}
                </select>
              </div>

              <div className={styles.inputGrid}>
                <div className={styles.inputGroup}>
                  <label>Cliente</label>
                  <input value={client} onChange={e=>setClient(e.target.value)} placeholder="Empresa / Cliente" />
                </div>
                <div className={styles.inputGroup}>
                  <label>Matrícula camión</label>
                  <input value={camionMatricula} onChange={e=>setCamionMatricula(e.target.value)} placeholder="1234 ABC" />
                </div>
                <div className={styles.inputGroup}>
                  <label>Fecha</label>
                  <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Hora</label>
                  <input type="time" value={time} onChange={e=>setTime(e.target.value)} />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelButton} onClick={()=>setIsScheduleModalOpen(false)}>Cancelar</button>
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
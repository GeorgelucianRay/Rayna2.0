import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Layout from './Layout';
import styles from './ChoferProfilePage.module.css';

/* Iconos */
const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
  </svg>
);
const CloseIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 12H5"></path>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

export default function ChoferProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState(null);
  const [camioane, setCamioane] = useState([]);
  const [remorci, setRemorci] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editableProfile, setEditableProfile] = useState(null);

  // modal “add camion/remorca”
  const [addTruckOpen, setAddTruckOpen] = useState(false);
  const [addTrailerOpen, setAddTrailerOpen] = useState(false);
  const [newTruck, setNewTruck] = useState({ matricula: '', marca: '', fecha_itv: '' });
  const [newTrailer, setNewTrailer] = useState({ matricula: '', tipo: '', fecha_itv: '' });
  const [savingNew, setSavingNew] = useState(false);

  const fetchLists = async () => {
    // IMPORTANT: select minim (mai rapid + mai puține probleme)
    const [{ data: cams, error: eC }, { data: rems, error: eR }] = await Promise.all([
      supabase.from('camioane').select('id, matricula').order('matricula', { ascending: true }),
      supabase.from('remorci').select('id, matricula').order('matricula', { ascending: true }),
    ]);
    if (eC) console.warn('camioane select error:', eC.message);
    if (eR) console.warn('remorci select error:', eR.message);

    setCamioane(cams || []);
    setRemorci(rems || []);
  };

  const fetchProfile = async () => {
    const { data: prof, error } = await supabase
      .from('profiles')
      .select('id, nombre_completo, cap_expirare, carnet_caducidad, tiene_adr, adr_caducidad, camion_id, remorca_id, camioane:camion_id(id, matricula, fecha_itv), remorci:remorca_id(id, matricula, fecha_itv)')
      .eq('id', id)
      .single();
    if (error) throw error;
    setProfileData(prof);
  };

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchProfile(), fetchLists()]);
      } catch (err) {
        console.error(err);
        alert('No se pudo cargar el perfil del chófer.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const openEdit = () => {
    if (!profileData) return;
    // clonează doar câmpurile editabile
    setEditableProfile({
      id: profileData.id,
      nombre_completo: profileData.nombre_completo ?? '',
      cap_expirare: profileData.cap_expirare ?? '',
      carnet_caducidad: profileData.carnet_caducidad ?? '',
      tiene_adr: !!profileData.tiene_adr,
      adr_caducidad: profileData.adr_caducidad ?? '',
      camion_id: profileData.camion_id ?? '',
      remorca_id: profileData.remorca_id ?? '',
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      if (!editableProfile?.id) return;

      // whitelist strict (NU trimite * / join objects)
      const payload = {
        nombre_completo: (editableProfile.nombre_completo || '').trim(),
        cap_expirare: editableProfile.cap_expirare || null,
        carnet_caducidad: editableProfile.carnet_caducidad || null,
        tiene_adr: !!editableProfile.tiene_adr,
        adr_caducidad: editableProfile.tiene_adr ? (editableProfile.adr_caducidad || null) : null,
        camion_id: editableProfile.camion_id === '' ? null : editableProfile.camion_id,
        remorca_id: editableProfile.remorca_id === '' ? null : editableProfile.remorca_id,
      };

      const { error } = await supabase.from('profiles').update(payload).eq('id', editableProfile.id);
      if (error) throw error;

      await fetchProfile();
      setIsEditOpen(false);
      alert('¡Perfil del chófer actualizado con éxito!');
    } catch (err) {
      console.error(err);
      alert(`Error al actualizar el perfil: ${err.message}`);
    }
  };

  const saveNewTruck = async () => {
    const matricula = (newTruck.matricula || '').trim().toUpperCase();
    if (!matricula) return alert('Introduce la matrícula del camión.');

    setSavingNew(true);
    try {
      const insertPayload = {
        matricula,
        marca: (newTruck.marca || '').trim() || null,
        fecha_itv: newTruck.fecha_itv || null,
      };

      const { data, error } = await supabase
        .from('camioane')
        .insert(insertPayload)
        .select('id, matricula')
        .single();

      if (error) throw error;

      await fetchLists();

      // selectează automat camionul nou în edit
      setEditableProfile((p) => p ? { ...p, camion_id: data.id } : p);

      setNewTruck({ matricula: '', marca: '', fecha_itv: '' });
      setAddTruckOpen(false);
    } catch (e) {
      console.error(e);
      alert(`No se pudo crear el camión: ${e.message}`);
    } finally {
      setSavingNew(false);
    }
  };

  const saveNewTrailer = async () => {
    const matricula = (newTrailer.matricula || '').trim().toUpperCase();
    if (!matricula) return alert('Introduce la matrícula del remolque.');

    setSavingNew(true);
    try {
      const insertPayload = {
        matricula,
        tipo: (newTrailer.tipo || '').trim() || null,
        fecha_itv: newTrailer.fecha_itv || null,
      };

      const { data, error } = await supabase
        .from('remorci')
        .insert(insertPayload)
        .select('id, matricula')
        .single();

      if (error) throw error;

      await fetchLists();

      // selectează automat remorca nouă în edit
      setEditableProfile((p) => p ? { ...p, remorca_id: data.id } : p);

      setNewTrailer({ matricula: '', tipo: '', fecha_itv: '' });
      setAddTrailerOpen(false);
    } catch (e) {
      console.error(e);
      alert(`No se pudo crear el remolque: ${e.message}`);
    } finally {
      setSavingNew(false);
    }
  };

  if (loading) {
    return (
      <Layout backgroundClassName="profile-background">
        <div className={styles.loading}>Cargando…</div>
      </Layout>
    );
  }

  if (!profileData) {
    return (
      <Layout backgroundClassName="profile-background">
        <div className={styles.page}>
          <p style={{ textAlign: 'center' }}>No se pudo cargar el perfil del chófer.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout backgroundClassName="profile-background">
      <div className={styles.page}>
        {/* Header */}
        <div className={styles.header}>
          <h1>Perfil del Chófer</h1>
          <div className={styles.headerBtns}>
            <button className={styles.editBtn} onClick={openEdit}>
              <EditIcon /> Editar perfil
            </button>
            <button className={styles.backBtn} onClick={() => navigate('/choferes-finder')}>
              <BackIcon /> Volver
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className={styles.cardsGrid}>
          <section className={styles.card}>
            <div className={styles.cardTitle}>Conductor</div>
            <div className={styles.rows2}>
              <div>
                <span className={styles.k}>Nombre completo</span>
                <span className={styles.v}>{profileData.nombre_completo || '—'}</span>
              </div>
              <div>
                <span className={styles.k}>CAP</span>
                <span className={styles.v}>{profileData.cap_expirare || '—'}</span>
              </div>
              <div>
                <span className={styles.k}>Carnet conducir</span>
                <span className={styles.v}>{profileData.carnet_caducidad || '—'}</span>
              </div>
              <div>
                <span className={styles.k}>ADR</span>
                <span className={styles.v}>
                  {profileData.tiene_adr ? (profileData.adr_caducidad || 'Sí') : 'No'}
                </span>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardTitleRow}>
              <div className={styles.cardTitle}>Camión</div>
              {profileData.camion_id ? (
                <Link to={`/camion/${profileData.camion_id}`} className={styles.ghostBtn}>
                  Ver ficha
                </Link>
              ) : (
                <span className={styles.tag}>No asignado</span>
              )}
            </div>
            <div className={styles.rows2}>
              <div>
                <span className={styles.k}>Matrícula</span>
                <span className={styles.v}>{profileData.camioane?.matricula || '—'}</span>
              </div>
              <div>
                <span className={styles.k}>ITV</span>
                <span className={styles.v}>{profileData.camioane?.fecha_itv || '—'}</span>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardTitleRow}>
              <div className={styles.cardTitle}>Remolque</div>
              {profileData.remorca_id ? (
                <Link to={`/remorca/${profileData.remorca_id}`} className={styles.ghostBtn}>
                  Ver ficha
                </Link>
              ) : (
                <span className={styles.tag}>No asignado</span>
              )}
            </div>
            <div className={styles.rows2}>
              <div>
                <span className={styles.k}>Matrícula</span>
                <span className={styles.v}>{profileData.remorci?.matricula || '—'}</span>
              </div>
              <div>
                <span className={styles.k}>ITV</span>
                <span className={styles.v}>{profileData.remorci?.fecha_itv || '—'}</span>
              </div>
            </div>
          </section>
        </div>

        {/* Modal Editar */}
        {isEditOpen && editableProfile && (
          <div className={styles.modalOverlay} onClick={() => setIsEditOpen(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>Editar perfil — {profileData.nombre_completo}</h3>
                <button className={styles.iconBtn} onClick={() => setIsEditOpen(false)} aria-label="Cerrar">
                  <CloseIcon />
                </button>
              </div>

              <form className={styles.modalBody} onSubmit={handleUpdate}>
                <div className={styles.inputGroup}>
                  <label>Nombre completo</label>
                  <input
                    type="text"
                    value={editableProfile.nombre_completo || ''}
                    onChange={(e) => setEditableProfile((p) => ({ ...p, nombre_completo: e.target.value }))}
                  />
                </div>

                <div className={styles.grid2}>
                  <div className={styles.inputGroup}>
                    <label>Caducidad CAP</label>
                    <input
                      type="date"
                      value={editableProfile.cap_expirare || ''}
                      onChange={(e) => setEditableProfile((p) => ({ ...p, cap_expirare: e.target.value }))}
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Caducidad Carnet</label>
                    <input
                      type="date"
                      value={editableProfile.carnet_caducidad || ''}
                      onChange={(e) => setEditableProfile((p) => ({ ...p, carnet_caducidad: e.target.value }))}
                    />
                  </div>
                </div>

                <div className={styles.grid2}>
                  <div className={styles.inputGroup}>
                    <label>¿Tiene ADR?</label>
                    <select
                      value={String(!!editableProfile.tiene_adr)}
                      onChange={(e) => setEditableProfile((p) => ({ ...p, tiene_adr: e.target.value === 'true' }))}
                    >
                      <option value="false">No</option>
                      <option value="true">Sí</option>
                    </select>
                  </div>
                  {editableProfile.tiene_adr && (
                    <div className={styles.inputGroup}>
                      <label>Caducidad ADR</label>
                      <input
                        type="date"
                        value={editableProfile.adr_caducidad || ''}
                        onChange={(e) => setEditableProfile((p) => ({ ...p, adr_caducidad: e.target.value }))}
                      />
                    </div>
                  )}
                </div>

                {/* Camion */}
                <div className={styles.grid2}>
                  <div className={styles.inputGroup}>
                    <label>Camión asignado</label>
                    <select
                      value={editableProfile.camion_id || ''}
                      onChange={(e) => setEditableProfile((p) => ({ ...p, camion_id: e.target.value }))}
                    >
                      <option value="">Ninguno</option>
                      {camioane.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.matricula}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.inputGroup}>
                    <label>&nbsp;</label>
                    <button
                      type="button"
                      className={styles.btnGhost}
                      onClick={() => setAddTruckOpen(true)}
                    >
                      + Añadir camión
                    </button>
                  </div>
                </div>

                {/* Remorca */}
                <div className={styles.grid2}>
                  <div className={styles.inputGroup}>
                    <label>Remolque asignado</label>
                    <select
                      value={editableProfile.remorca_id || ''}
                      onChange={(e) => setEditableProfile((p) => ({ ...p, remorca_id: e.target.value }))}
                    >
                      <option value="">Ninguno</option>
                      {remorci.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.matricula}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.inputGroup}>
                    <label>&nbsp;</label>
                    <button
                      type="button"
                      className={styles.btnGhost}
                      onClick={() => setAddTrailerOpen(true)}
                    >
                      + Añadir remolque
                    </button>
                  </div>
                </div>

                <div className={styles.modalFooter}>
                  <button type="button" className={styles.btnGhost} onClick={() => setIsEditOpen(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className={styles.btnPrimary}>
                    Guardar cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal ADD CAMION */}
        {addTruckOpen && (
          <div className={styles.modalOverlay} onClick={() => setAddTruckOpen(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>Nuevo camión</h3>
                <button className={styles.iconBtn} onClick={() => setAddTruckOpen(false)} aria-label="Cerrar">
                  <CloseIcon />
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.inputGroup}>
                  <label>Matrícula *</label>
                  <input
                    value={newTruck.matricula}
                    onChange={(e) => setNewTruck((p) => ({ ...p, matricula: e.target.value }))}
                    placeholder="1234ABC"
                  />
                </div>
                <div className={styles.grid2}>
                  <div className={styles.inputGroup}>
                    <label>Marca</label>
                    <input
                      value={newTruck.marca}
                      onChange={(e) => setNewTruck((p) => ({ ...p, marca: e.target.value }))}
                      placeholder="Scania / DAF..."
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>ITV</label>
                    <input
                      type="date"
                      value={newTruck.fecha_itv}
                      onChange={(e) => setNewTruck((p) => ({ ...p, fecha_itv: e.target.value }))}
                    />
                  </div>
                </div>

                <div className={styles.modalFooter}>
                  <button type="button" className={styles.btnGhost} onClick={() => setAddTruckOpen(false)} disabled={savingNew}>
                    Cancelar
                  </button>
                  <button type="button" className={styles.btnPrimary} onClick={saveNewTruck} disabled={savingNew}>
                    {savingNew ? 'Guardando…' : 'Crear'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal ADD REMOLQUE */}
        {addTrailerOpen && (
          <div className={styles.modalOverlay} onClick={() => setAddTrailerOpen(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>Nuevo remolque</h3>
                <button className={styles.iconBtn} onClick={() => setAddTrailerOpen(false)} aria-label="Cerrar">
                  <CloseIcon />
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.inputGroup}>
                  <label>Matrícula *</label>
                  <input
                    value={newTrailer.matricula}
                    onChange={(e) => setNewTrailer((p) => ({ ...p, matricula: e.target.value }))}
                    placeholder="R-1234-XYZ"
                  />
                </div>
                <div className={styles.grid2}>
                  <div className={styles.inputGroup}>
                    <label>Tipo</label>
                    <input
                      value={newTrailer.tipo}
                      onChange={(e) => setNewTrailer((p) => ({ ...p, tipo: e.target.value }))}
                      placeholder="Frigo / Lona / Cisterna..."
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>ITV</label>
                    <input
                      type="date"
                      value={newTrailer.fecha_itv}
                      onChange={(e) => setNewTrailer((p) => ({ ...p, fecha_itv: e.target.value }))}
                    />
                  </div>
                </div>

                <div className={styles.modalFooter}>
                  <button type="button" className={styles.btnGhost} onClick={() => setAddTrailerOpen(false)} disabled={savingNew}>
                    Cancelar
                  </button>
                  <button type="button" className={styles.btnPrimary} onClick={saveNewTrailer} disabled={savingNew}>
                    {savingNew ? 'Guardando…' : 'Crear'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
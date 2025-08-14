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

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const { data: prof, error: e1 } = await supabase
          .from('profiles')
          .select('*, camioane:camion_id(*), remorci:remorca_id(*)')
          .eq('id', id)
          .single();
        if (e1) throw e1;
        setProfileData(prof);

        const { data: cams } = await supabase.from('camioane').select('*').order('matricula', { ascending: true });
        const { data: rems } = await supabase.from('remorci').select('*').order('matricula', { ascending: true });
        setCamioane(cams || []);
        setRemorci(rems || []);
      } catch (err) {
        console.error(err);
        alert('No se pudo cargar el perfil del chófer.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id]);

  const openEdit = () => {
    if (!profileData) return;
    setEditableProfile({ ...profileData });
    setIsEditOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const { id: pid, role, camioane: _c, remorci: _r, ...rest } = editableProfile || {};
      const payload = {
        ...rest,
        camion_id: rest.camion_id === '' ? null : rest.camion_id,
        remorca_id: rest.remorca_id === '' ? null : rest.remorca_id,
      };
      const { error } = await supabase.from('profiles').update(payload).eq('id', pid);
      if (error) throw error;

      const { data: refreshed } = await supabase
        .from('profiles')
        .select('*, camioane:camion_id(*), remorci:remorca_id(*)')
        .eq('id', id)
        .single();
      setProfileData(refreshed);
      setIsEditOpen(false);
      alert('¡Perfil del chófer actualizado con éxito!');
    } catch (err) {
      alert(`Error al actualizar el perfil: ${err.message}`);
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
            <button className={styles.backBtn} onClick={() => navigate('/choferes')}>
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
                <button className={styles.iconBtn} onClick={() => setIsEditOpen(false)}>
                  <CloseIcon />
                </button>
              </div>

              <form className={styles.modalBody} onSubmit={handleUpdate}>
                <div className={styles.inputGroup}>
                  <label>Nombre completo</label>
                  <input
                    type="text"
                    value={editableProfile.nombre_completo || ''}
                    onChange={(e) =>
                      setEditableProfile((p) => ({ ...p, nombre_completo: e.target.value }))
                    }
                  />
                </div>

                <div className={styles.grid2}>
                  <div className={styles.inputGroup}>
                    <label>Caducidad CAP</label>
                    <input
                      type="date"
                      value={editableProfile.cap_expirare || ''}
                      onChange={(e) =>
                        setEditableProfile((p) => ({ ...p, cap_expirare: e.target.value }))
                      }
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Caducidad Carnet</label>
                    <input
                      type="date"
                      value={editableProfile.carnet_caducidad || ''}
                      onChange={(e) =>
                        setEditableProfile((p) => ({ ...p, carnet_caducidad: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className={styles.grid2}>
                  <div className={styles.inputGroup}>
                    <label>¿Tiene ADR?</label>
                    <select
                      value={String(!!editableProfile.tiene_adr)}
                      onChange={(e) =>
                        setEditableProfile((p) => ({ ...p, tiene_adr: e.target.value === 'true' }))
                      }
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
                        onChange={(e) =>
                          setEditableProfile((p) => ({ ...p, adr_caducidad: e.target.value }))
                        }
                      />
                    </div>
                  )}
                </div>

                <div className={styles.inputGroup}>
                  <label>Camión asignado</label>
                  <select
                    value={editableProfile.camion_id || ''}
                    onChange={(e) =>
                      setEditableProfile((p) => ({ ...p, camion_id: e.target.value }))
                    }
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
                  <label>Remolque asignado</label>
                  <select
                    value={editableProfile.remorca_id || ''}
                    onChange={(e) =>
                      setEditableProfile((p) => ({ ...p, remorca_id: e.target.value }))
                    }
                  >
                    <option value="">Ninguno</option>
                    {remorci.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.matricula}
                      </option>
                    ))}
                  </select>
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
      </div>
    </Layout>
  );
}
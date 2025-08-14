import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import Layout from './Layout';
import Vacaciones from './VacacionesStandalone';
import styles from './MiPerfilPage.module.css';

/* Icone */
const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
  </svg>
);
const CloseIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line>
  </svg>
);
const AlarmIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle><path d="M12 8v4l2 2"></path>
  </svg>
);

/* Expirări */
const calculatePersonalExpirations = (profile) => {
  if (!profile) return [];
  const alarms = [];
  const today = new Date(); today.setHours(0,0,0,0);
  const plus30 = new Date(today); plus30.setDate(today.getDate()+30);

  const push = (dateString, ownerName, docType) => {
    if (!dateString) return;
    const d = new Date(dateString);
    if (d < today) {
      const days = Math.floor((today - d) / 86400000);
      alarms.push({ message: `El ${docType} para ${ownerName} ha caducado hace ${days} días.`, days: -days, expired: true });
    } else if (d <= plus30) {
      const days = Math.ceil((d - today) / 86400000);
      alarms.push({ message: `El ${docType} para ${ownerName} caduca en ${days} días.`, days, expired: false });
    }
  };

  push(profile.cap_expirare, 'ti', 'Certificado CAP');
  push(profile.carnet_caducidad, 'ti', 'Permiso de Conducir');
  if (profile.tiene_adr) push(profile.adr_caducidad, 'ti', 'Certificado ADR');
  if (profile.camioane) push(profile.camioane.fecha_itv, profile.camioane.matricula, 'ITV del Camión');
  if (profile.remorci) push(profile.remorci.fecha_itv, profile.remorci.matricula, 'ITV del Remolque');

  return alarms.sort((a,b)=>a.days-b.days);
};

export default function MiPerfilPage() {
  const { user, profile: authProfile, loading, setProfile: setAuthProfile } = useAuth();
  const navigate = useNavigate();

  const [personalAlarms, setPersonalAlarms] = useState([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isVacOpen, setIsVacOpen] = useState(false);
  const [editableProfile, setEditableProfile] = useState(null);

  useEffect(() => {
    if (authProfile) setPersonalAlarms(calculatePersonalExpirations(authProfile));
  }, [authProfile]);

  const openEdit = () => {
    if (!authProfile) return;
    setEditableProfile({ ...authProfile, new_camion_matricula: '', new_remorca_matricula: '' });
    setIsEditOpen(true);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      let camionIdToUpdate = authProfile.camion_id;
      let remorcaIdToUpdate = authProfile.remorca_id;

      if (!camionIdToUpdate && editableProfile.new_camion_matricula) {
        const { data: newCam, error } = await supabase
          .from('camioane')
          .insert({ matricula: editableProfile.new_camion_matricula })
          .select()
          .single();
        if (error) throw error;
        camionIdToUpdate = newCam.id;
      }
      if (!remorcaIdToUpdate && editableProfile.new_remorca_matricula) {
        const { data: newRem, error } = await supabase
          .from('remorci')
          .insert({ matricula: editableProfile.new_remorca_matricula })
          .select()
          .single();
        if (error) throw error;
        remorcaIdToUpdate = newRem.id;
      }

      const payload = {
        nombre_completo: editableProfile.nombre_completo,
        cap_expirare: editableProfile.cap_expirare || null,
        carnet_caducidad: editableProfile.carnet_caducidad || null,
        tiene_adr: editableProfile.tiene_adr,
        adr_caducidad: editableProfile.tiene_adr ? (editableProfile.adr_caducidad || null) : null,
        camion_id: camionIdToUpdate || null,
        remorca_id: remorcaIdToUpdate || null,
      };

      const { error: upErr } = await supabase.from('profiles').update(payload).eq('id', user.id);
      if (upErr) throw upErr;

      const { data: fresh } = await supabase
        .from('profiles')
        .select('*, camioane:camion_id(*), remorci:remorca_id(*)')
        .eq('id', user.id)
        .maybeSingle();
      setAuthProfile(fresh);

      alert('Perfil actualizado con éxito!');
      setIsEditOpen(false);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const gotoVeh = (id, type) => {
    if (!id) return;
    if (type === 'camion') navigate(`/camion/${id}`);
    else navigate(`/remorca/${id}`);
  };

  if (loading || !authProfile) {
    return <div className={styles.loadingScreen}>Cargando…</div>;
  }

  return (
    <Layout backgroundClassName="profile-background">
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.h1}>Mi Perfil</h1>
        <button className={styles.editBtn} onClick={openEdit}>
          <EditIcon /> Editar Perfil
        </button>
      </div>

      {/* Coloană unică cu carduri + widget Vacaciones */}
      <div className={styles.leftCol}>
        {personalAlarms.length > 0 && (
          <div className={`${styles.card} ${styles.cardAlert}`}>
            <div className={styles.alertHead}>
              <span className={styles.alertIcon}><AlarmIcon/></span>
              <h3>Mis alertas de caducidad</h3>
            </div>
            <ul className={styles.alertList}>
              {personalAlarms.map((a, i) => (
                <li key={i} className={a.expired ? styles.alertExpired : ''}>{a.message}</li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.tileGrid}>
          <div className={styles.tile}><span className={styles.tileLabel}>Nombre</span><strong>{authProfile.nombre_completo || 'No completado'}</strong></div>
          <div className={styles.tile}><span className={styles.tileLabel}>Caducidad CAP</span><strong>{authProfile.cap_expirare || 'N/A'}</strong></div>
          <div className={styles.tile}><span className={styles.tileLabel}>Caducidad Carnet</span><strong>{authProfile.carnet_caducidad || 'N/A'}</strong></div>
          <div className={styles.tile}><span className={styles.tileLabel}>Certificado ADR</span><strong>{authProfile.tiene_adr ? (`Sí · ${authProfile.adr_caducidad || 'N/A'}`) : 'No'}</strong></div>

          <button className={`${styles.tile} ${styles.tileLink}`} onClick={() => gotoVeh(authProfile.camion_id, 'camion')}>
            <span className={styles.tileLabel}>Camión</span><strong>{authProfile.camioane?.matricula || 'No asignado'}</strong>
          </button>
          <button className={`${styles.tile} ${styles.tileLink}`} onClick={() => gotoVeh(authProfile.remorca_id, 'remolque')}>
            <span className={styles.tileLabel}>Remolque</span><strong>{authProfile.remorci?.matricula || 'No asignado'}</strong>
          </button>
        </div>

        <div className={styles.card}>
          <div className={styles.vacHeader}>
            <h3>Vacaciones</h3>
            <button className={styles.ghostBtn} onClick={() => setIsVacOpen(true)}>Abrir</button>
          </div>
          <p className={styles.vacHint}>Gestiona solicitudes, días pendientes y vacaciones de empresa.</p>
        </div>
      </div>

      {/* MODAL: Vacaciones */}
      {isVacOpen && (
        <div className={styles.modalOverlay} onClick={()=>setIsVacOpen(false)}>
          <div className={styles.modalSheet} onClick={(e)=>e.stopPropagation()}>
            <div className={styles.modalTop}>
              <h3>Vacaciones</h3>
              <button className={styles.iconClose} onClick={()=>setIsVacOpen(false)}><CloseIcon/></button>
            </div>
            <div className={styles.modalBody}>
              <Vacaciones />
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Editar Perfil (nou) */}
      {isEditOpen && (
        <div className={styles.modalOverlay} onClick={()=>setIsEditOpen(false)}>
          <div className={styles.modalSheetSmall} onClick={(e)=>e.stopPropagation()}>
            <div className={styles.modalTop}>
              <h3>Editar Perfil</h3>
              <button className={styles.iconClose} onClick={()=>setIsEditOpen(false)}><CloseIcon/></button>
            </div>

            <form className={styles.formGrid} onSubmit={handleProfileUpdate}>
              <label>Nombre Completo
                <input
                  type="text"
                  value={editableProfile?.nombre_completo ?? authProfile.nombre_completo ?? ''}
                  onChange={(e)=>setEditableProfile(p=>({...p, nombre_completo:e.target.value}))}/>
              </label>

              <label>Caducidad CAP
                <input
                  type="date"
                  value={editableProfile?.cap_expirare ?? authProfile.cap_expirare ?? ''}
                  onChange={(e)=>setEditableProfile(p=>({...p, cap_expirare:e.target.value}))}/>
              </label>

              <label>Caducidad Carnet
                <input
                  type="date"
                  value={editableProfile?.carnet_caducidad ?? authProfile.carnet_caducidad ?? ''}
                  onChange={(e)=>setEditableProfile(p=>({...p, carnet_caducidad:e.target.value}))}/>
              </label>

              <label>¿Tiene ADR?
                <select
                  value={(editableProfile?.tiene_adr ?? authProfile.tiene_adr) ? 'true' : 'false'}
                  onChange={(e)=>setEditableProfile(p=>({...p, tiene_adr: e.target.value==='true'}))}>
                  <option value="false">No</option>
                  <option value="true">Sí</option>
                </select>
              </label>

              {(editableProfile?.tiene_adr ?? authProfile.tiene_adr) && (
                <label>Caducidad ADR
                  <input
                    type="date"
                    value={editableProfile?.adr_caducidad ?? authProfile.adr_caducidad ?? ''}
                    onChange={(e)=>setEditableProfile(p=>({...p, adr_caducidad:e.target.value}))}/>
                </label>
              )}

              {!authProfile.camion_id ? (
                <label>Matrícula Camión
                  <input
                    type="text"
                    placeholder="Introduce la matrícula…"
                    value={editableProfile?.new_camion_matricula ?? ''}
                    onChange={(e)=>setEditableProfile(p=>({...p, new_camion_matricula:e.target.value.toUpperCase()}))}/>
                </label>
              ) : (
                <label>Camión Asignado
                  <input type="text" value={authProfile.camioane?.matricula} disabled />
                </label>
              )}

              {!authProfile.remorca_id ? (
                <label>Matrícula Remolque
                  <input
                    type="text"
                    placeholder="Introduce la matrícula…"
                    value={editableProfile?.new_remorca_matricula ?? ''}
                    onChange={(e)=>setEditableProfile(p=>({...p, new_remorca_matricula:e.target.value.toUpperCase()}))}/>
                </label>
              ) : (
                <label>Remolque Asignado
                  <input type="text" value={authProfile.remorci?.matricula} disabled />
                </label>
              )}

              <div className={styles.formActions}>
                <button type="button" className={styles.btnGhost} onClick={()=>setIsEditOpen(false)}>Cancelar</button>
                <button type="submit" className={styles.btnPrimary}>Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
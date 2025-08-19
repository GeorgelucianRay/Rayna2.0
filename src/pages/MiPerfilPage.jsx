import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabaseClient';

// Layout & Stiluri
import Layout from '../components/Layout';
import styles from './MiPerfilPage.module.css';

// Componente UI & Widget-uri (cu căile corecte conform structurii tale)
import { EditIcon, CameraIcon } from '../components/ui/Icons';
import VacacionesWidget from '../components/widgets/VacacionesWidget';
import NominaWidget from '../components/widgets/NominaWidget';

// Componente Modale (cu căile corecte conform structurii tale)
import EditProfileModal from '../components/modales/EditProfileModal';
import UploadAvatarModal from '../components/modales/UploadAvatarModal';

export default function MiPerfilPage() {
  const { user, profile, loading, setProfile } = useAuth();
  const navigate = useNavigate();

  // Starea paginii
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);
  
  // Starea pentru widget-uri
  const [nominaSummary, setNominaSummary] = useState({ dias: 0, km: 0, conts: 0, desayunos: 0, cenas: 0, procenas: 0 });
  const [nominaMarks, setNominaMarks] = useState(new Set());
  const currentDate = new Date();

  // LOGICA COMPLETĂ PENTRU FETCH NOMINA
  useEffect(() => {
    const fetchNomina = async () => {
      if (!user) return;
      const y = currentDate.getFullYear();
      const m = currentDate.getMonth() + 1;
      const { data } = await supabase
        .from('pontaje_curente')
        .select('pontaj_complet')
        .eq('user_id', user.id)
        .eq('an', y)
        .eq('mes', m)
        .maybeSingle();

      const zile = data?.pontaj_complet?.zilePontaj || [];
      let D = 0, C = 0, P = 0, KM = 0, CT = 0;
      const marks = new Set();

      zile.forEach((zi, idx) => {
        if (!zi) return;
        const d = idx + 1;
        const kmZi = (parseFloat(zi.km_final) || 0) - (parseFloat(zi.km_iniciar) || 0);
        if (zi.desayuno) D++;
        if (zi.cena) C++;
        if (zi.procena) P++;
        if (kmZi > 0) KM += kmZi;
        if ((zi.contenedores || 0) > 0) CT += zi.contenedores || 0;
        if (zi.desayuno || zi.cena || zi.procena || kmZi > 0 || (zi.contenedores || 0) > 0 || (zi.suma_festivo || 0) > 0) {
          marks.add(d);
        }
      });

      setNominaSummary({ desayunos: D, cenas: C, procenas: P, km: Math.round(KM), conts: CT, dias: marks.size });
      setNominaMarks(marks);
    };
    fetchNomina();
  }, [user, currentDate]);

  // LOGICA COMPLETĂ PENTRU SALVAREA PROFILULUI
  const handleSaveProfile = async (editableProfile) => {
    try {
      let camionIdToUpdate = profile.camion_id;
      let remorcaIdToUpdate = profile.remorca_id;

      if (!camionIdToUpdate && editableProfile.new_camion_matricula) {
        const { data: newCamion, error } = await supabase.from('camioane').insert({ matricula: editableProfile.new_camion_matricula }).select().single();
        if (error) throw error;
        camionIdToUpdate = newCamion.id;
      }

      if (!remorcaIdToUpdate && editableProfile.new_remorca_matricula) {
        const { data: newRemorca, error } = await supabase.from('remorci').insert({ matricula: editableProfile.new_remorca_matricula }).select().single();
        if (error) throw error;
        remorcaIdToUpdate = newRemorca.id;
      }

      const payload = {
        nombre_completo: editableProfile.nombre_completo,
        cap_expirare: editableProfile.cap_expirare || null,
        carnet_caducidad: editableProfile.carnet_caducidad || null,
        tiene_adr: editableProfile.tiene_adr,
        adr_caducidad: editableProfile.tiene_adr ? editableProfile.adr_caducidad || null : null,
        camion_id: camionIdToUpdate || null,
        remorca_id: remorcaIdToUpdate || null,
      };

      const { error: upErr } = await supabase.from('profiles').update(payload).eq('id', user.id);
      if (upErr) throw upErr;

      const { data: updated } = await supabase.from('profiles').select('*, camioane:camion_id(*), remorci:remorca_id(*)') .eq('id', user.id).maybeSingle();
      setProfile(updated);
      setIsEditOpen(false);
      alert('Perfil actualizado con éxito.');
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Aici poți adăuga logica de upload (momentan goală, dar funcția există)
  const handleAvatarUpload = async (imageBlob) => {
    alert('Funcționalitatea de upload va fi implementată aici.');
    setIsPhotoOpen(false);
  };

  const initials = useMemo(() => {
    const n = (profile?.nombre_completo || '').trim();
    if (!n) return '...';
    return n.split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase()).join('') || '...';
  }, [profile]);
  
  if (loading || !profile) {
    return <Layout><div className={styles.loading}>Cargando…</div></Layout>;
  }

  return (
    <Layout backgroundClassName="profile-background">
      <div className={styles.page}>
        {/* Header-ul paginii */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.avatarXxl} onClick={() => setIsPhotoOpen(true)}>
              {profile.avatar_url ? <img src={profile.avatar_url} alt="Avatar" className={styles.avatarImg} /> : <div className={styles.avatarFallbackXl}>{initials}</div>}
              <div className={styles.avatarOverlay}></div>
              <button className={styles.avatarCamBtn} type="button" title="Cambiar foto" onClick={(e)=>{e.stopPropagation(); setIsPhotoOpen(true);}}>
                <CameraIcon />
              </button>
            </div>
            <h1>Mi Perfil</h1>
          </div>
          <div>
            <button className={styles.editBtn} onClick={() => setIsEditOpen(true)}><EditIcon /> Editar perfil</button>
          </div>
        </div>

        {/* --- CARDURILE CU CONȚINUT COMPLET --- */}
        <div className={styles.cardsGrid}>
          <section className={styles.card}>
            <div className={styles.cardTitle}>Conductor</div>
            <div className={styles.rows2}>
              <div><span className={styles.k}>Nombre completo</span><span className={styles.v}>{profile.nombre_completo || '—'}</span></div>
              <div><span className={styles.k}>CAP</span><span className={styles.v}>{profile.cap_expirare || '—'}</span></div>
              <div><span className={styles.k}>Carnet conducir</span><span className={styles.v}>{profile.carnet_caducidad || '—'}</span></div>
              <div><span className={styles.k}>ADR</span><span className={styles.v}>{profile.tiene_adr ? profile.adr_caducidad || 'Sí' : 'No'}</span></div>
            </div>
          </section>
          <section className={styles.card}>
            <div className={styles.cardTitleRow}>
              <div className={styles.cardTitle}>Camión</div>
              <button className={styles.ghostBtn} onClick={() => profile?.camion_id && navigate(`/camion/${profile.camion_id}`)}>Ver ficha</button>
            </div>
            <div className={styles.rows2}>
              <div><span className={styles.k}>Matrícula</span><span className={styles.v}>{profile.camioane?.matricula || 'No asignado'}</span></div>
              <div><span className={styles.k}>ITV</span><span className={styles.v}>{profile.camioane?.fecha_itv || '—'}</span></div>
            </div>
          </section>
          <section className={styles.card}>
            <div className={styles.cardTitleRow}>
              <div className={styles.cardTitle}>Remolque</div>
              <button className={styles.ghostBtn} onClick={() => profile?.remorca_id && navigate(`/remorca/${profile.remorca_id}`)}>Ver ficha</button>
            </div>
            <div className={styles.rows2}>
              <div><span className={styles.k}>Matrícula</span><span className={styles.v}>{profile.remorci?.matricula || 'No asignado'}</span></div>
              <div><span className={styles.k}>ITV</span><span className={styles.v}>{profile.remorci?.fecha_itv || '—'}</span></div>
            </div>
          </section>
        </div>

        {/* Widget-urile */}
        <div className={styles.widgetsGrid}>
          <NominaWidget 
            summary={nominaSummary} 
            marks={nominaMarks} 
            date={currentDate} 
            onNavigate={() => navigate('/calculadora-nomina')} 
          />
          <VacacionesWidget 
            info={profile.vacaciones_info || {}} 
            onNavigate={() => navigate('/vacaciones-standalone')} 
          />
        </div>

        {/* Modalurile */}
        <EditProfileModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          profile={profile}
          onSave={handleSaveProfile}
        />
        <UploadAvatarModal
          isOpen={isPhotoOpen}
          onClose={() => setIsPhotoOpen(false)}
          onUploadComplete={handleAvatarUpload}
        />
      </div>
    </Layout>
  );
}

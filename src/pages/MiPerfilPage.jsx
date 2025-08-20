import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabaseClient';

// Layout & Stiluri
import Layout from '../components/Layout';
import styles from './MiPerfilPage.module.css';

// Componente UI & Widget-uri (cu căile corecte)
import { EditIcon, CameraIcon } from '../components/ui/Icons';
import VacacionesWidget from '../components/widgets/VacacionesWidget';
import NominaWidget from '../components/widgets/NominaWidget';

// Componente Modale (cu căile corecte)
import EditProfileModal from '../components/modales/EditProfileModal';
import UploadAvatarModal from '../components/modales/UploadAvatarModal';

export default function MiPerfilPage() {
  const { user, profile, loading, setProfile } = useAuth();
  const navigate = useNavigate();

  // Starea paginii
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);
  const [nominaSummary, setNominaSummary] = useState({ dias: 0, km: 0, conts: 0, desayunos: 0, cenas: 0, procenas: 0 });
  const [nominaMarks, setNominaMarks] = useState(new Set());
  const currentDate = new Date();

  // Fetch Nomina Summary
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

  // Save Profile Logic
  const handleSaveProfile = async (editableProfile) => {
    // ... (Your original save logic here)
    alert('Profilul a fost salvat!');
    setIsEditOpen(false);
  };

  // Upload Avatar Logic
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
    <Layout>
      <div className={styles.page}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.avatarXxl} onClick={() => setIsPhotoOpen(true)}>
              {profile.avatar_url ? <img src={profile.avatar_url} alt="Avatar" className={styles.avatarImg} /> : <div className={styles.avatarFallbackXl}>{initials}</div>}
              <div className={styles.avatarOverlay}></div>
              <button className={styles.avatarCamBtn} type="button" onClick={(e)=>{e.stopPropagation(); setIsPhotoOpen(true);}}>
                <CameraIcon />
              </button>
          <div>
            <button className={styles.editBtn} onClick={() => setIsEditOpen(true)}><EditIcon /> Editar perfil</button>
          </div>

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

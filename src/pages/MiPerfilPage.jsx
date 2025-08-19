import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabaseClient';

// Layout & Stiluri
import Layout from '../components/Layout';
import styles from './MiPerfilPage.module.css';

// Componente UI & Widget-uri
import { EditIcon, CameraIcon } from '../components/ui/Icons';
import VacacionesWidget from '../components/widgets/VacacionesWidget';
import NominaWidget from '../components/widgets/NominaWidget';

// Componente Modale
import EditProfileModal from '../components/modals/EditProfileModal';
import UploadAvatarModal from '../components/modals/UploadAvatarModal';

// (Vom crea acest hook în pasul următor, dar îl includem acum pentru a vedea scopul final)
// import { useAvatarUpload } from '../hooks/useAvatarUpload'; 

export default function MiPerfilPage() {
  const { user, profile, loading, setProfile } = useAuth();
  const navigate = useNavigate();

  // --- Starea paginii este acum mult mai simplă ---
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);
  
  // --- Aici vom folosi hook-uri pentru logica complexă (momentan inline) ---
  const [nominaSummary, setNominaSummary] = useState({ dias: 0, km: 0, conts: 0 });
  const [nominaMarks, setNominaMarks] = useState(new Set());
  const currentDate = new Date(); // Simplificat

  // Logic to fetch nomina summary (ar putea fi mutat într-un hook `useNominaSummary`)
  useEffect(() => {
    const fetchNomina = async () => {
      if (!user) return;
      // ... logica de fetch pentru sumarul de pontaj ...
      // (am omis-o aici pentru a nu încărca codul, dar e aceeași ca în original)
      // La final, setează `setNominaSummary` și `setNominaMarks`
    };
    fetchNomina();
  }, [user]);

  // --- Acțiuni și Handlers ---
  
  // Logic to save the profile
  const handleSaveProfile = async (editableProfile) => {
    // ... logica de salvare a profilului din original ...
    // La final, re-încarcă profilul și închide modalul
    const { data: updatedProfile } = await supabase.from('profiles').select('*, camioane(*), remorci(*)').eq('id', user.id).single();
    setProfile(updatedProfile);
    setIsEditOpen(false);
    alert('Profil actualizat!');
  };

  // Logic to handle avatar upload
  const handleAvatarUpload = async (imageBlob) => {
    // Aici ar interveni hook-ul `useAvatarUpload`
    // ... logica de upload pe Supabase Storage ...
    const { data: updatedProfile } = await supabase.from('profiles').select('*, camioane(*), remorci(*)').eq('id', user.id).single();
    setProfile(updatedProfile);
    setIsPhotoOpen(false);
    alert('Avatar actualizat!');
  };

  const initials = useMemo(() => {
    const n = (profile?.nombre_completo || '').trim();
    if (!n) return 'R';
    return n.split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase()).join('') || 'R';
  }, [profile]);
  
  if (loading || !profile) {
    return <Layout><div className={styles.loading}>Cargando…</div></Layout>;
  }

  return (
    <Layout backgroundClassName="profile-background">
      <div className={styles.page}>
        {/* --- Header-ul paginii --- */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.avatarXxl} onClick={() => setIsPhotoOpen(true)}>
              {profile.avatar_url ? <img src={profile.avatar_url} alt="Avatar" /> : <div>{initials}</div>}
              <button className={styles.avatarCamBtn}><CameraIcon /></button>
            </div>
            <h1>Mi Perfil</h1>
          </div>
          <div>
            <button className={styles.editBtn} onClick={() => setIsEditOpen(true)}><EditIcon /> Editar perfil</button>
          </div>
        </div>

        {/* --- Cardurile de informații (puteau fi și ele extrase) --- */}
        <div className={styles.cardsGrid}>
            {/* Card Conductor */}
            <section className={styles.card}> {/* ... conținut ... */} </section>
            {/* Card Camion */}
            <section className={styles.card}> {/* ... conținut ... */} </section>
            {/* Card Remolque */}
            <section className={styles.card}> {/* ... conținut ... */} </section>
        </div>

        {/* --- Widget-urile (acum sunt componente curate) --- */}
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

        {/* --- Modalurile (logica lor este acum încapsulată) --- */}
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

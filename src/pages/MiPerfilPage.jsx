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

  // 🔹 Vacaciones widget info (TOTAL / USADAS / PENDIENTES / DISPONIBLES)
  const [vacInfo, setVacInfo] = useState({ total: 0, usadas: 0, pendientes: 0, disponibles: 0 });

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

  // 🔹 Fetch Vacaciones info pentru widget (fără a umbla la altă logică existentă)
  useEffect(() => {
    async function loadVacacionesInfo() {
      if (!user) return;
      const year = currentDate.getFullYear();

      // Helpers locale
      const fmt = (d) => {
        const x = new Date(d);
        const z = new Date(x.getTime() - x.getTimezoneOffset() * 60000);
        return z.toISOString().slice(0, 10);
      };
      const daysBetween = (a, b) => {
        const A = new Date(fmt(a)), B = new Date(fmt(b));
        return Math.floor((B - A) / 86400000) + 1;
      };
      const overlapDaysWithinYear = (ev) => {
        const yStart = new Date(`${year}-01-01T00:00:00`);
        const yEnd   = new Date(`${year}-12-31T23:59:59`);
        const s0 = new Date(ev.start_date);
        const e0 = new Date(ev.end_date);
        const s = s0 < yStart ? yStart : s0;
        const e = e0 > yEnd   ? yEnd   : e0;
        if (e < s) return 0;
        return daysBetween(s, e);
      };

      // 1) Parametrii an
      const { data: cfg } = await supabase
        .from('vacaciones_parametros_anio')
        .select('*')
        .eq('anio', year)
        .maybeSingle();

      const dias_base = cfg?.dias_base ?? 23;
      const dias_personales = cfg?.dias_personales ?? 2;
      const dias_pueblo = cfg?.dias_pueblo ?? 0;

      // 2) Extra user/an
      const { data: ex } = await supabase
        .from('vacaciones_asignaciones_extra')
        .select('dias_extra')
        .eq('user_id', user.id)
        .eq('anio', year)
        .maybeSingle();
      const dias_extra = ex?.dias_extra ?? 0;

      const total = (dias_base || 0) + (dias_personales || 0) + (dias_pueblo || 0) + (dias_extra || 0);

      // 3) Evenimente user care ating anul
      const yearStart = `${year}-01-01`;
      const yearEnd   = `${year}-12-31`;
      const { data: evs } = await supabase
        .from('vacaciones_eventos')
        .select('id,tipo,state,start_date,end_date')
        .eq('user_id', user.id)
        .or(`and(start_date.lte.${yearEnd},end_date.gte.${yearStart})`);

      const usadas = (evs || [])
        .filter(e => e.state === 'aprobado')
        .reduce((s, e) => s + overlapDaysWithinYear(e), 0);

      const pendientes = (evs || [])
        .filter(e => e.state === 'pendiente' || e.state === 'conflicto')
        .reduce((s, e) => s + overlapDaysWithinYear(e), 0);

      const disponibles = Math.max(total - usadas - pendientes, 0);

      setVacInfo({ total, usadas, pendientes, disponibles });
    }
    loadVacacionesInfo();
  }, [user, currentDate]);

  // Save Profile Logic
  const handleSaveProfile = async (editableProfile) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(editableProfile)
        .eq('id', user.id);
      
      if (error) throw error;
      
      // Actualizează profile în context
      setProfile({ ...profile, ...editableProfile });
      alert('Perfil actualizado correctamente!');
      setIsEditOpen(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error al guardar el perfil');
    }
  };

  // IMPORTANT: Funcția corectată pentru upload avatar
  const handleAvatarUpload = async (newAvatarUrl) => {
    console.log('Avatar uploaded successfully:', newAvatarUrl);
    
    if (setProfile) {
      setProfile(prevProfile => ({
        ...prevProfile,
        avatar_url: newAvatarUrl
      }));
    }
    
    try {
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (updatedProfile) {
        setProfile(updatedProfile);
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
    
    setIsPhotoOpen(false);
  };

  const initials = useMemo(() => {
    const n = (profile?.nombre_completo || '').trim();
    if (!n) return '...';
    return n.split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase()).join('') || '...';
  }, [profile]);
  
  // Debug logging
  useEffect(() => {
    if (user) {
      console.log('Current user in MiPerfilPage:', { id: user.id, email: user.email });
    }
    if (profile) {
      console.log('Current profile:', { avatar_url: profile.avatar_url, nombre_completo: profile.nombre_completo });
    }
  }, [user, profile]);
  
  if (loading || !profile) {
    return <Layout><div className={styles.loading}>Cargando…</div></Layout>;
  }

  if (!user) {
    return (
      <Layout>
        <div className={styles.loading}>
          <p>No has iniciado sesión</p>
          <button onClick={() => navigate('/login')}>Iniciar sesión</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.avatarXxl} onClick={() => setIsPhotoOpen(true)}>
              {profile.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt="Avatar" 
                  className={styles.avatarImg}
                  onError={(e) => {
                    console.error('Error loading avatar:', profile.avatar_url);
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <div className={styles.avatarFallbackXl}>{initials}</div>
              )}
              <div className={styles.avatarOverlay}></div>
              <button 
                className={styles.avatarCamBtn} 
                type="button" 
                onClick={(e) => {
                  e.stopPropagation(); 
                  console.log('Opening photo modal with userId:', user.id);
                  setIsPhotoOpen(true);
                }}
              >
                <CameraIcon />
              </button>
            </div>
            <div>
              <button className={styles.editBtn} onClick={() => setIsEditOpen(true)}>
                <EditIcon /> Editar perfil
              </button>
            </div>
          </div>
        </div>

        <div className={styles.cardsGrid}>
          <section className={styles.card}>
            <div className={styles.cardTitle}>Conductor</div>
            <div className={styles.rows2}>
              <div>
                <span className={styles.k}>Nombre completo</span>
                <span className={styles.v}>{profile.nombre_completo || '—'}</span>
              </div>
              <div>
                <span className={styles.k}>CAP</span>
                <span className={styles.v}>{profile.cap_expirare || '—'}</span>
              </div>
              <div>
                <span className={styles.k}>Carnet conducir</span>
                <span className={styles.v}>{profile.carnet_caducidad || '—'}</span>
              </div>
              <div>
                <span className={styles.k}>ADR</span>
                <span className={styles.v}>{profile.tiene_adr ? profile.adr_caducidad || 'Sí' : 'No'}</span>
              </div>
            </div>
          </section>
          
          <section className={styles.card}>
            <div className={styles.cardTitleRow}>
              <div className={styles.cardTitle}>Camión</div>
              <button 
                className={styles.ghostBtn} 
                onClick={() => profile?.camion_id && navigate(`/camion/${profile.camion_id}`)}
              >
                Ver ficha
              </button>
            </div>
            <div className={styles.rows2}>
              <div>
                <span className={styles.k}>Matrícula</span>
                <span className={styles.v}>{profile.camioane?.matricula || 'No asignado'}</span>
              </div>
              <div>
                <span className={styles.k}>ITV</span>
                <span className={styles.v}>{profile.camioane?.fecha_itv || '—'}</span>
              </div>
            </div>
          </section>
          
          <section className={styles.card}>
            <div className={styles.cardTitleRow}>
              <div className={styles.cardTitle}>Remolque</div>
              <button 
                className={styles.ghostBtn} 
                onClick={() => profile?.remorca_id && navigate(`/remorca/${profile.remorca_id}`)}
              >
                Ver ficha
              </button>
            </div>
            <div className={styles.rows2}>
              <div>
                <span className={styles.k}>Matrícula</span>
                <span className={styles.v}>{profile.remorci?.matricula || 'No asignado'}</span>
              </div>
              <div>
                <span className={styles.k}>ITV</span>
                <span className={styles.v}>{profile.remorci?.fecha_itv || '—'}</span>
              </div>
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

          {/* 🔹 Widget Vacaciones alimentat din DB, nu din profile */}
          <VacacionesWidget
            info={vacInfo}
            onNavigate={() => navigate('/vacaciones-standalone')}
          />
        </div>

        <EditProfileModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          profile={profile}
          onSave={handleSaveProfile}
        />
        
        {/* IMPORTANT: Transmite userId ca prop la UploadAvatarModal */}
        <UploadAvatarModal
          isOpen={isPhotoOpen}
          onClose={() => setIsPhotoOpen(false)}
          onUploadComplete={handleAvatarUpload}
          userId={user.id}
        />
      </div>
    </Layout>
  );
}
// src/pages/MiPerfilPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabaseClient';

// Layout & estilos
import Layout from '../components/Layout';
import styles from './MiPerfilPage.module.css';

// UI & widgets
import { EditIcon, CameraIcon } from '../components/ui/Icons';
import VacacionesWidget from '../components/widgets/VacacionesWidget';
import NominaWidget from '../components/widgets/NominaWidget';

// Modales
import EditProfileModal from '../components/modales/EditProfileModal';
import UploadAvatarModal from '../components/modales/UploadAvatarModal';

export default function MiPerfilPage() {
  const { user, profile, loading, setProfile } = useAuth();
  const navigate = useNavigate();

  // Estado local
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);

  const [nominaSummary, setNominaSummary] = useState({ dias: 0, km: 0, conts: 0, desayunos: 0, cenas: 0, procenas: 0 });
  const [nominaMarks, setNominaMarks] = useState([]); // array para serializar bien

  const [vacInfo, setVacInfo] = useState({ total: 0, usadas: 0, pendientes: 0, disponibles: 0 });

  // Carga explícita de camión/remolque por ID (el contexto trae sólo IDs)
  const [truck, setTruck] = useState(null);
  const [trailer, setTrailer] = useState(null);
  const [loadingAssets, setLoadingAssets] = useState(false);

  // Fecha fija por render (evita loops)
  const today = useMemo(() => new Date(), []);

  /* ================== Fetch Camión / Remolque ================== */
  useEffect(() => {
    const loadAssets = async () => {
      if (!profile) return;
      const { camion_id, remorca_id } = profile;

      if (!camion_id && !remorca_id) {
        setTruck(null);
        setTrailer(null);
        return;
      }

      setLoadingAssets(true);
      try {
        const queries = [];
        if (camion_id) {
          queries.push(
            supabase.from('camioane').select('id, matricula, fecha_itv').eq('id', camion_id).maybeSingle()
          );
        } else {
          setTruck(null);
        }
        if (remorca_id) {
          queries.push(
            supabase.from('remorci').select('id, matricula, fecha_itv').eq('id', remorca_id).maybeSingle()
          );
        } else {
          setTrailer(null);
        }

        const results = await Promise.allSettled(queries);

        // results[0] puede ser camión o remolque según lo que exista
        let t = truck, r = trailer;
        let idx = 0;
        if (camion_id) {
          const res = results[idx++];
          if (res.status === 'fulfilled' && res.value?.data) t = res.value.data;
        }
        if (remorca_id) {
          const res = results[idx++];
          if (res.status === 'fulfilled' && res.value?.data) r = res.value.data;
        }
        setTruck(t || null);
        setTrailer(r || null);
      } catch (e) {
        console.error('Error cargando camión/remolque:', e);
        setTruck(null);
        setTrailer(null);
      } finally {
        setLoadingAssets(false);
      }
    };
    loadAssets();
  }, [profile]);

  /* ================== Nómina (mes actual) ================== */
  useEffect(() => {
    const fetchNomina = async () => {
      if (!user) return;
      try {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth() + 1;

        const { data, error } = await supabase
          .from('pontaje_curente')
          .select('pontaj_complet')
          .eq('user_id', user.id)
          .eq('an', y)
          .eq('mes', m)
          .maybeSingle();

        if (error) throw error;

        const zile = data?.pontaj_complet?.zilePontaj || [];
        let D = 0, C = 0, P = 0, KM = 0, CT = 0;
        const marks = new Set();

        for (let idx = 0; idx < zile.length; idx++) {
          const zi = zile[idx];
          if (!zi) continue;
          const d = idx + 1;
          const kmZi = (parseFloat(zi.km_final) || 0) - (parseFloat(zi.km_iniciar) || 0);
          if (zi.desayuno) D++;
          if (zi.cena) C++;
          if (zi.procena) P++;
          if (kmZi > 0) KM += kmZi;
          const conts = zi.contenedores || 0;
          if (conts > 0) CT += conts;
          if (zi.desayuno || zi.cena || zi.procena || kmZi > 0 || conts > 0 || (zi.suma_festivo || 0) > 0) {
            marks.add(d);
          }
        }

        setNominaSummary({ desayunos: D, cenas: C, procenas: P, km: Math.round(KM), conts: CT, dias: marks.size });
        setNominaMarks([...marks]); // array
      } catch (e) {
        console.error('Error obteniendo nómina:', e);
        setNominaSummary({ dias: 0, km: 0, conts: 0, desayunos: 0, cenas: 0, procenas: 0 });
        setNominaMarks([]);
      }
    };
    fetchNomina();
  }, [user]);

  /* ================== Vacaciones (año actual) ================== */
  useEffect(() => {
    const loadVacacionesInfo = async () => {
      if (!user) return;
      try {
        const year = today.getFullYear();

        const [{ data: cfg, error: e1 }, { data: ex, error: e2 }] = await Promise.all([
          supabase.from('vacaciones_parametros_anio').select('*').eq('anio', year).maybeSingle(),
          supabase.from('vacaciones_asignaciones_extra').select('dias_extra').eq('user_id', user.id).eq('anio', year).maybeSingle()
        ]);
        if (e1) throw e1;
        if (e2) throw e2;

        const dias_base = cfg?.dias_base ?? 23;
        const dias_personales = cfg?.dias_personales ?? 2;
        const dias_pueblo = cfg?.dias_pueblo ?? 0;
        const dias_extra = ex?.dias_extra ?? 0;
        const total = dias_base + dias_personales + dias_pueblo + dias_extra;

        const { data: evs, error: e3 } = await supabase
          .from('vacaciones_eventos')
          .select('id, state, start_date, end_date')
          .eq('user_id', user.id)
          .gte('end_date', `${year}-01-01`)
          .lte('start_date', `${year}-12-31`);
        if (e3) throw e3;

        const toDateOnly = (d) => new Date(`${d}T00:00:00`);
        const clampDays = (s0, e0) => {
          const yS = toDateOnly(`${year}-01-01`);
          const yE = toDateOnly(`${year}-12-31`);
          const s = s0 < yS ? yS : s0;
          const e = e0 > yE ? yE : e0;
          if (e < s) return 0;
          return Math.floor((e - s) / 86400000) + 1; // inclusivo
        };

        let usadas = 0, pendientes = 0;
        (evs || []).forEach(ev => {
          const days = clampDays(toDateOnly(ev.start_date), toDateOnly(ev.end_date));
          if (ev.state === 'aprobado') usadas += days;
          else if (ev.state === 'pendiente' || ev.state === 'conflicto') pendientes += days;
        });

        const disponibles = Math.max(total - usadas - pendientes, 0);
        setVacInfo({ total, usadas, pendientes, disponibles });
      } catch (e) {
        console.error('Error cargando vacaciones:', e);
        setVacInfo({ total: 0, usadas: 0, pendientes: 0, disponibles: 0 });
      }
    };
    loadVacacionesInfo();
  }, [user, today]);

  /* ================== Guardar perfil ================== */
  const handleSaveProfile = async (editableProfile) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(editableProfile)
        .eq('id', user.id);
      if (error) throw error;

      setProfile(prev => ({ ...prev, ...editableProfile }));
      // reemplaza alert por toast si tienes uno
      alert('¡Perfil actualizado correctamente!');
      setIsEditOpen(false);
    } catch (error) {
      console.error('Error guardando perfil:', error);
      alert('Error al guardar el perfil');
    }
  };

  /* ================== Upload avatar ================== */
  const handleAvatarUpload = async (newAvatarUrl) => {
    try {
      await supabase.from('profiles').update({ avatar_url: newAvatarUrl }).eq('id', user.id);
      setProfile(prev => ({ ...(prev || {}), avatar_url: newAvatarUrl }));
    } catch (e) {
      console.error('Error actualizando avatar:', e);
    } finally {
      setIsPhotoOpen(false);
    }
  };

  const initials = useMemo(() => {
    const n = (profile?.nombre_completo || '').trim();
    if (!n) return '...';
    return n.split(/\s+/).map(s => s[0]?.toUpperCase()).slice(0, 2).join('') || '...';
  }, [profile]);

  // Prefetch simple para evitar “lag” al abrir ficha
  const prefetchAsset = async (tipo, id) => {
    try {
      if (!id) return null;
      const table = tipo === 'camion' ? 'camioane' : 'remorci';
      const { data } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
      return data || null;
    } catch {
      return null;
    }
  };

  if (loading || !profile) {
    return (
      <Layout>
        <div className={styles.loading}>Cargando…</div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className={styles.loading}>
          <p>No has iniciado sesión</p>
          <button className={styles.primaryBtn} onClick={() => navigate('/login')}>Iniciar sesión</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.page}>
        {/* Encabezado */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.avatarXxl} onClick={() => setIsPhotoOpen(true)}>
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className={styles.avatarImg}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <div className={styles.avatarFallbackXl}>{initials}</div>
              )}
              <div className={styles.avatarOverlay}></div>
              <button
                className={styles.avatarCamBtn}
                type="button"
                onClick={(e) => { e.stopPropagation(); setIsPhotoOpen(true); }}
                aria-label="Cambiar foto"
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

        {/* Tarjetas */}
        <div className={styles.cardsGrid}>
          {/* Conductor */}
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
                <span className={styles.v}>{profile.tiene_adr ? (profile.adr_caducidad || 'Sí') : 'No'}</span>
              </div>
            </div>
          </section>

          {/* Camión */}
          <section className={styles.card}>
            <div className={styles.cardTitleRow}>
              <div className={styles.cardTitle}>Camión</div>
              <button
                className={styles.ghostBtn}
                onClick={async () => {
                  const d = await prefetchAsset('camion', profile?.camion_id);
                  navigate(`/camion/${profile?.camion_id}`, { state: { prefetch: d } });
                }}
                disabled={!profile?.camion_id}
                aria-disabled={!profile?.camion_id}
              >
                Ver ficha
              </button>
            </div>

            <div className={styles.rows2}>
              <div>
                <span className={styles.k}>Matrícula</span>
                <span className={styles.v}>
                  {loadingAssets ? '—' : (truck?.matricula || 'No asignado')}
                </span>
              </div>
              <div>
                <span className={styles.k}>ITV</span>
                <span className={styles.v}>
                  {loadingAssets ? '—' : (truck?.fecha_itv || '—')}
                </span>
              </div>
            </div>
          </section>

          {/* Remolque */}
          <section className={styles.card}>
            <div className={styles.cardTitleRow}>
              <div className={styles.cardTitle}>Remolque</div>
              <button
                className={styles.ghostBtn}
                onClick={async () => {
                  const d = await prefetchAsset('remolque', profile?.remorca_id);
                  navigate(`/remorca/${profile?.remorca_id}`, { state: { prefetch: d } });
                }}
                disabled={!profile?.remorca_id}
                aria-disabled={!profile?.remorca_id}
              >
                Ver ficha
              </button>
            </div>
            <div className={styles.rows2}>
              <div>
                <span className={styles.k}>Matrícula</span>
                <span className={styles.v}>
                  {loadingAssets ? '—' : (trailer?.matricula || 'No asignado')}
                </span>
              </div>
              <div>
                <span className={styles.k}>ITV</span>
                <span className={styles.v}>
                  {loadingAssets ? '—' : (trailer?.fecha_itv || '—')}
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Widgets */}
        <div className={styles.widgetsGrid}>
          <NominaWidget
            summary={nominaSummary}
            marks={nominaMarks}
            date={today}
            onNavigate={() => navigate('/calculadora-nomina')}
          />

          <VacacionesWidget
            info={vacInfo}
            onNavigate={() => navigate('/vacaciones-standalone')}
          />
        </div>

        {/* Modales */}
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
          userId={user.id}
        />
      </div>
    </Layout>
  );
}
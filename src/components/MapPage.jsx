import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import Layout from './Layout';
import styles from './MiPerfilPage.module.css';

/* ===== Iconos ===== */
const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 3a2.828 2.828 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
  </svg>
);
const CloseIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
const CameraIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l2-3h8l2 3h3a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

/* ===== Helpers ===== */
const monthLabelES = (d) =>
  d
    .toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    .replace(/^\p{L}/u, (c) => c.toUpperCase());

/* Mini Calendar */
function MiniCalendar({ date, marks }) {
  const y = date.getFullYear(), m = date.getMonth();
  const first = new Date(y, m, 1);
  const startDay = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push({ blank: true, key: `b-${i}` });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, key: `d-${d}` });

  return (
    <div className={styles.miniCal}>
      <div className={styles.miniCalHead}>
        <span>Lu</span><span>Ma</span><span>Mi</span><span>Ju</span><span>Vi</span><span>Sá</span><span>Do</span>
      </div>
      <div className={styles.miniCalGrid}>
        {cells.map((c) =>
          c.blank ? <div key={c.key} className={styles.miniBlank} /> : (
            <div key={c.key} className={[styles.miniDay, marks?.has(c.day) ? styles.miniHasData : ''].join(' ')}>{c.day}</div>
          )
        )}
      </div>
    </div>
  );
}

/* Donut (Vacaciones) */
function Donut({ total = 23, usadas = 0, pendientes = 0 }) {
  const done = usadas + pendientes;
  const left = Math.max(total - done, 0);
  const pct = total > 0 ? done / total : 0;
  const angle = Math.min(360 * pct, 360);
  const bg = `conic-gradient(var(--accent) ${angle}deg, rgba(255,255,255,.08) ${angle}deg)`;
  return (
    <div className={styles.donutWrap}>
      <div className={styles.donutRing} style={{ background: bg }}>
        <div className={styles.donutHole}>
          <div className={styles.donutBig}>{left}</div>
          <div className={styles.donutSub}>días<br/>disponibles</div>
        </div>
      </div>
      <div className={styles.donutLegend}>
        <span><i className={styles.dotLeft} /> Disponibles: {left}</span>
        <span><i className={styles.dotUsed} /> Usadas: {usadas}</span>
        <span><i className={styles.dotPend} /> Pendientes: {pendientes}</span>
        <span><i className={styles.dotTotal} /> Total año: {total}</span>
      </div>
    </div>
  );
}

/* ===== Página ===== */
export default function MiPerfilPage() {
  const { user, profile: authProfile, loading, setProfile: setAuthProfile } = useAuth();
  const navigate = useNavigate();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editableProfile, setEditableProfile] = useState(null);

  // Avatar modal (elección selfie/galería)
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Widgets data
  const [currentDate] = useState(() => new Date());
  const [nominaSummary, setNominaSummary] = useState({
    desayunos: 0, cenas: 0, procenas: 0, km: 0, conts: 0, dias: 0,
  });
  const [nominaMarks, setNominaMarks] = useState(new Set());
  const vacacionesInfo = useMemo(() => {
    const v = authProfile?.vacaciones_info || null;
    return { total: v?.total ?? 23, usadas: v?.usadas ?? 0, pendientes: v?.pendientes ?? 0 };
  }, [authProfile]);

  /* === Cargar datos nómina (igual ca la tine) === */
  useEffect(() => {
    const run = async () => {
      if (!user) return;
      const y = currentDate.getFullYear();
      const m = currentDate.getMonth() + 1;
      const { data, error } = await supabase
        .from('pontaje_curente')
        .select('pontaj_complet')
        .eq('user_id', user.id)
        .eq('an', y)
        .eq('mes', m)
        .maybeSingle();

      if (error) {
        console.warn('No se pudo leer borrador de nómina:', error.message);
        setNominaSummary({ desayunos: 0, cenas: 0, procenas: 0, km: 0, conts: 0, dias: 0 });
        setNominaMarks(new Set());
        return;
      }

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
        if (zi.desayuno || zi.cena || zi.procena || kmZi > 0 || (zi.contenedores || 0) > 0 || (zi.suma_festivo || 0) > 0) marks.add(d);
      });

      setNominaSummary({ desayunos: D, cenas: C, procenas: P, km: Math.round(KM), conts: CT, dias: marks.size });
      setNominaMarks(marks);
    };
    run();
  }, [user, currentDate]);

  /* ======= Avatar: modal + upload ImgBB ======= */

  const openPhoto = () => {
    setAvatarPreview(authProfile?.avatar_url || null);
    setAvatarFile(null);
    setIsPhotoModalOpen(true);
  };

  const closePhoto = () => {
    setIsPhotoModalOpen(false);
  };

  // onChange comun
  const onPickFile = (file) => {
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  // ImgBB – base64 upload (Vite: VITE_IMGBB_KEY)
  const readAsBase64 = (file) =>
    new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result).split(',')[1] || '');
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });

  const uploadAvatarToImgbb = async (file) => {
    const IMGBB_KEY =
      import.meta.env.VITE_IMGBB_API_KEY;

    if (!IMGBB_KEY) throw new Error('Falta la clave de ImgBB (VITE_IMGBB_KEY).');

    const base64 = await readAsBase64(file);
    const fd = new FormData();
    fd.append('image', base64);

    const res = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(IMGBB_KEY)}`, {
      method: 'POST',
      body: fd,
    });
    const json = await res.json();
    if (!json?.success) throw new Error(json?.error?.message || 'Error subiendo imagen a ImgBB.');
    return json.data.display_url || json.data.url;
  };

  /* ======= Editar perfil ======= */
  const openEdit = () => {
    if (!authProfile) return;
    setEditableProfile({
      ...authProfile,
      new_camion_matricula: '',
      new_remorca_matricula: '',
    });
    setIsEditOpen(true);
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      // 1) Upload la ImgBB dacă avem fișier nou
      let avatarUrl = authProfile.avatar_url;
      if (avatarFile) {
        avatarUrl = await uploadAvatarToImgbb(avatarFile);
      }

      // 2) Vehículos (ca la tine)
      let camionIdToUpdate = authProfile.camion_id;
      let remorcaIdToUpdate = authProfile.remorca_id;

      if (!camionIdToUpdate && editableProfile.new_camion_matricula) {
        const { data: newCamion, error } = await supabase
          .from('camioane')
          .insert({ matricula: editableProfile.new_camion_matricula })
          .select()
          .single();
        if (error) throw error;
        camionIdToUpdate = newCamion.id;
      }

      if (!remorcaIdToUpdate && editableProfile.new_remorca_matricula) {
        const { data: newRemorca, error } = await supabase
          .from('remorci')
          .insert({ matricula: editableProfile.new_remorca_matricula })
          .select()
          .single();
        if (error) throw error;
        remorcaIdToUpdate = newRemorca.id;
      }

      // 3) Payload
      const payload = {
        nombre_completo: editableProfile.nombre_completo,
        cap_expirare: editableProfile.cap_expirare || null,
        carnet_caducidad: editableProfile.carnet_caducidad || null,
        tiene_adr: editableProfile.tiene_adr,
        adr_caducidad: editableProfile.tiene_adr ? editableProfile.adr_caducidad || null : null,
        camion_id: camionIdToUpdate || null,
        remorca_id: remorcaIdToUpdate || null,
        avatar_url: avatarUrl || null,
      };

      const { error: upErr } = await supabase.from('profiles').update(payload).eq('id', user.id);
      if (upErr) throw upErr;

      const { data: updated } = await supabase
        .from('profiles')
        .select('*, camioane:camion_id(*), remorci:remorca_id(*)')
        .eq('id', user.id)
        .maybeSingle();

      setAuthProfile(updated);
      setIsEditOpen(false);
      setIsPhotoModalOpen(false);
      alert('Perfil actualizado con éxito.');
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Navigații
  const goNomina = () => navigate('/calculadora-nomina');
  const goVacaciones = () => navigate('/vacaciones-standalone');
  const goCamion = () => authProfile?.camion_id && navigate(`/camion/${authProfile.camion_id}`);
  const goRemolque = () => authProfile?.remorca_id && navigate(`/remorca/${authProfile.remorca_id}`);

  if (loading || !authProfile) {
    return (
      <Layout backgroundClassName="profile-background">
        <div className={styles.loading}>Cargando…</div>
      </Layout>
    );
  }

  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    authProfile.nombre_completo || 'User'
  )}&background=0D8ABC&color=fff&size=256`;

  /* ============ RENDER ============ */
  return (
    <Layout backgroundClassName="profile-background">
      <div className={styles.page}>
        {/* ===== Header ===== */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            {/* Avatar mare */}
            <div className={styles.avatarXxl} onClick={openPhoto} onContextMenu={(e)=>e.preventDefault()}>
              <div className={styles.avatarRing} />
              {authProfile?.avatar_url ? (
                <img src={authProfile.avatar_url} alt="Avatar" className={styles.avatarImg} />
              ) : (
                <div className={styles.avatarFallbackXl}>
                  {(authProfile?.nombre_completo || 'R').slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className={styles.avatarOverlay} />
              <button
                type="button"
                className={styles.avatarCamBtn}
                title="Cambiar foto"
                aria-label="Cambiar foto"
                onClick={(e)=>{ e.stopPropagation(); openPhoto(); }}
              >
                <CameraIcon/>
              </button>
            </div>

            <div className={styles.titleWrap}>
              <h1 className={styles.pageTitleGlow}>Mi Perfil</h1>
              <div className={styles.headerActionsMobile}>
                <button className={styles.ghostBtn} onClick={openPhoto}><CameraIcon/> Cambiar foto</button>
                <button className={styles.editBtn} onClick={openEdit}><EditIcon/> Editar perfil</button>
              </div>
            </div>
          </div>

          <div className={styles.headerActions}>
            <button className={styles.ghostBtn} onClick={openPhoto}><CameraIcon/> Cambiar foto</button>
            <button className={styles.editBtn} onClick={openEdit}><EditIcon/> Editar perfil</button>
          </div>
        </div>

        {/* ===== Cards ===== */}
        <div className={styles.cardsGrid}>
          <section className={styles.card}>
            <div className={styles.cardTitle}>Conductor</div>
            <div className={styles.rows2}>
              <div>
                <span className={styles.k}>Nombre completo</span>
                <span className={styles.v}>{authProfile.nombre_completo || '—'}</span>
              </div>
              <div>
                <span className={styles.k}>CAP</span>
                <span className={styles.v}>{authProfile.cap_expirare || '—'}</span>
              </div>
              <div>
                <span className={styles.k}>Carnet conducir</span>
                <span className={styles.v}>{authProfile.carnet_caducidad || '—'}</span>
              </div>
              <div>
                <span className={styles.k}>ADR</span>
                <span className={styles.v}>{authProfile.tiene_adr ? authProfile.adr_caducidad || 'Sí' : 'No'}</span>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardTitleRow}>
              <div className={styles.cardTitle}>Camión</div>
              <button className={styles.ghostBtn} onClick={goCamion}>Ver ficha</button>
            </div>
            <div className={styles.rows2}>
              <div>
                <span className={styles.k}>Matrícula</span>
                <span className={styles.v}>{authProfile.camioane?.matricula || 'No asignado'}</span>
              </div>
              <div>
                <span className={styles.k}>ITV</span>
                <span className={styles.v}>{authProfile.camioane?.fecha_itv || '—'}</span>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardTitleRow}>
              <div className={styles.cardTitle}>Remolque</div>
              <button className={styles.ghostBtn} onClick={goRemolque}>Ver ficha</button>
            </div>
            <div className={styles.rows2}>
              <div>
                <span className={styles.k}>Matrícula</span>
                <span className={styles.v}>{authProfile.remorci?.matricula || 'No asignado'}</span>
              </div>
              <div>
                <span className={styles.k}>ITV</span>
                <span className={styles.v}>{authProfile.remorci?.fecha_itv || '—'}</span>
              </div>
            </div>
          </section>
        </div>

        {/* ===== Widgets ===== */}
        <div className={styles.widgetsGrid}>
          <section className={`${styles.card} ${styles.widget}`}>
            <div className={styles.widgetHeader}>
              <div className={styles.cardTitle}>Nómina</div>
              <span className={styles.badge}>Beta</span>
            </div>
            <div className={styles.widgetBody}>
              <div className={styles.widgetCol}>
                <div className={styles.statLine}>
                  <strong>Desayunos:</strong> {nominaSummary.desayunos}
                  <strong className={styles.dotSep}>Cenas:</strong> {nominaSummary.cenas}
                  <strong className={styles.dotSep}>Procenas:</strong> {nominaSummary.procenas}
                </div>
                <div className={styles.statLine2}>
                  Este mes: <b>{nominaSummary.km}</b> km • <b>{nominaSummary.conts}</b> contenedores • <b>{nominaSummary.dias}</b> días trabajados
                </div>
                <button className={styles.cta} onClick={goNomina}>Abrir calculadora</button>
              </div>
              <div className={styles.widgetColMiniCal}>
                <div className={styles.miniCalTitle}>{monthLabelES(currentDate)}</div>
                <MiniCalendar date={currentDate} marks={nominaMarks} />
              </div>
            </div>
          </section>

          <section className={`${styles.card} ${styles.widget}`}>
            <div className={styles.widgetHeader}>
              <div className={styles.cardTitle}>Vacaciones</div>
            </div>
            <div className={styles.widgetBody}>
              <div className={styles.widgetColMini}>
                <Donut total={vacacionesInfo.total} usadas={vacacionesInfo.usadas} pendientes={vacacionesInfo.pendientes} />
              </div>
              <div className={styles.widgetCol}>
                <p className={styles.vacHint}>Solicita días, ve aprobaciones y pendientes.<br/>Hoy: {new Date().toLocaleDateString('es-ES')}</p>
                <button className={styles.cta} onClick={goVacaciones}>Abrir vacaciones</button>
              </div>
            </div>
          </section>
        </div>

        {/* ===== Modal Editar Perfil ===== */}
        {isEditOpen && editableProfile && (
          <div className={styles.modalOverlay} onClick={() => setIsEditOpen(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>Editar perfil</h3>
                <button className={styles.iconBtn} onClick={() => setIsEditOpen(false)}>
                  <CloseIcon />
                </button>
              </div>

              <form className={styles.modalBody} onSubmit={saveProfile}>
                {/* Previzualizarea avatarului în cerc mare */}
                <div className={styles.previewWrapXL}>
                  <img className={styles.previewImg} src={avatarPreview || authProfile.avatar_url || defaultAvatar} alt="Previsualización" />
                </div>

                {/* Acțiuni poză */}
                <div className={styles.choiceGrid}>
                  <button type="button" className={styles.choiceCard} onClick={() => cameraInputRef.current?.click()}>
                    <div className={styles.choiceIcon}>📸</div>
                    <div className={styles.choiceTitle}>Hacer selfie</div>
                    <div className={styles.choiceText}>Abrir cámara nativa</div>
                  </button>
                  <button type="button" className={styles.choiceCard} onClick={() => fileInputRef.current?.click()}>
                    <div className={styles.choiceIcon}>🖼️</div>
                    <div className={styles.choiceTitle}>Subir desde galería</div>
                    <div className={styles.choiceText}>PNG, JPG o WEBP</div>
                  </button>
                </div>

                {/* input-uri native (ocultas) */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  style={{ display: 'none' }}
                  onChange={(e)=> onPickFile(e.target.files?.[0])}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  style={{ display: 'none' }}
                  onChange={(e)=> onPickFile(e.target.files?.[0])}
                />

                {/* restul formularului */}
                <div className={styles.inputGroup}>
                  <label>Nombre Completo</label>
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

                {/* Vehículos */}
                {!authProfile.camion_id ? (
                  <div className={styles.inputGroup}>
                    <label>Matrícula Camión</label>
                    <input
                      type="text"
                      placeholder="Introduce la matrícula…"
                      value={editableProfile.new_camion_matricula}
                      onChange={(e) => setEditableProfile((p) => ({ ...p, new_camion_matricula: e.target.value.toUpperCase() }))}
                    />
                  </div>
                ) : (
                  <div className={styles.inputGroup}>
                    <label>Camión asignado</label>
                    <input type="text" value={authProfile.camioane?.matricula || ''} disabled />
                  </div>
                )}

                {!authProfile.remorca_id ? (
                  <div className={styles.inputGroup}>
                    <label>Matrícula Remolque</label>
                    <input
                      type="text"
                      placeholder="Introduce la matrícula…"
                      value={editableProfile.new_remorca_matricula}
                      onChange={(e) => setEditableProfile((p) => ({ ...p, new_remorca_matricula: e.target.value.toUpperCase() }))}
                    />
                  </div>
                ) : (
                  <div className={styles.inputGroup}>
                    <label>Remolque asignado</label>
                    <input type="text" value={authProfile.remorci?.matricula || ''} disabled />
                  </div>
                )}

                <div className={styles.modalFooter}>
                  <button type="button" className={styles.btnGhost} onClick={() => setIsEditOpen(false)}>Cancelar</button>
                  <button type="submit" className={styles.btnPrimary}>Guardar cambios</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===== Modal foto scurt (dacă vrei fără edit) ===== */}
        {isPhotoModalOpen && (
          <div className={styles.modalOverlay} onClick={closePhoto}>
            <div className={styles.modal} onClick={(e)=>e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>Fotografía de perfil</h3>
                <button className={styles.iconBtn} onClick={closePhoto}><CloseIcon/></button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.previewWrapXL}>
                  <img className={styles.previewImg} src={avatarPreview || authProfile.avatar_url || defaultAvatar} alt="Previsualización" />
                </div>
                <div className={styles.choiceGrid}>
                  <button type="button" className={styles.choiceCard} onClick={() => cameraInputRef.current?.click()}>
                    <div className={styles.choiceIcon}>📸</div>
                    <div className={styles.choiceTitle}>Hacer selfie</div>
                    <div className={styles.choiceText}>Abrir cámara nativa</div>
                  </button>
                  <button type="button" className={styles.choiceCard} onClick={() => fileInputRef.current?.click()}>
                    <div className={styles.choiceIcon}>🖼️</div>
                    <div className={styles.choiceTitle}>Subir desde galería</div>
                    <div className={styles.choiceText}>PNG, JPG o WEBP</div>
                  </button>
                </div>
                <input ref={cameraInputRef} type="file" accept="image/*" capture="user" style={{display:'none'}} onChange={(e)=> onPickFile(e.target.files?.[0])}/>
                <input ref={fileInputRef} type="file" accept="image/png, image/jpeg, image/webp" style={{display:'none'}} onChange={(e)=> onPickFile(e.target.files?.[0])}/>
              </div>
              <div className={styles.modalFooter}>
                <button className={styles.btnGhost} onClick={closePhoto}>Volver</button>
                <button
                  className={styles.btnPrimary}
                  onClick={async () => {
                    try {
                      if (!avatarFile) { alert('Elige una foto primero.'); return; }
                      // simulăm "guardar" din modalul scurt
                      let url = await uploadAvatarToImgbb(avatarFile);
                      await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
                      const { data: updated } = await supabase
                        .from('profiles')
                        .select('*, camioane:camion_id(*), remorci:remorca_id(*)')
                        .eq('id', user.id).maybeSingle();
                      setAuthProfile(updated);
                      setIsPhotoModalOpen(false);
                      alert('Foto actualizada.');
                    } catch (e) { alert(e.message); }
                  }}
                >
                  Guardar foto
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
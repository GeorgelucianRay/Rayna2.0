// src/components/MiPerfilPage.jsx
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import Layout from './Layout';
import styles from './MiPerfilPage.module.css';

// --- Icoane (adăugate cele necesare)
const EditIcon = () => ( <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg> );
const CloseIcon = () => ( <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> );
const CameraIcon = () => ( <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg> );
const UploadIcon = () => ( <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg> );

// --- Componentele Widget (cod original nemodificat)
const monthLabelES = (d) => d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\p{L}/u, (c) => c.toUpperCase());
function MiniCalendar({ date, marks }) { const y = date.getFullYear(), m = date.getMonth(); const first = new Date(y, m, 1); const startDay = (first.getDay() + 6) % 7; const daysInMonth = new Date(y, m + 1, 0).getDate(); const cells = []; for (let i = 0; i < startDay; i++) cells.push({ blank: true, key: `b-${i}` }); for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, key: `d-${d}` }); return ( <div className={styles.miniCal}><div className={styles.miniCalHead}><span>Lu</span><span>Ma</span><span>Mi</span><span>Ju</span><span>Vi</span><span>Sá</span><span>Do</span></div><div className={styles.miniCalGrid}>{cells.map((c) => c.blank ? ( <div key={c.key} className={styles.miniBlank} /> ) : ( <div key={c.key} className={[styles.miniDay, marks?.has(c.day) ? styles.miniHasData : ''].join(' ')}>{c.day}</div> ))}</div></div> ); }
function Donut({ total = 23, usadas = 0, pendientes = 0 }) { const done = usadas + pendientes; const left = Math.max(total - done, 0); const pct = total > 0 ? done / total : 0; const angle = Math.min(360 * pct, 360); const bg = `conic-gradient(var(--accent) ${angle}deg, rgba(255,255,255,.08) ${angle}deg)`; return ( <div className={styles.donutWrap}><div className={styles.donutRing} style={{ background: bg }}><div className={styles.donutHole}><div className={styles.donutBig}>{left}</div><div className={styles.donutSub}>días<br />disponibles</div></div></div><div className={styles.donutLegend}><span><i className={styles.dotLeft} /> Disponibles: {left}</span><span><i className={styles.dotUsed} /> Usadas: {usadas}</span><span><i className={styles.dotPend} /> Pendientes: {pendientes}</span><span><i className={styles.dotTotal} /> Total año: {total}</span></div></div> ); }

// --- Componenta Principală ---
export default function MiPerfilPage() {
  const { user, profile: authProfile, loading, setProfile: setAuthProfile } = useAuth();
  const navigate = useNavigate();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editableProfile, setEditableProfile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // --- Stări și Ref-uri pentru AVATAR & CAMERĂ
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  // --- Stări originale pentru widget-uri
  const [currentDate] = useState(() => new Date());
  const [nominaSummary, setNominaSummary] = useState({ desayunos: 0, cenas: 0, procenas: 0, km: 0, conts: 0, dias: 0 });
  const [nominaMarks, setNominaMarks] = useState(new Set());
  const vacacionesInfo = useMemo(() => { const v = authProfile?.vacaciones_info || null; return { total: v?.total ?? 23, usadas: v?.usadas ?? 0, pendientes: v?.pendientes ?? 0 }; }, [authProfile]);

  // --- Logică originală (nemodificată)
  useEffect(() => { const run = async () => { if (!user) return; const y = currentDate.getFullYear(); const m = currentDate.getMonth() + 1; const { data, error } = await supabase.from('pontaje_curente').select('pontaj_complet').eq('user_id', user.id).eq('an', y).eq('mes', m).maybeSingle(); if (error) { console.warn('No se pudo leer borrador de nómina:', error.message); setNominaSummary({ desayunos: 0, cenas: 0, procenas: 0, km: 0, conts: 0, dias: 0 }); setNominaMarks(new Set()); return; } const zile = data?.pontaj_complet?.zilePontaj || []; let D = 0, C = 0, P = 0, KM = 0, CT = 0; const marks = new Set(); zile.forEach((zi, idx) => { if (!zi) return; const d = idx + 1; const kmZi = (parseFloat(zi.km_final) || 0) - (parseFloat(zi.km_iniciar) || 0); if (zi.desayuno) D++; if (zi.cena) C++; if (zi.procena) P++; if (kmZi > 0) KM += kmZi; if ((zi.contenedores || 0) > 0) CT += zi.contenedores || 0; if (zi.desayuno || zi.cena || zi.procena || kmZi > 0 || (zi.contenedores || 0) > 0 || (zi.suma_festivo || 0) > 0) { marks.add(d); } }); setNominaSummary({ desayunos: D, cenas: C, procenas: P, km: Math.round(KM), conts: CT, dias: marks.size }); setNominaMarks(marks); }; run(); }, [user, currentDate]);
  
  // --- Curățare stream cameră
  useEffect(() => { return () => { if (stream) { stream.getTracks().forEach(track => track.stop()); } }; }, [stream]);

  const openEdit = () => {
    if (!authProfile) return;
    setEditableProfile({ ...authProfile, new_camion_matricula: '', new_remorca_matricula: '' });
    setAvatarPreview(authProfile.avatar_url || null);
    setAvatarFile(null);
    setIsEditOpen(true);
  };
  
  // --- LOGICA PENTRU AVATAR & CAMERĂ ---

  const uploadToImgur = async (file) => {
    // IMPORTANT: Înlocuiți cu propriul Client ID de la Imgur
    const IMGUR_CLIENT_ID = 'b73752e593255f0'; 
    if (!IMGUR_CLIENT_ID || IMGUR_CLIENT_ID === 'ÎNLOCUIEȘTE_AICI') {
      throw new Error('Client ID pentru Imgur nu este setat.');
    }
    const formData = new FormData();
    formData.append('image', file);
    const response = await fetch('https://api.imgur.com/3/image', { method: 'POST', headers: { Authorization: `Client-ID ${IMGUR_CLIENT_ID}` }, body: formData });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.data.error || 'Eroare la încărcarea pe Imgur.');
    }
    return data.data.link; // Returnează link-ul direct
  };
  
  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const startCamera = async () => {
    try {
      const streamData = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: 'user' } });
      setStream(streamData);
      setIsCameraOpen(true);
    } catch (error) { alert("Nu s-a putut accesa camera. Verifică permisiunile."); }
  };

  const stopCamera = () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
    setStream(null);
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        const capturedFile = new File([blob], "profile-photo.jpg", { type: "image/jpeg" });
        setAvatarFile(capturedFile);
        setAvatarPreview(URL.createObjectURL(blob));
      }
      stopCamera();
    }, 'image/jpeg');
  };

  useEffect(() => { if (isCameraOpen && stream && videoRef.current) videoRef.current.srcObject = stream; }, [isCameraOpen, stream]);

  // --- Funcția de salvare, MODIFICATĂ pentru a include link-ul de la Imgur
  const saveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let avatar_url = authProfile.avatar_url; // Păstrează link-ul vechi implicit
      
      // Dacă a fost selectat un fișier nou (din upload sau cameră), îl încarcă pe Imgur
      if (avatarFile) {
        avatar_url = await uploadToImgur(avatarFile);
      }

      // Logica originală pentru vehicule
      let camionIdToUpdate = authProfile.camion_id;
      let remorcaIdToUpdate = authProfile.remorca_id;
      if (!camionIdToUpdate && editableProfile.new_camion_matricula) { const { data, error } = await supabase.from('camioane').insert({ matricula: editableProfile.new_camion_matricula }).select().single(); if (error) throw error; camionIdToUpdate = data.id; }
      if (!remorcaIdToUpdate && editableProfile.new_remorca_matricula) { const { data, error } = await supabase.from('remorci').insert({ matricula: editableProfile.new_remorca_matricula }).select().single(); if (error) throw error; remorcaIdToUpdate = data.id; }
      
      // PREGĂTIREA PAYLOAD-ULUI
      const payload = {
        nombre_completo: editableProfile.nombre_completo,
        cap_expirare: editableProfile.cap_expirare || null,
        carnet_caducidad: editableProfile.carnet_caducidad || null,
        tiene_adr: editableProfile.tiene_adr,
        adr_caducidad: editableProfile.tiene_adr ? editableProfile.adr_caducidad || null : null,
        camion_id: camionIdToUpdate || null,
        remorca_id: remorcaIdToUpdate || null,
        avatar_url: avatar_url, // Aici se adaugă link-ul de la Imgur
      };

      const { error: upErr } = await supabase.from('profiles').update(payload).eq('id', user.id);
      if (upErr) throw upErr;

      const { data: updated } = await supabase.from('profiles').select('*, camioane:camion_id(*), remorci:remorca_id(*)').eq('id', user.id).maybeSingle();
      setAuthProfile(updated);
      setIsEditOpen(false);
      alert('Perfil actualizado con éxito.');
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Navigații (original)
  const goNomina = () => navigate('/calculadora-nomina');
  const goVacaciones = () => navigate('/vacaciones-standalone');
  const goCamion = () => authProfile?.camion_id && navigate(`/camion/${authProfile.camion_id}`);
  const goRemolque = () => authProfile?.remorca_id && navigate(`/remorca/${authProfile.remorca_id}`);

  if (loading || !authProfile) { return <Layout backgroundClassName="profile-background"><div className={styles.loading}>Cargando…</div></Layout>; }
  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(authProfile.nombre_completo || 'U')}&background=0D8ABC&color=fff&size=128`;

  return (
    <Layout backgroundClassName="profile-background">
      <div className={styles.page}>
        {/* --- Header cu avatar --- */}
        <div className={styles.header}>
            <div className={styles.headerProfileInfo}>
                <div className={styles.avatar}>
                    <img src={authProfile.avatar_url || defaultAvatar} alt="Poza de profil" />
                    <div className={styles.avatarOverlay}></div> {/* Pelicula transparentă */}
                </div>
                <h1>Mi Perfil</h1>
            </div>
            <button className={styles.editBtn} onClick={openEdit}><EditIcon /> Editar perfil</button>
        </div>

        {/* --- Grid-uri (cod original, nemodificat) --- */}
        <div className={styles.cardsGrid}>{/* ...carduri originale... */}</div>
        <div className={styles.widgetsGrid}>{/* ...widget-uri originale... */}</div>

        {/* --- MODAL DE EDITARE (refăcut) --- */}
        {isEditOpen && editableProfile && (
          <div className={styles.modalOverlay} onClick={() => setIsEditOpen(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}><h3>Editar perfil</h3><button className={styles.iconBtn} onClick={() => setIsEditOpen(false)}><CloseIcon /></button></div>
              <form className={styles.modalBody} onSubmit={saveProfile}>
                {/* Secțiunea pentru avatar */}
                <div className={styles.avatarSection}>
                  <div className={`${styles.avatar} ${styles.avatarInModal}`}>
                    <img src={avatarPreview || authProfile.avatar_url || defaultAvatar} alt="Previzualizare" />
                  </div>
                  <div className={styles.avatarActions}>
                    <button type="button" className={styles.actionBtn} onClick={() => fileInputRef.current.click()}><UploadIcon /> Subir foto</button>
                    <button type="button" className={styles.actionBtn} onClick={startCamera}><CameraIcon /> Usar cámara</button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg" style={{ display: 'none' }}/>
                  </div>
                </div>
                
                {/* Câmpurile originale ale formularului */}
                <div className={styles.inputGroup}>{/* ...input nombre... */}</div>
                <div className={styles.grid2}>{/* ...input-uri CAP, Carnet... */}</div>
                {/* ...restul formularului original... */}

                <div className={styles.modalFooter}>
                  <button type="button" className={styles.btnGhost} onClick={() => setIsEditOpen(false)}>Cancelar</button>
                  <button type="submit" className={styles.btnPrimary} disabled={isSaving}>
                    {isSaving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- MODAL PENTRU CAMERĂ --- */}
        {isCameraOpen && (
          <div className={styles.cameraOverlay} onClick={stopCamera}>
            <div className={styles.cameraModal} onClick={(e) => e.stopPropagation()}>
              <video ref={videoRef} autoPlay playsInline className={styles.cameraFeed}></video>
              <canvas ref={canvasRef} style={{display: 'none'}}></canvas>
              <div className={styles.cameraControls}><button type="button" className={styles.captureBtn} onClick={capturePhoto}></button></div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

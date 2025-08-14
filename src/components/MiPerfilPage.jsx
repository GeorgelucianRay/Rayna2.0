import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import styles from './MiPerfilPage.module.css';

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
const AlertIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

function MiPerfilPage() {
  const navigate = useNavigate();
  const { user, profile: authProfile, loading, setProfile: setAuthProfile } = useAuth();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editable, setEditable] = useState(null);
  const [alerts, setAlerts] = useState([]);

  // ——— helpers
  const makeAlerts = (p) => {
    if (!p) return [];
    const out = [];
    const today = new Date(); today.setHours(0,0,0,0);
    const within = (d) => {
      const t = new Date(d); t.setHours(0,0,0,0);
      const diff = Math.ceil((t - today) / 86400000);
      return { diff, expired: diff < 0 };
    };
    const pushIf = (d, label) => {
      if (!d) return;
      const { diff, expired } = within(d);
      if (expired || diff <= 30) out.push({ label, diff, expired });
    };

    pushIf(p.cap_expirare, 'CAP');
    pushIf(p.carnet_caducidad, 'Permiso de conducir');
    if (p.tiene_adr) pushIf(p.adr_caducidad, 'ADR');
    if (p.camioane?.fecha_itv) pushIf(p.camioane.fecha_itv, `ITV Camión ${p.camioane?.matricula || ''}`);
    if (p.remorci?.fecha_itv) pushIf(p.remorci.fecha_itv, `ITV Remolque ${p.remorci?.matricula || ''}`);
    return out.sort((a,b)=>a.diff-b.diff);
  };

  useEffect(() => {
    if (authProfile) setAlerts(makeAlerts(authProfile));
  }, [authProfile]);

  const openEdit = () => {
    if (!authProfile) return;
    setEditable({
      ...authProfile,
      new_camion_matricula: '',
      new_remorca_matricula: '',
    });
    setIsEditOpen(true);
  };

  const onSubmitEdit = async (e) => {
    e.preventDefault();
    try {
      let camionId = authProfile.camion_id;
      let remorcaId = authProfile.remorca_id;

      if (!camionId && editable.new_camion_matricula) {
        const { data: cNew, error } = await supabase
          .from('camioane')
          .insert({ matricula: editable.new_camion_matricula.toUpperCase() })
          .select().single();
        if (error) throw error;
        camionId = cNew.id;
      }
      if (!remorcaId && editable.new_remorca_matricula) {
        const { data: rNew, error } = await supabase
          .from('remorci')
          .insert({ matricula: editable.new_remorca_matricula.toUpperCase() })
          .select().single();
        if (error) throw error;
        remorcaId = rNew.id;
      }

      const payload = {
        nombre_completo: editable.nombre_completo,
        cap_expirare: editable.cap_expirare || null,
        carnet_caducidad: editable.carnet_caducidad || null,
        tiene_adr: !!editable.tiene_adr,
        adr_caducidad: editable.tiene_adr ? (editable.adr_caducidad || null) : null,
        camion_id: camionId || null,
        remorca_id: remorcaId || null,
      };

      const { error: upErr } = await supabase.from('profiles')
        .update(payload).eq('id', user.id);
      if (upErr) throw upErr;

      const { data: refreshed } = await supabase
        .from('profiles')
        .select('*, camioane:camion_id(*), remorci:remorca_id(*)')
        .eq('id', user.id).maybeSingle();

      setAuthProfile(refreshed);
      setIsEditOpen(false);
      alert('¡Perfil actualizado!');
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loading || !authProfile) {
    return <div className={styles.loadingScreen}>Cargando…</div>;
  }

  const nombre = authProfile.nombre_completo || 'Sin nombre';
  const camionMat = authProfile.camioane?.matricula || 'No asignado';
  const remolqueMat = authProfile.remorci?.matricula || 'No asignado';

  return (
    <div className={styles.page}>
      {/* cabecera */}
      <div className={styles.header}>
        <h1 className={styles.title}>Mi Perfil</h1>
        <button className={styles.btnPrimary} onClick={openEdit}>
          <EditIcon /> Editar perfil
        </button>
      </div>

      {/* alerts compacte */}
      {alerts.length > 0 && (
        <div className={`${styles.card} ${styles.cardAlert}`}>
          <div className={styles.alertHeader}>
            <span className={styles.alertIcon}><AlertIcon/></span>
            <h3>Alertas próximas / vencidas</h3>
          </div>
          <div className={styles.alertChips}>
            {alerts.map((a, i) => (
              <span key={i} className={`${styles.chip} ${a.expired ? styles.chipDanger : styles.chipWarn}`}>
                {a.label} · {a.expired ? `vencido hace ${Math.abs(a.diff)} días` : `vence en ${a.diff} días`}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* GRID principal */}
      <div className={styles.grid}>
        {/* Conductor */}
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Conductor</h3>
          <div className={styles.infoGrid}>
            <div>
              <div className={styles.kvLabel}>Nombre completo</div>
              <div className={styles.kvValue}>{nombre}</div>
            </div>
            <div>
              <div className={styles.kvLabel}>CAP</div>
              <div className={styles.kvValue}>{authProfile.cap_expirare || '—'}</div>
            </div>
            <div>
              <div className={styles.kvLabel}>Carnet conducir</div>
              <div className={styles.kvValue}>{authProfile.carnet_caducidad || '—'}</div>
            </div>
            <div>
              <div className={styles.kvLabel}>ADR</div>
              <div className={styles.kvValue}>
                {authProfile.tiene_adr ? (authProfile.adr_caducidad || 'Sí') : 'No'}
              </div>
            </div>
          </div>
        </section>

        {/* Camión */}
        <section className={styles.card}>
          <div className={styles.cardHeadRow}>
            <h3 className={styles.cardTitle}>Camión</h3>
            {authProfile.camion_id && (
              <button
                className={styles.btnGhost}
                onClick={() => navigate(`/camion/${authProfile.camion_id}`)}
              >
                Ver ficha
              </button>
            )}
          </div>
          <div className={styles.infoGrid}>
            <div>
              <div className={styles.kvLabel}>Matrícula</div>
              <div className={styles.kvValue}>{camionMat}</div>
            </div>
            <div>
              <div className={styles.kvLabel}>ITV</div>
              <div className={styles.kvValue}>{authProfile.camioane?.fecha_itv || '—'}</div>
            </div>
          </div>
        </section>

        {/* Remolque */}
        <section className={styles.card}>
          <div className={styles.cardHeadRow}>
            <h3 className={styles.cardTitle}>Remolque</h3>
            {authProfile.remorca_id && (
              <button
                className={styles.btnGhost}
                onClick={() => navigate(`/remorca/${authProfile.remorca_id}`)}
              >
                Ver ficha
              </button>
            )}
          </div>
          <div className={styles.infoGrid}>
            <div>
              <div className={styles.kvLabel}>Matrícula</div>
              <div className={styles.kvValue}>{remolqueMat}</div>
            </div>
            <div>
              <div className={styles.kvLabel}>ITV</div>
              <div className={styles.kvValue}>{authProfile.remorci?.fecha_itv || '—'}</div>
            </div>
          </div>
        </section>

        {/* Widget Nómina */}
        <section className={`${styles.card} ${styles.widget}`}>
          <div className={styles.widgetHeader}>
            <h3 className={styles.cardTitle}>Nómina</h3>
            <span className={styles.widgetBadge}>Beta</span>
          </div>
          <p className={styles.widgetText}>
            Calcula dietas, kilómetros y pluses del mes.
          </p>
          <button className={styles.btnPrimary} onClick={() => navigate('/nomina')}>
            Abrir calculadora
          </button>
        </section>

        {/* Widget Vacaciones */}
        <section className={`${styles.card} ${styles.widget}`}>
          <div className={styles.widgetHeader}>
            <h3 className={styles.cardTitle}>Vacaciones</h3>
            <span className={styles.widgetDot}></span>
          </div>
          <p className={styles.widgetText}>
            Solicita días, ve aprobaciones y pendientes.
          </p>
          <button className={styles.btnPrimary} onClick={() => navigate('/vacaciones')}>
            Abrir vacaciones
          </button>
        </section>
      </div>

      {/* MODAL editar perfil */}
      {isEditOpen && editable && (
        <div className={styles.modalOverlay} onClick={()=>setIsEditOpen(false)}>
          <div className={styles.modal} onClick={(e)=>e.stopPropagation()}>
            <div className={styles.modalTop}>
              <h3>Editar perfil</h3>
              <button className={styles.iconClose} onClick={()=>setIsEditOpen(false)}>
                <CloseIcon/>
              </button>
            </div>
            <form className={styles.form} onSubmit={onSubmitEdit}>
              <label>
                <span>Nombre completo</span>
                <input
                  type="text"
                  value={editable.nombre_completo || ''}
                  onChange={(e)=>setEditable({...editable, nombre_completo:e.target.value})}
                />
              </label>

              <div className={styles.formTwo}>
                <label>
                  <span>Caducidad CAP</span>
                  <input
                    type="date"
                    value={editable.cap_expirare || ''}
                    onChange={(e)=>setEditable({...editable, cap_expirare:e.target.value})}
                  />
                </label>
                <label>
                  <span>Caducidad Carnet</span>
                  <input
                    type="date"
                    value={editable.carnet_caducidad || ''}
                    onChange={(e)=>setEditable({...editable, carnet_caducidad:e.target.value})}
                  />
                </label>
              </div>

              <div className={styles.formTwo}>
                <label>
                  <span>¿Tiene ADR?</span>
                  <select
                    value={editable.tiene_adr ? 'true' : 'false'}
                    onChange={(e)=>setEditable({...editable, tiene_adr: e.target.value==='true'})}
                  >
                    <option value="false">No</option>
                    <option value="true">Sí</option>
                  </select>
                </label>
                {editable.tiene_adr && (
                  <label>
                    <span>Caducidad ADR</span>
                    <input
                      type="date"
                      value={editable.adr_caducidad || ''}
                      onChange={(e)=>setEditable({...editable, adr_caducidad:e.target.value})}
                    />
                  </label>
                )}
              </div>

              {!authProfile.camion_id ? (
                <label>
                  <span>Matrícula Camión (crear)</span>
                  <input
                    type="text"
                    placeholder="p.ej. 1710KKY"
                    value={editable.new_camion_matricula}
                    onChange={(e)=>setEditable({...editable, new_camion_matricula:e.target.value.toUpperCase()})}
                  />
                </label>
              ) : (
                <label>
                  <span>Camión asignado</span>
                  <input type="text" disabled value={camionMat}/>
                </label>
              )}

              {!authProfile.remorca_id ? (
                <label>
                  <span>Matrícula Remolque (crear)</span>
                  <input
                    type="text"
                    placeholder="ABC-1234"
                    value={editable.new_remorca_matricula}
                    onChange={(e)=>setEditable({...editable, new_remorca_matricula:e.target.value.toUpperCase()})}
                  />
                </label>
              ) : (
                <label>
                  <span>Remolque asignado</span>
                  <input type="text" disabled value={remolqueMat}/>
                </label>
              )}

              <div className={styles.formActions}>
                <button type="button" className={styles.btnGhost} onClick={()=>setIsEditOpen(false)}>Cancelar</button>
                <button type="submit" className={styles.btnPrimary}>Guardar cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MiPerfilPage;
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import Layout from './Layout';
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

/** 👉 ajustează aici dacă ai alte rute */
const ROUTES = {
  nomina: ['/calculadora-nomina', '/nomina', '/calculadora'],
  vacaciones: ['/vacaciones', '/mi-perfil/vacaciones'],
};

export default function MiPerfilPage() {
  const navigate = useNavigate();
  const { user, profile: authProfile, loading, setProfile: setAuthProfile } = useAuth();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editable, setEditable] = useState(null);

  // widgets data
  const [alerts, setAlerts] = useState([]);
  const [nomina, setNomina] = useState({
    desayunos: 0, cenas: 0, procenas: 0, km: 0, contenedores: 0, plus: 0, dias: 0,
  });
  const [vac, setVac] = useState({ disponibles: 0, anuales: 23, pendientes: 0 });

  const year = useMemo(() => new Date().getFullYear(), []);
  const month = useMemo(() => new Date().getMonth() + 1, []);

  // ---- helpers
  const buildAlerts = (p) => {
    if (!p) return [];
    const arr = [];
    const today = new Date(); today.setHours(0,0,0,0);
    const pushDate = (date, label) => {
      if (!date) return;
      const d = new Date(date); d.setHours(0,0,0,0);
      const diff = Math.ceil((d - today) / 86400000);
      if (diff <= 30) arr.push({ label, diff, expired: diff < 0 });
    };
    pushDate(p.cap_expirare, 'CAP');
    pushDate(p.carnet_caducidad, 'Permiso de conducir');
    if (p.tiene_adr) pushDate(p.adr_caducidad, 'ADR');
    if (p.camioane?.fecha_itv) pushDate(p.camioane.fecha_itv, `ITV Camión ${p.camioane?.matricula || ''}`);
    if (p.remorci?.fecha_itv) pushDate(p.remorci.fecha_itv, `ITV Remolque ${p.remorci?.matricula || ''}`);
    return arr.sort((a,b)=>a.diff-b.diff);
  };

  const openFirst = (arr) => navigate(arr[0]);

  // ---- load widgets
  useEffect(() => {
    if (!authProfile || !user) return;

    setAlerts(buildAlerts(authProfile));

    // Nómina (din ciorna curentă)
    (async () => {
      try {
        const { data } = await supabase
          .from('pontaje_curente')
          .select('pontaj_complet')
          .eq('user_id', user.id)
          .eq('an', year)
          .eq('mes', month)
          .maybeSingle();

        const zile = data?.pontaj_complet?.zilePontaj || [];
        let d=0,c=0,p=0,km=0,cont=0,plus=0,workDays=0;

        zile.forEach(z => {
          if (z?.desayuno) d++;
          if (z?.cena) c++;
          if (z?.procena) p++;
          const start = parseFloat(z?.km_iniciar || 0);
          const end   = parseFloat(z?.km_final   || 0);
          if (end > start) km += (end - start);
          cont += parseFloat(z?.contenedores || 0);
          plus += parseFloat(z?.suma_festivo || 0);
          if (z?.desayuno || z?.cena || z?.procena || (end>start) || (z?.contenedores>0) || (z?.suma_festivo>0)) {
            workDays++;
          }
        });

        setNomina({ desayunos:d, cenas:c, procenas:p, km, contenedores:cont, plus, dias: workDays });
      } catch {
        // dacă tabela nu există / nu e rând -> păstrăm zero-uri
      }
    })();

    // Vacaciones – încearcă să citească un rezumat; dacă nu există, folosește fallback
    (async () => {
      try {
        const { data, error } = await supabase
          .from('vacaciones_estado')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        if (!error && data) {
          setVac({
            disponibles: Number(data.disponibles ?? 0),
            anuales: Number(data.anuales ?? 23),
            pendientes: Number(data.pendientes ?? 0),
          });
        }
      } catch {
        // ignorăm – rămâne fallback-ul
      }
    })();

  }, [authProfile, user, year, month]);

  // ---- edit profile
  const openEdit = () => {
    if (!authProfile) return;
    setEditable({
      ...authProfile,
      new_camion_matricula: '',
      new_remorca_matricula: '',
    });
    setIsEditOpen(true);
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    try {
      let camionId = authProfile.camion_id;
      let remorcaId = authProfile.remorca_id;

      if (!camionId && editable.new_camion_matricula) {
        const { data, error } = await supabase
          .from('camioane')
          .insert({ matricula: editable.new_camion_matricula.toUpperCase() })
          .select().single();
        if (error) throw error;
        camionId = data.id;
      }
      if (!remorcaId && editable.new_remorca_matricula) {
        const { data, error } = await supabase
          .from('remorci')
          .insert({ matricula: editable.new_remorca_matricula.toUpperCase() })
          .select().single();
        if (error) throw error;
        remorcaId = data.id;
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

  // ring vacaciones
  const vacTot = vac.anuales > 0 ? vac.anuales : 23;
  const vacDisp = Math.max(0, Math.min(vacTot, vac.disponibles));
  const vacPct = vacTot ? (vacDisp / vacTot) : 0;
  const CIRC = 2 * Math.PI * 36; // r=36

  return (
    <Layout backgroundClassName="profile-background">
      <div className={styles.page}>
        {/* header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Mi Perfil</h1>
          <button className={styles.btnPrimary} onClick={openEdit}>
            <EditIcon /> Editar perfil
          </button>
        </div>

        {/* alert widget */}
        {alerts.length > 0 && (
          <div className={`${styles.card} ${styles.cardAlert}`}>
            <div className={styles.alertHeader}>
              <span className={styles.alertIcon}><AlertIcon/></span>
              <h3>Alertas próximas / vencidas</h3>
            </div>
            <div className={styles.alertChips}>
              {alerts.map((a,i)=>(
                <span key={i} className={`${styles.chip} ${a.expired?styles.chipDanger:styles.chipWarn}`}>
                  {a.label} · {a.expired?`vencido hace ${Math.abs(a.diff)} días`:`vence en ${a.diff} días`}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* grid principal */}
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
                <div className={styles.kvValue}>{authProfile.tiene_adr ? (authProfile.adr_caducidad || 'Sí') : 'No'}</div>
              </div>
            </div>
          </section>

          {/* Camión */}
          <section className={styles.card}>
            <div className={styles.cardHeadRow}>
              <h3 className={styles.cardTitle}>Camión</h3>
              {authProfile.camion_id && (
                <button className={styles.btnGhost} onClick={()=>navigate(`/camion/${authProfile.camion_id}`)}>
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
                <button className={styles.btnGhost} onClick={()=>navigate(`/remorca/${authProfile.remorca_id}`)}>
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

            <div className={styles.pills}>
              <span className={styles.pill}>Desayunos: <b>{nomina.desayunos}</b></span>
              <span className={styles.pill}>Cenas: <b>{nomina.cenas}</b></span>
              <span className={styles.pill}>Procenas: <b>{nomina.procenas}</b></span>
            </div>

            <div className={styles.widgetLine}>
              <span>Este mes:</span>
              <span className={styles.dim}> {nomina.km} km</span>
              <span className={styles.sep}>•</span>
              <span className={styles.dim}>{nomina.contenedores} contenedores</span>
              <span className={styles.sep}>•</span>
              <span className={styles.dim}>+{nomina.plus.toFixed ? nomina.plus.toFixed(2) : nomina.plus} €</span>
              <span className={styles.sep}>•</span>
              <span className={styles.dim}>{nomina.dias} días trabajados</span>
            </div>

            <button className={styles.btnPrimary} onClick={() => openFirst(ROUTES.nomina)}>
              Abrir calculadora
            </button>
          </section>

          {/* Widget Vacaciones */}
          <section className={`${styles.card} ${styles.widget}`}>
            <div className={styles.widgetHeader}>
              <h3 className={styles.cardTitle}>Vacaciones</h3>
            </div>

            <div className={styles.vacBox}>
              <div className={styles.donut} aria-label="días disponibles">
                <svg viewBox="0 0 80 80">
                  <circle className={styles.donutBg} cx="40" cy="40" r="36" />
                  <circle
                    className={styles.donutProg}
                    cx="40" cy="40" r="36"
                    style={{ strokeDasharray: `${CIRC * vacPct} ${CIRC}` }}
                  />
                </svg>
                <div className={styles.donutLabel}>
                  <div className={styles.donutBig}>{vacDisp}</div>
                  <div className={styles.donutSmall}>días</div>
                </div>
              </div>

              <div className={styles.vacText}>
                <div><b>Te quedan {vacDisp}</b> de <b>{vacTot}</b> este año.</div>
                <div className={styles.dim}>Pendientes de aprobación: {vac.pendientes}</div>
              </div>
            </div>

            <button className={styles.btnPrimary} onClick={() => openFirst(ROUTES.vacaciones)}>
              Abrir vacaciones
            </button>
          </section>
        </div>

        {/* Modal editar */}
        {isEditOpen && editable && (
          <div className={styles.modalOverlay} onClick={()=>setIsEditOpen(false)}>
            <div className={styles.modal} onClick={(e)=>e.stopPropagation()}>
              <div className={styles.modalTop}>
                <h3>Editar perfil</h3>
                <button className={styles.iconClose} onClick={()=>setIsEditOpen(false)}><CloseIcon/></button>
              </div>

              <form className={styles.form} onSubmit={submitEdit}>
                <label>
                  <span>Nombre completo</span>
                  <input type="text" value={editable.nombre_completo || ''} onChange={(e)=>setEditable({...editable, nombre_completo:e.target.value})}/>
                </label>

                <div className={styles.formTwo}>
                  <label>
                    <span>Caducidad CAP</span>
                    <input type="date" value={editable.cap_expirare || ''} onChange={(e)=>setEditable({...editable, cap_expirare:e.target.value})}/>
                  </label>
                  <label>
                    <span>Caducidad Carnet</span>
                    <input type="date" value={editable.carnet_caducidad || ''} onChange={(e)=>setEditable({...editable, carnet_caducidad:e.target.value})}/>
                  </label>
                </div>

                <div className={styles.formTwo}>
                  <label>
                    <span>¿Tiene ADR?</span>
                    <select value={editable.tiene_adr ? 'true' : 'false'} onChange={(e)=>setEditable({...editable, tiene_adr:e.target.value==='true'})}>
                      <option value="false">No</option>
                      <option value="true">Sí</option>
                    </select>
                  </label>
                  {editable.tiene_adr && (
                    <label>
                      <span>Caducidad ADR</span>
                      <input type="date" value={editable.adr_caducidad || ''} onChange={(e)=>setEditable({...editable, adr_caducidad:e.target.value})}/>
                    </label>
                  )}
                </div>

                {!authProfile.camion_id ? (
                  <label>
                    <span>Matrícula Camión (crear)</span>
                    <input type="text" placeholder="1710KKY" value={editable.new_camion_matricula} onChange={(e)=>setEditable({...editable, new_camion_matricula:e.target.value.toUpperCase()})}/>
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
                    <input type="text" placeholder="R0000ABC" value={editable.new_remorca_matricula} onChange={(e)=>setEditable({...editable, new_remorca_matricula:e.target.value.toUpperCase()})}/>
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
    </Layout>
  );
}
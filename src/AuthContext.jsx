// src/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';
import FeedbackModal from './components/modales/FeedbackModal';

const MS_PER_DAY = 86400000;

/* ================= Utils pentru alarme (nemodificate) ================= */
const calculateExpirations = (profiles = [], camioane = [], remorci = []) => {
  const alarms = [];
  const today = new Date(); today.setHours(0,0,0,0);
  const plus30 = new Date(today); plus30.setDate(today.getDate() + 30);

  const pushDate = (iso, owner, doc) => {
    if (!iso) return;
    const d = new Date(iso);
    if (d < today) {
      const days = Math.floor((today - d) / MS_PER_DAY);
      alarms.push({ type: 'expirare', message: `El ${doc} pentru ${owner} a expirat de ${days} zile.`, days: -days, expired: true });
    } else if (d <= plus30) {
      const days = Math.ceil((d - today) / MS_PER_DAY);
      alarms.push({ type: 'expirare', message: `El ${doc} pentru ${owner} expiră în ${days} zile.`, days, expired: false });
    }
  };

  profiles.forEach(p => {
    if (p.role === 'sofer') {
      pushDate(p.cap_expirare, p.nombre_completo, 'Certificado CAP');
      pushDate(p.carnet_caducidad, p.nombre_completo, 'Permis de Conducere');
      if (p.tiene_adr) pushDate(p.adr_caducidad, p.nombre_completo, 'Certificado ADR');
    }
  });

  camioane.forEach(c => pushDate(c.fecha_itv, c.matricula, 'ITV al Camionului'));
  remorci.forEach(r => pushDate(r.fecha_itv, r.matricula, 'ITV al Remorcii'));

  return alarms.sort((a, b) => a.days - b.days);
};

const calculateMantenimientoAlarms = (camioane = [], mantenimientoAlerts = []) => {
  const alarms = [];
  const UMBRAL = 5000;

  mantenimientoAlerts.forEach(a => {
    const camion = camioane.find(c => c.id === a.camion_id);
    if (camion?.kilometros != null) {
      const diff = a.km_proximo_mantenimiento - camion.kilometros;
      if (diff <= UMBRAL) {
        const approx = Math.round(Math.abs(diff) / 100) * 100;
        const msg = diff > 0
          ? `Pentru camionul ${a.matricula}, mai sunt ~${approx} km până la următorul schimb de ulei.`
          : `Pentru camionul ${a.matricula}, schimbul de ulei este întârziat cu ~${approx} km.`;
        const daysEquivalent = Math.round(diff / 150);
        alarms.push({ type: 'mentenanta', message: msg, days: daysEquivalent, expired: diff <= 0 });
      }
    }
  });

  return alarms;
};
/* ======================================================================= */

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [firstName, setFirstName] = useState(null); // 👈 nou
  const [alarms, setAlarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  /** Ia sesiunea curentă și sincronizează user-ul. */
  const refreshSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);
    setUser(session?.user ?? null);
    return session;
  }, []);

  /** Încarcă profilul COMPLET + calculează alarmele */
  const fetchAndProcessData = useCallback(async () => {
    const current = await refreshSession();
    if (!current?.user) {
      setProfile(null);
      setFirstName(null); // resetăm și numele
      setAlarms([]);
      return;
    }

    try {
      const { data: baseProfile, error: profErr } = await supabase
        .from('profiles')
        .select('id, role, nombre_completo, email, camion_id, remorca_id, ultima_aparitie_feedback, cap_expirare, carnet_caducidad, tiene_adr, adr_caducidad, avatar_url')
        .eq('id', current.user.id)
        .maybeSingle();

      if (profErr) {
        console.warn('profiles select error:', profErr.message);
        setProfile(null);
        setFirstName(null);
        setAlarms([]);
        return;
      }
      if (!baseProfile) {
        setProfile(null);
        setFirstName(null);
        setAlarms([]);
        return;
      }

      // extragem doar primul prenume
      const first = baseProfile.nombre_completo?.trim().split(' ')[0] || null;
      setFirstName(first);

      // setăm profilul complet în context
      setProfile(baseProfile);

      // feedback modal
      if (baseProfile.ultima_aparitie_feedback !== undefined) {
        const last = baseProfile.ultima_aparitie_feedback;
        const should = !last || ((Date.now() - new Date(last).getTime()) / MS_PER_DAY) > 7;
        if (should) setIsFeedbackModalOpen(true);
      }

      // alarme
      let profilesToProcess = [];
      let camioaneToProcess = [];
      let remorciToProcess = [];
      let mantenimientoAlertsToProcess = [];

      if (['dispecer', 'admin'].includes(baseProfile.role)) {
        const { data: p } = await supabase
          .from('profiles')
          .select('id, role, nombre_completo, cap_expirare, carnet_caducidad, tiene_adr, adr_caducidad');
        profilesToProcess = p || [];

        const { data: cAll } = await supabase.from('camioane').select('id, matricula, fecha_itv, kilometros');
        camioaneToProcess = cAll || [];

        const { data: rAll } = await supabase.from('remorci').select('id, matricula, fecha_itv');
        remorciToProcess = rAll || [];

        const { data: mAll } = await supabase
          .from('mantenimiento_alertas')
          .select('*')
          .eq('activa', true);
        mantenimientoAlertsToProcess = mAll || [];
      } else if (baseProfile.role === 'sofer') {
        profilesToProcess = [{
          id: baseProfile.id,
          role: baseProfile.role,
          nombre_completo: baseProfile.nombre_completo,
          cap_expirare: baseProfile.cap_expirare,
          carnet_caducidad: baseProfile.carnet_caducidad,
          tiene_adr: baseProfile.tiene_adr,
          adr_caducidad: baseProfile.adr_caducidad
        }];
      }

      const expirationAlarms = calculateExpirations(profilesToProcess, camioaneToProcess, remorciToProcess);
      const mantenimientoAlarms = calculateMantenimientoAlarms(camioaneToProcess, mantenimientoAlertsToProcess);
      setAlarms([...expirationAlarms, ...mantenimientoAlarms].sort((a, b) => a.days - b.days));
    } catch (e) {
      console.error('Eroare la preluarea datelor:', e.message);
      setAlarms([]);
    }
  }, [refreshSession]);

  useEffect(() => {
    let intervalId;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setSessionReady(true);

      await fetchAndProcessData();
      setLoading(false);

      intervalId = setInterval(fetchAndProcessData, 300000);
    })();

    const { data: authSub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setSessionReady(true);
      setLoading(true);
      fetchAndProcessData().finally(() => setLoading(false));
    });

    return () => {
      if (intervalId) clearInterval(intervalId);
      authSub.subscription.unsubscribe();
    };
  }, [fetchAndProcessData]);

  /* -------------------- Actions expuse în context -------------------- */
  const addMantenimientoAlert = async (camionId, matricula, kmActual) => { /* ... la fel ... */ };
  const handleFeedbackClose = async () => { /* ... la fel ... */ };
  const handleFeedbackSubmit = async (feedbackText) => { /* ... la fel ... */ };

  const value = {
    session,
    sessionReady,
    user,
    profile,
    firstName,     // 👈 acum disponibil pentru salut
    alarms,
    loading,
    setLoading,
    setProfile,
    addMantenimientoAlert,
    isFeedbackModalOpen,
    handleFeedbackSubmit,
    handleFeedbackClose
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={handleFeedbackClose}
        onSubmit={handleFeedbackSubmit}
      />
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) throw new Error('useAuth trebuie folosit în interiorul unui AuthProvider');
  return ctx;
};
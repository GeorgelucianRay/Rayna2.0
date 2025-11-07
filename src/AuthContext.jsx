// src/AuthContext.jsx
import React, {
  createContext, useContext, useEffect, useState, useCallback, useRef,
} from 'react';
import { supabase } from './supabaseClient';
import FeedbackModal from './components/modales/FeedbackModal';

const MS_PER_DAY = 86400000;

/* ================= Utils pentru alarme (nemodificate) ================= */
const calculateExpirations = (profiles = [], camioane = [], remorci = []) => {
  const alarms = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
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
  const [session, setSession]       = useState(null);
  const [sessionReady, setSessionReady] = useState(false); // „hydrated”
  const [user, setUser]             = useState(null);
  const [profile, setProfile]       = useState(null);
  const [firstName, setFirstName]   = useState(null);
  const [alarms, setAlarms]         = useState([]);
  const [loading, setLoading]       = useState(true);

  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackSuppressed, setFeedbackSuppressed]   = useState(false);

  // gard împotriva fetch-urilor simultane
  const fetchLockRef = useRef(false);

  /** Ia sesiunea curentă și sincronizează user-ul (fără logout agresiv). */
  const refreshSession = useCallback(async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    setSession(s || null);
    setUser(s?.user ?? null);
    return s;
  }, []);

  /** Încarcă profil + alarme (debounced prin fetchLockRef). */
  const fetchAndProcessData = useCallback(async () => {
    if (fetchLockRef.current) return;
    fetchLockRef.current = true;
    try {
      const current = await refreshSession();
      if (!current?.user) {
        setProfile(null); setFirstName(null); setAlarms([]);
        return;
      }

      const { data: baseProfile, error: profErr } = await supabase
        .from('profiles')
        .select(`
          id, role, nombre_completo, email,
          cap_expirare, carnet_caducidad, tiene_adr, adr_caducidad,
          camion_id, remorca_id,
          ultima_aparitie_feedback, avatar_url,
          camioane:camion_id ( id, marca, matricula ),
          remorci:remorca_id ( id, matricula, tipo )
        `)
        .eq('id', current.user.id)
        .maybeSingle();

      if (profErr || !baseProfile) {
        if (profErr) console.warn('profiles select error:', profErr.message);
        setProfile(null); setFirstName(null); setAlarms([]);
        return;
      }

      setProfile(baseProfile);
      const first = baseProfile.nombre_completo?.trim().split(' ')[0] || null;
      setFirstName(first);

      // feedback (max o dată / 7 zile și nu reafișăm în sesiunea curentă dacă userul a închis)
      if (baseProfile.ultima_aparitie_feedback !== undefined && !feedbackSuppressed) {
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
        const { data: p }   = await supabase.from('profiles')
          .select('id, role, nombre_completo, cap_expirare, carnet_caducidad, tiene_adr, adr_caducidad');
        const { data: cAll } = await supabase.from('camioane')
          .select('id, matricula, fecha_itv, kilometros');
        const { data: rAll } = await supabase.from('remorci')
          .select('id, matricula, fecha_itv');
        const { data: mAll } = await supabase.from('mantenimiento_alertas')
          .select('*').eq('activa', true);

        profilesToProcess = p || [];
        camioaneToProcess = cAll || [];
        remorciToProcess  = rAll || [];
        mantenimientoAlertsToProcess = mAll || [];
      } else if (baseProfile.role === 'sofer') {
        profilesToProcess = [{
          id: baseProfile.id,
          role: baseProfile.role,
          nombre_completo: baseProfile.nombre_completo,
          cap_expirare: baseProfile.cap_expirare,
          carnet_caducidad: baseProfile.carnet_caducidad,
          tiene_adr: baseProfile.tiene_adr,
          adr_caducidad: baseProfile.adr_caducidad,
        }];
      }

      const expirationAlarms    = calculateExpirations(profilesToProcess, camioaneToProcess, remorciToProcess);
      const mantenimientoAlarms = calculateMantenimientoAlarms(camioaneToProcess, mantenimientoAlertsToProcess);
      setAlarms([...expirationAlarms, ...mantenimientoAlarms].sort((a, b) => a.days - b.days));
    } catch (e) {
      console.error('Eroare la preluarea datelor:', e.message);
      setAlarms([]);
    } finally {
      fetchLockRef.current = false;
    }
  }, [refreshSession, feedbackSuppressed]);

  /* ============== Inițializare & listeners (rezistent la iOS) ============== */
  useEffect(() => {
    let intervalId;
    let unsub = () => {};
    const watchdog = setTimeout(() => setSessionReady(true), 5000); // nu blocăm UI-ul dacă ceva întârzie

    (async () => {
      // 1) Hidratare din cache
      const { data: { session: s } } = await supabase.auth.getSession();
      setSession(s || null); setUser(s?.user ?? null);
      setSessionReady(true); clearTimeout(watchdog);

      // 2) Prima încărcare derivată
      setLoading(true);
      await fetchAndProcessData().catch(() => {}).finally(() => setLoading(false));

      // 3) Refresh derivat periodic (nu auth)
      intervalId = setInterval(fetchAndProcessData, 300000); // 5 min
    })();

    // 4) Ascultă toate evenimentele de auth (login/logout/token refresh)
    unsub = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s || null); setUser(s?.user ?? null); setSessionReady(true);
      setLoading(true);
      fetchAndProcessData().catch(() => {}).finally(() => setLoading(false));
    }).data.subscription.unsubscribe;

    // 5) iOS: reîmprospătare când aplicația revine în față
    const onVis = async () => {
      if (document.visibilityState === 'visible') {
        try { await supabase.auth.refreshSession(); } catch {}
        setLoading(true);
        fetchAndProcessData().catch(() => {}).finally(() => setLoading(false));
      }
    };
    document.addEventListener('visibilitychange', onVis);

    // 6) când revine online
    const onOnline = async () => {
      try { await supabase.auth.refreshSession(); } catch {}
      setLoading(true);
      fetchAndProcessData().catch(() => {}).finally(() => setLoading(false));
    };
    window.addEventListener('online', onOnline);

    return () => {
      if (intervalId) clearInterval(intervalId);
      try { unsub(); } catch {}
      clearTimeout(watchdog);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('online', onOnline);
    };
  }, [fetchAndProcessData]);

  /* -------------------- Actions expuse în context -------------------- */
  const addMantenimientoAlert = async (camionId, matricula, kmActual) => {
    if (!camionId || !matricula || !kmActual) return;
    try {
      await supabase.from('mantenimiento_alertas')
        .update({ activa: false })
        .eq('camion_id', camionId)
        .eq('activa', true);

      const kmProximo = kmActual + 80000;
      await supabase.from('mantenimiento_alertas').insert({
        camion_id: camionId,
        matricula,
        km_mantenimiento: kmActual,
        km_proximo_mantenimiento: kmProximo,
        activa: true,
      });

      await fetchAndProcessData();
    } catch (error) {
      console.error('Eroare la crearea alertei de mentenanță:', error);
      alert('A apărut o eroare la crearea alertei de mentenanță.');
    }
  };

  const handleFeedbackClose = async () => {
    setIsFeedbackModalOpen(false);
    setFeedbackSuppressed(true);
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (s?.user) {
        await supabase
          .from('profiles')
          .update({ ultima_aparitie_feedback: new Date().toISOString() })
          .eq('id', s.user.id);
      }
    } catch (e) {
      console.warn('Nu am putut salva timestamp-ul de feedback:', e.message);
    }
  };

  const handleFeedbackSubmit = async (feedbackText) => {
    const { data: { session: s } } = await supabase.auth.getSession();
    if (!s?.user || !feedbackText) return;
    try {
      const { error } = await supabase.from('feedback_utilizatori').insert({
        user_id: s.user.id,
        email: profile?.email ?? null,
        continut: feedbackText,
        origen: 'modal',
        categoria: 'sugerencia',
        severidad: 'baja',
        contexto: { ruta: window.location?.pathname || null },
      });
      if (error) {
        console.error('Insert feedback_utilizatori:', error);
        alert(`De momento no se ha podido guardar el feedback-ul: ${error.message}`);
        return;
      }
    } finally {
      await handleFeedbackClose();
      alert('Muchas Gracias por tu contribución!');
    }
  };

  const value = {
    session,
    sessionReady,           // ⬅ păstrăm API-ul tău existent
    user,
    profile,
    firstName,
    alarms,
    loading,
    setLoading,
    setProfile,
    addMantenimientoAlert,
    isFeedbackModalOpen,
    handleFeedbackSubmit,
    handleFeedbackClose,
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
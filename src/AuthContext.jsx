// src/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';
import FeedbackModal from './components/modales/FeedbackModal';

/* --------- Utils existente pentru alarme (păstrează-le dacă le ai deja) --------- */
const MS_PER_DAY = 86400000;

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
/* ------------------------------------------------------------------------------- */

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [alarms, setAlarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  /**
   * Ia sesiunea curentă și sincronizează user-ul.
   */
  const refreshSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);
    setUser(session?.user ?? null);
    return session;
  }, []);

  /**
   * Încarcă profilul și alarmele pe baza rolului.
   * Este safe să fie apelată oricând — va verifica sesiunea actuală intern.
   */
  const fetchAndProcessData = useCallback(async () => {
    const current = await refreshSession();
    if (!current?.user) {
      setProfile(null);
      setAlarms([]);
      return;
    }

    try {
      // 1) profil minim
      let userProfileMin = null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, role, nombre_completo, email, camion_id, remorca_id, ultima_aparitie_feedback')
        .eq('id', current.user.id)
        .maybeSingle();
      if (!error) userProfileMin = data ?? null;
      else console.warn('profiles select error:', error.message);

      setProfile(userProfileMin);

      // feedback modal: o dată / 7 zile
      if (userProfileMin?.ultima_aparitie_feedback !== undefined) {
        const last = userProfileMin.ultima_aparitie_feedback;
        const should = !last || ((Date.now() - new Date(last).getTime()) / MS_PER_DAY) > 7;
        if (should) setIsFeedbackModalOpen(true);
      }

      // 2) date pentru alarme
      let profilesToProcess = [];
      let camioaneToProcess = [];
      let remorciToProcess = [];
      let mantenimientoAlertsToProcess = [];

      if (['dispecer', 'admin'].includes(userProfileMin?.role)) {
        const { data: p } = await supabase
          .from('profiles')
          .select('id, role, nombre_completo, cap_expirare, carnet_caducidad, tiene_adr, adr_caducidad');
        profilesToProcess = p || [];

        const { data: c } = await supabase.from('camioane').select('*');
        camioaneToProcess = c || [];

        const { data: r } = await supabase.from('remorci').select('*');
        remorciToProcess = r || [];

        const { data: m } = await supabase
          .from('mantenimiento_alertas')
          .select('*')
          .eq('activa', true);
        mantenimientoAlertsToProcess = m || [];
      } else if (userProfileMin?.role === 'sofer') {
        const { data: self } = await supabase
          .from('profiles')
          .select('id, role, nombre_completo, cap_expirare, carnet_caducidad, tiene_adr, adr_caducidad, camion_id, remorca_id')
          .eq('id', userProfileMin.id)
          .maybeSingle();
        profilesToProcess = self ? [self] : [];

        if (self?.camion_id) {
          const { data: c } = await supabase.from('camioane').select('*').eq('id', self.camion_id).maybeSingle();
          if (c) camioaneToProcess = [c];
          if (c?.id) {
            const { data: m } = await supabase
              .from('mantenimiento_alertas')
              .select('*')
              .eq('activa', true)
              .eq('camion_id', c.id);
            mantenimientoAlertsToProcess = m || [];
          }
        }
        if (self?.remorca_id) {
          const { data: r } = await supabase.from('remorci').select('*').eq('id', self.remorca_id).maybeSingle();
          if (r) remorciToProcess = [r];
        }
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
      // restaurare inițială
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setSessionReady(true);

      await fetchAndProcessData();
      setLoading(false);

      // refresh periodic (5 min) — se bazează pe sesiunea curentă
      intervalId = setInterval(fetchAndProcessData, 300000);
    })();

    // subscribe la schimbări de auth (login/logout/token refresh)
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
  const addMantenimientoAlert = async (camionId, matricula, kmActual) => {
    if (!camionId || !matricula || !kmActual) return;
    try {
      await supabase.from('mantenimiento_alertas').update({ activa: false }).eq('camion_id', camionId).eq('activa', true);
      const kmProximo = kmActual + 80000;
      await supabase.from('mantenimiento_alertas').insert({
        camion_id: camionId,
        matricula,
        km_mantenimiento: kmActual,
        km_proximo_mantenimiento: kmProximo,
        activa: true
      });
      await fetchAndProcessData();
    } catch (error) {
      console.error('Eroare la crearea alertei de mentenanță:', error);
      alert('A apărut o eroare la crearea alertei de mentenanță.');
    }
  };

  const handleFeedbackClose = async () => {
    setIsFeedbackModalOpen(false);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase.from('profiles').update({ ultima_aparitie_feedback: new Date().toISOString() }).eq('id', session.user.id);
    }
  };

  const handleFeedbackSubmit = async (feedbackText) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user || !feedbackText) return;
    await supabase.from('feedback_utilizatori').insert({ user_id: session.user.id, continut: feedbackText });
    await handleFeedbackClose();
    alert('Mulțumim pentru sugestie!');
  };

  const value = {
    session,          // <— IMPORTANT
    sessionReady,     // <— IMPORTANT
    user,
    profile,
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
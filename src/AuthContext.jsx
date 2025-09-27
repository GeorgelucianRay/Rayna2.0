import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from './supabaseClient';
import FeedbackModal from './components/modales/FeedbackModal';

const AuthContext = createContext(null);

// --- Expirări ---
const calculateExpirations = (profiles = [], camioane = [], remorci = []) => {
  const alarms = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(today.getDate() + 30);

  const checkDate = (dateString, ownerName, docType) => {
    if (!dateString) return;
    const docDate = new Date(dateString);
    if (docDate < today) {
      const daysAgo = Math.floor((today - docDate) / 86400000);
      alarms.push({ type: 'expirare', message: `El ${docType} pentru ${ownerName} a expirat de ${daysAgo} zile.`, days: -daysAgo, expired: true });
    } else if (docDate <= thirtyDaysFromNow) {
      const daysLeft = Math.ceil((docDate - today) / 86400000);
      alarms.push({ type: 'expirare', message: `El ${docType} pentru ${ownerName} expiră în ${daysLeft} zile.`, days: daysLeft, expired: false });
    }
  };

  profiles.forEach(d => {
    if (d.role === 'sofer') {
      checkDate(d.cap_expirare, d.nombre_completo, 'Certificado CAP');
      checkDate(d.carnet_caducidad, d.nombre_completo, 'Permis de Conducere');
      if (d.tiene_adr) checkDate(d.adr_caducidad, d.nombre_completo, 'Certificado ADR');
    }
  });

  camioane.forEach(c => checkDate(c.fecha_itv, c.matricula, 'ITV al Camionului'));
  remorci.forEach(r => checkDate(r.fecha_itv, r.matricula, 'ITV al Remorcii'));

  return alarms.sort((a, b) => a.days - b.days);
};

// --- Mentenanță ---
const calculateMantenimientoAlarms = (camioane, mantenimientoAlerts) => {
  const alarms = [];
  if (!camioane || !mantenimientoAlerts) return alarms;
  const umbralKm = 5000;

  mantenimientoAlerts.forEach(a => {
    const camion = camioane.find(c => c.id === a.camion_id);
    if (camion?.kilometros != null) {
      const kmRestantes = a.km_proximo_mantenimiento - camion.kilometros;
      if (kmRestantes <= umbralKm) {
        const approx = Math.round(Math.abs(kmRestantes) / 100) * 100;
        const msg = kmRestantes > 0
          ? `Pentru camionul ${a.matricula}, mai sunt ~${approx} km până la următorul schimb de ulei.`
          : `Pentru camionul ${a.matricula}, schimbul de ulei este întârziat cu ~${approx} km.`;
        const daysEquivalent = Math.round(kmRestantes / 150);
        alarms.push({ type: 'mentenanta', message: msg, days: daysEquivalent, expired: kmRestantes <= 0 });
      }
    }
  });
  return alarms;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [alarms, setAlarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  const fetchAndProcessData = useCallback(async (currentSession) => {
    if (!currentSession?.user) {
      setUser(null);
      setProfile(null);
      setAlarms([]);
      return;
    }
    setUser(currentSession.user);

    try {
      // 1) PROFIL MINIM – NU aruncăm dacă nu vine (RLS)
      let userProfileMin = null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, role, nombre_completo, email, camion_id, remorca_id, ultima_aparitie_feedback')
        .eq('id', currentSession.user.id)
        .maybeSingle();

      if (error) {
        console.warn('profiles select error:', error.message);
      } else {
        userProfileMin = data || null;
      }

      setProfile(userProfileMin); // poate fi null dacă RLS blochează

      // Feedback modal (doar dacă avem profil)
      if (userProfileMin?.ultima_aparitie_feedback !== undefined) {
        const last = userProfileMin.ultima_aparitie_feedback;
        const should = !last || ((new Date() - new Date(last)) / 86400000) > 7;
        if (should) setIsFeedbackModalOpen(true);
      }

      // 2) Date pentru alarme (NU stricăm nimic dacă RLS blochează)
      let profilesToProcess = [];
      let camioaneToProcess = [];
      let remorciToProcess = [];
      let mantenimientoAlertsToProcess = [];

      if (['dispecer', 'admin'].includes(userProfileMin?.role)) {
        try {
          const { data: p } = await supabase
            .from('profiles')
            .select('id, role, nombre_completo, cap_expirare, carnet_caducidad, tiene_adr, adr_caducidad');
          profilesToProcess = p || [];
        } catch {}

        try {
          const { data: c } = await supabase.from('camioane').select('*');
          camioaneToProcess = c || [];
        } catch {}

        try {
          const { data: r } = await supabase.from('remorci').select('*');
          remorciToProcess = r || [];
        } catch {}

        try {
          const { data: m } = await supabase
            .from('mantenimiento_alertas')
            .select('*')
            .eq('activa', true);
          mantenimientoAlertsToProcess = m || [];
        } catch {}
      } else if (userProfileMin?.role === 'sofer') {
        // profilul complet pentru expirări
        try {
          const { data: self } = await supabase
            .from('profiles')
            .select('id, role, nombre_completo, cap_expirare, carnet_caducidad, tiene_adr, adr_caducidad, camion_id, remorca_id')
            .eq('id', userProfileMin.id)
            .maybeSingle();
          profilesToProcess = self ? [self] : [];
          // camionul lui
          if (self?.camion_id) {
            try {
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
            } catch {}
          }
          // remorca lui
          if (self?.remorca_id) {
            try {
              const { data: r } = await supabase.from('remorci').select('*').eq('id', self.remorca_id).maybeSingle();
              if (r) remorciToProcess = [r];
            } catch {}
          }
        } catch {}
      }

      const expirationAlarms = calculateExpirations(profilesToProcess, camioaneToProcess, remorciToProcess);
      const mantenimientoAlarms = calculateMantenimientoAlarms(camioaneToProcess, mantenimientoAlertsToProcess);
      setAlarms([...expirationAlarms, ...mantenimientoAlarms].sort((a, b) => a.days - b.days));
    } catch (e) {
      console.error('Eroare la preluarea datelor:', e.message);
      setAlarms([]);
      // NU resetăm profile aici, ca navbar-ul să rămână cu ce avem
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    let intervalId = null;

    const initialize = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      await fetchAndProcessData(session);
      setLoading(false);

      if (session) {
        intervalId = setInterval(() => {
          fetchAndProcessData(session);
        }, 300000);
      }
    };

    initialize();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (intervalId) clearInterval(intervalId);
      setLoading(true);
      fetchAndProcessData(session).finally(() => setLoading(false));
    });

    return () => {
      if (intervalId) clearInterval(intervalId);
      authListener.subscription.unsubscribe();
    };
  }, [fetchAndProcessData]);

  const addMantenimientoAlert = async (camionId, matricula, kmActual) => {
    if (!camionId || !matricula || !kmActual) {
      console.error('Lipsesc date pentru a crea alerta de mentenanță.');
      return;
    }
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
      const { data: { session } } = await supabase.auth.getSession();
      fetchAndProcessData(session);
    } catch (error) {
      console.error('Eroare la crearea alertei de mentenanță:', error);
      alert('A apărut o eroare la crearea alertei de mentenanță.');
    }
  };

  const handleFeedbackClose = async () => {
    setIsFeedbackModalOpen(false);
    if (user) {
      await supabase.from('profiles').update({ ultima_aparitie_feedback: new Date().toISOString() }).eq('id', user.id);
    }
  };

  const handleFeedbackSubmit = async (feedbackText) => {
    if (!user || !feedbackText) return;
    await supabase.from('feedback_utilizatori').insert({ user_id: user.id, continut: feedbackText });
    await handleFeedbackClose();
    alert('Mulțumim pentru sugestie!');
  };

  const value = {
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
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth trebuie folosit în interiorul unui AuthProvider');
  return context;
};
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from './supabaseClient';
import FeedbackModal from './components/modales/FeedbackModal';

const AuthContext = createContext(null);

// --- Funcția pentru alarme expirări ---
const calculateExpirations = (profiles = [], camioane = [], remorci = []) => {
  const alarms = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(today.getDate() + 30);

  const checkDate = (dateString, ownerName, docType) => {
    if (!dateString) return;
    const docDate = new Date(dateString);

    if (docDate < today) {
      const daysAgo = Math.floor((today - docDate) / (1000 * 60 * 60 * 24));
      alarms.push({
        type: 'expirare',
        message: `El ${docType} pentru ${ownerName} a expirat de ${daysAgo} zile.`,
        days: -daysAgo,
        expired: true
      });
    } else if (docDate <= thirtyDaysFromNow) {
      const daysLeft = Math.ceil((docDate - today) / (1000 * 60 * 60 * 24));
      alarms.push({
        type: 'expirare',
        message: `El ${docType} pentru ${ownerName} expiră în ${daysLeft} zile.`,
        days: daysLeft,
        expired: false
      });
    }
  };

  profiles.forEach(driver => {
    if (driver.role === 'sofer') {
      checkDate(driver.cap_expirare, driver.nombre_completo, 'Certificado CAP');
      checkDate(driver.carnet_caducidad, driver.nombre_completo, 'Permis de Conducere');
      if (driver.tiene_adr) {
        checkDate(driver.adr_caducidad, driver.nombre_completo, 'Certificado ADR');
      }
    }
  });

  camioane.forEach(camion => {
    checkDate(camion.fecha_itv, camion.matricula, 'ITV al Camionului');
  });

  remorci.forEach(remorca => {
    checkDate(remorca.fecha_itv, remorca.matricula, 'ITV al Remorcii');
  });

  return alarms.sort((a, b) => a.days - b.days);
};

// --- Funcția pentru alarme mentenanță ---
const calculateMantenimientoAlarms = (camioane, mantenimientoAlerts) => {
  const alarms = [];
  if (!camioane || !mantenimientoAlerts) return alarms;

  const umbralKm = 5000; // prag 5000km

  mantenimientoAlerts.forEach(alerta => {
    const camion = camioane.find(c => c.id === alerta.camion_id);
    if (camion && camion.kilometros) {
      const kmRestantes = alerta.km_proximo_mantenimiento - camion.kilometros;

      if (kmRestantes <= umbralKm) {
        const message =
          kmRestantes > 0
            ? `Pentru camionul ${alerta.matricula}, mai sunt ~${Math.round(kmRestantes / 100) * 100} km până la următorul schimb de ulei.`
            : `Pentru camionul ${alerta.matricula}, schimbul de ulei este întârziat cu ~${Math.abs(Math.round(kmRestantes / 100) * 100)} km.`;

        const daysEquivalent = Math.round(kmRestantes / 150);
        alarms.push({
          type: 'mentenanta',
          message,
          days: daysEquivalent,
          expired: kmRestantes <= 0
        });
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
      setProfile(null);
      setAlarms([]);
      setUser(null);
      return;
    }
    setUser(currentSession.user);

    try {
      // 1) PROFIL MINIMAL (sigur pentru navbar)
      const { data: userProfileMin, error: profileMinErr } = await supabase
        .from('profiles')
        .select('id, role, nombre_completo, email, camion_id, remorca_id, ultima_aparitie_feedback')
        .eq('id', currentSession.user.id)
        .maybeSingle();

      if (profileMinErr) throw profileMinErr;
      setProfile(userProfileMin);

      // Pop-up feedback dacă a trecut o săptămână
      if (userProfileMin) {
        const lastPromptDate = userProfileMin.ultima_aparitie_feedback;
        let shouldShowPrompt = false;
        if (!lastPromptDate) {
          shouldShowPrompt = true;
        } else {
          const daysSince = (new Date() - new Date(lastPromptDate)) / (1000 * 60 * 60 * 24);
          if (daysSince > 7) shouldShowPrompt = true;
        }
        if (shouldShowPrompt) setIsFeedbackModalOpen(true);
      }

      // Arrays pentru calcule
      let profilesToProcess = [];
      let camioaneToProcess = [];
      let remorciToProcess = [];
      let mantenimientoAlertsToProcess = [];

      // 2) ADMIN & DISPECER — vizibilitate globală
      if (['dispecer', 'admin'].includes(userProfileMin?.role)) {
        // Profile doar cu câmpurile necesare pentru expirări
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('id, role, nombre_completo, cap_expirare, carnet_caducidad, tiene_adr, adr_caducidad');

        const { data: allCamioane } = await supabase.from('camioane').select('*');
        const { data: allRemorci } = await supabase.from('remorci').select('*');
        const { data: allMantenimiento } = await supabase
          .from('mantenimiento_alertas')
          .select('*')
          .eq('activa', true);

        profilesToProcess = allProfiles || [];
        camioaneToProcess = allCamioane || [];
        remorciToProcess = allRemorci || [];
        mantenimientoAlertsToProcess = allMantenimiento || [];
      }

      // 3) SOFER — doar resursele proprii
      else if (userProfileMin?.role === 'sofer') {
        // Profilul complet al șoferului (pentru expirări)
        const { data: selfProfile } = await supabase
          .from('profiles')
          .select('id, role, nombre_completo, cap_expirare, carnet_caducidad, tiene_adr, adr_caducidad, camion_id, remorca_id')
          .eq('id', userProfileMin.id)
          .maybeSingle();

        profilesToProcess = selfProfile ? [selfProfile] : [];

        // Camionul asignat (dacă există)
        if (selfProfile?.camion_id) {
          const { data: selfCamion } = await supabase
            .from('camioane')
            .select('*')
            .eq('id', selfProfile.camion_id)
            .maybeSingle();
          if (selfCamion) camioaneToProcess = [selfCamion];

          // Alarme mentenanță doar pentru camionul propriu
          if (selfCamion?.id) {
            const { data: soferMantenimiento } = await supabase
              .from('mantenimiento_alertas')
              .select('*')
              .eq('activa', true)
              .eq('camion_id', selfCamion.id);
            mantenimientoAlertsToProcess = soferMantenimiento || [];
          }
        }

        // Remorca asignată (dacă există)
        if (selfProfile?.remorca_id) {
          const { data: selfRemorca } = await supabase
            .from('remorci')
            .select('*')
            .eq('id', selfProfile.remorca_id)
            .maybeSingle();
          if (selfRemorca) remorciToProcess = [selfRemorca];
        }
      }

      // 4) Calcul alarme
      const expirationAlarms = calculateExpirations(profilesToProcess, camioaneToProcess, remorciToProcess);
      const mantenimientoAlarms = calculateMantenimientoAlarms(camioaneToProcess, mantenimientoAlertsToProcess);
      const combinedAlarms = [...expirationAlarms, ...mantenimientoAlarms].sort((a, b) => a.days - b.days);
      setAlarms(combinedAlarms);
    } catch (error) {
      console.error('Eroare la preluarea datelor:', error.message);
      // Important: păstrăm profilul minim deja setat, ca navbar-ul să meargă
      setAlarms([]);
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
        }, 300000); // 5 minute
      }
    };

    initialize();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      if (intervalId) clearInterval(intervalId);
      setLoading(true);
      initialize();
    });

    return () => {
      if (intervalId) clearInterval(intervalId);
      authListener.subscription.unsubscribe();
    };
  }, [fetchAndProcessData]);

  const addMantenimientoAlert = async (camionId, matricula, kmActual) => {
    if (!camionId || !matricula || !kmActual) {
      return console.error('Lipsesc date pentru a crea alerta de mentenanță.');
    }

    try {
      const { error: updateError } = await supabase
        .from('mantenimiento_alertas')
        .update({ activa: false })
        .eq('camion_id', camionId)
        .eq('activa', true);
      if (updateError) throw updateError;

      const kmProximo = kmActual + 80000;
      const newAlertData = {
        camion_id: camionId,
        matricula,
        km_mantenimiento: kmActual,
        km_proximo_mantenimiento: kmProximo,
        activa: true
      };

      const { error: insertError } = await supabase.from('mantenimiento_alertas').insert(newAlertData);
      if (insertError) throw insertError;

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
      await supabase
        .from('profiles')
        .update({ ultima_aparitie_feedback: new Date().toISOString() })
        .eq('id', user.id);
    }
  };

  const handleFeedbackSubmit = async (feedbackText) => {
    if (!user || !feedbackText) return;

    await supabase.from('feedback_utilizatori').insert({
      user_id: user.id,
      continut: feedbackText
    });

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
  if (context === undefined) {
    throw new Error('useAuth trebuie folosit în interiorul unui AuthProvider');
  }
  return context;
};
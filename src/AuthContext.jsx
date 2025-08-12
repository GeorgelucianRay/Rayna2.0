import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from './supabaseClient'; // Asigură-te că importul este corect

const AuthContext = createContext(null);

// --- Funcția existentă pentru alarmele de expirare (NESCHIMBATĂ) ---
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
            alarms.push({ type: 'expirare', message: `El ${docType} pentru ${ownerName} a expirat de ${daysAgo} zile.`, days: -daysAgo, expired: true });
        } 
        else if (docDate <= thirtyDaysFromNow) {
            const daysLeft = Math.ceil((docDate - today) / (1000 * 60 * 60 * 24));
            alarms.push({ type: 'expirare', message: `El ${docType} pentru ${ownerName} expiră în ${daysLeft} zile.`, days: daysLeft, expired: false });
        }
    };

    profiles.forEach(driver => {
        if(driver.role === 'sofer') {
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

// --- FUNCȚIE NOUĂ: Pentru calculul alarmelor de mentenanță ---
const calculateMantenimientoAlarms = (camioane, mantenimientoAlerts) => {
    const alarms = [];
    if (!camioane || !mantenimientoAlerts) return alarms;

    const umbralKm = 5000; // Pragul de la care afișăm alerta (5.000 km)

    mantenimientoAlerts.forEach(alerta => {
        const camion = camioane.find(c => c.id === alerta.camion_id);
        if (camion && camion.kilometros) {
            const kmRestantes = alerta.km_proximo_mantenimiento - camion.kilometros;

            if (kmRestantes <= umbralKm) {
                const message = kmRestantes > 0 
                    ? `Pentru camionul ${alerta.matricula}, mai sunt ~${Math.round(kmRestantes / 100) * 100} km până la următorul schimb de ulei.`
                    : `Pentru camionul ${alerta.matricula}, schimbul de ulei este întârziat cu ~${Math.abs(Math.round(kmRestantes / 100) * 100)} km.`;
                
                // Folosim 'days' ca o cheie de sortare comună. Convertim km în 'zile' estimative.
                const daysEquivalent = Math.round(kmRestantes / 150); // Presupunem o medie de 150km/zi pentru sortare

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

    // MODIFICARE: Am mutat logica de fetch într-o funcție `useCallback` pentru a o putea refolosi în `setInterval`.
    const fetchAndProcessData = useCallback(async (currentSession) => {
        if (!currentSession?.user) {
            setProfile(null);
            setAlarms([]);
            setUser(null);
            return; // Oprim execuția dacă nu există sesiune
        }

        setUser(currentSession.user);

        try {
            // Pas 1: Preluăm profilul utilizatorului curent
            const { data: userProfile, error: profileError } = await supabase
                .from('profiles')
                .select('*, camioane:camion_id(*), remorci:remorca_id(*)')
                .eq('id', currentSession.user.id)
                .maybeSingle();

            if (profileError) throw profileError;
            setProfile(userProfile);

            // Pas 2: Inițializăm listele de date și alarme
            let profilesToProcess = [];
            let camioaneToProcess = [];
            let remorciToProcess = [];
            let mantenimientoAlertsToProcess = [];

            // Pas 3: Preluăm datele în funcție de rol
            if (userProfile?.role === 'dispecer') {
                const { data: allProfiles } = await supabase.from('profiles').select('*');
                const { data: allCamioane } = await supabase.from('camioane').select('*');
                const { data: allRemorci } = await supabase.from('remorci').select('*');
                const { data: allMantenimiento } = await supabase.from('mantenimiento_alertas').select('*').eq('activa', true);
                
                profilesToProcess = allProfiles;
                camioaneToProcess = allCamioane;
                remorciToProcess = allRemorci;
                mantenimientoAlertsToProcess = allMantenimiento;

            } else if (userProfile?.role === 'sofer') {
                profilesToProcess = [userProfile];
                camioaneToProcess = userProfile.camioane ? [userProfile.camioane].flat() : [];
                remorciToProcess = userProfile.remorci ? [userProfile.remorci].flat() : [];
                
                if (camioaneToProcess.length > 0) {
                    const camionIds = camioaneToProcess.map(c => c.id);
                    const { data: soferMantenimiento } = await supabase.from('mantenimiento_alertas').select('*').eq('activa', true).in('camion_id', camionIds);
                    mantenimientoAlertsToProcess = soferMantenimiento;
                }
            }

            // Pas 4: Calculăm ambele tipuri de alarme
            const expirationAlarms = calculateExpirations(profilesToProcess, camioaneToProcess, remorciToProcess);
            const mantenimientoAlarms = calculateMantenimientoAlarms(camioaneToProcess, mantenimientoAlertsToProcess);

            // Pas 5: Combinăm și sortăm alarmele
            const combinedAlarms = [...expirationAlarms, ...mantenimientoAlarms].sort((a, b) => a.days - b.days);
            setAlarms(combinedAlarms);

        } catch (error) {
            console.error("Eroare la preluarea datelor:", error.message);
            setProfile(null);
            setAlarms([]);
        }
    }, []); // useCallback fără dependențe, deoarece primește sesiunea ca argument

    // MODIFICARE: Am refăcut useEffect pentru a include setInterval
    useEffect(() => {
        setLoading(true);
        let intervalId = null;

        // Funcția care pornește totul
        const initialize = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            await fetchAndProcessData(session); // Rulăm o dată la început
            setLoading(false);

            // Pornim un interval care să verifice datele la fiecare 5 minute
            if (session) {
                intervalId = setInterval(() => {
                    console.log("Verificare periodică a alarmelor...");
                    fetchAndProcessData(session);
                }, 300000); // 300000 ms = 5 minute
            }
        };

        initialize();

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            // La login/logout, oprim intervalul vechi și repornim procesul
            if (intervalId) clearInterval(intervalId);
            setLoading(true);
            initialize();
        });

        // Curățăm intervalul la demontarea componentei
        return () => {
            if (intervalId) clearInterval(intervalId);
            authListener.subscription.unsubscribe();
        };
    }, [fetchAndProcessData]); // Adăugăm fetchAndProcessData ca dependență


    // --- FUNCȚIE NOUĂ: Pentru a adăuga/actualiza o alertă de mentenanță ---
    const addMantenimientoAlert = async (camionId, matricula, kmActual) => {
        if (!camionId || !matricula || !kmActual) {
            return console.error("Lipsesc date pentru a crea alerta de mentenanță.");
        }
        
        try {
            // Pas 1: Dezactivăm orice alertă veche pentru acest camion
            const { error: updateError } = await supabase
                .from('mantenimiento_alertas')
                .update({ activa: false })
                .eq('camion_id', camionId)
                .eq('activa', true);

            if (updateError) throw updateError;

            // Pas 2: Creăm noua alertă cu ținta calculată
            const kmProximo = kmActual + 80000;
            const newAlertData = {
                camion_id: camionId,
                matricula: matricula,
                km_mantenimiento: kmActual,
                km_proximo_mantenimiento: kmProximo,
                activa: true
            };
            
            const { error: insertError } = await supabase.from('mantenimiento_alertas').insert(newAlertData);
            if (insertError) throw insertError;

            console.log(`Alerta de mentenanță pentru ${matricula} a fost creată/actualizată cu succes. Următorul schimb la ${kmProximo} km.`);
            
            // Reîmprospătăm manual alarmele pentru a reflecta schimbarea instantaneu
            const { data: { session } } = await supabase.auth.getSession();
            fetchAndProcessData(session);

        } catch (error) {
            console.error("Eroare la crearea alertei de mentenanță:", error);
            alert("A apărut o eroare la crearea alertei de mentenanță.");
        }
    };

    // MODIFICARE: Adăugăm noua funcție la valoarea contextului
    const value = { user, profile, alarms, loading, setLoading, setProfile, addMantenimientoAlert };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth trebuie folosit în interiorul unui AuthProvider");
    }
    return context;
};

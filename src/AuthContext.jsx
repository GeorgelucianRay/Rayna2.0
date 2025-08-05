import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from './supabaseClient'; // Asigură-te că importul este corect

const AuthContext = createContext(null);

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
            alarms.push({ message: `El ${docType} para ${ownerName} ha caducado hace ${daysAgo} días.`, days: -daysAgo, expired: true });
        } 
        else if (docDate <= thirtyDaysFromNow) {
            const daysLeft = Math.ceil((docDate - today) / (1000 * 60 * 60 * 24));
            alarms.push({ message: `El ${docType} para ${ownerName} caduca en ${daysLeft} días.`, days: daysLeft, expired: false });
        }
    };

    profiles.forEach(driver => {
        if(driver.role === 'sofer') {
            checkDate(driver.cap_expirare, driver.nombre_completo, 'Certificado CAP');
            checkDate(driver.carnet_caducidad, driver.nombre_completo, 'Permiso de Conducir');
            if (driver.tiene_adr) {
                checkDate(driver.adr_caducidad, driver.nombre_completo, 'Certificado ADR');
            }
        }
    });
    
    camioane.forEach(camion => {
        checkDate(camion.fecha_itv, camion.matricula, 'ITV del Camión');
    });
    
    remorci.forEach(remorca => {
        checkDate(remorca.fecha_itv, remorca.matricula, 'ITV del Remolque');
    });

    return alarms.sort((a, b) => a.days - b.days);
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [alarms, setAlarms] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAllData = async (session) => {
            setLoading(true);
            setUser(session?.user ?? null);

            if (session?.user) {
                try {
                    const { data: userProfile, error: profileError } = await supabase
                        .from('profiles')
                        .select('*, camioane:camion_id(*), remorci:remorca_id(*)')
                        .eq('id', session.user.id)
                        .maybeSingle();

                    if (profileError) throw profileError;
                    
                    setProfile(userProfile);

                    if (userProfile?.role === 'dispecer') {
                        const { data: allProfiles } = await supabase.from('profiles').select('*');
                        const { data: allCamioane } = await supabase.from('camioane').select('*');
                        const { data: allRemorci } = await supabase.from('remorci').select('*');
                        setAlarms(calculateExpirations(allProfiles, allCamioane, allRemorci));
                    } else if (userProfile?.role === 'sofer') {
                        const camioaneSofer = userProfile.camioane ? [userProfile.camioane].flat() : [];
                        const remorciSofer = userProfile.remorci ? [userProfile.remorci].flat() : [];
                        setAlarms(calculateExpirations([userProfile], camioaneSofer, remorciSofer));
                    } else {
                        setAlarms([]);
                    }

                } catch (error) {
                    console.error("Eroare la preluarea datelor de profil:", error.message);
                    setProfile(null);
                    setAlarms([]);
                }
            } else {
                setProfile(null);
                setAlarms([]);
            }
            setLoading(false);
        };

        supabase.auth.getSession().then(({ data: { session } }) => {
            fetchAllData(session);
        });

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            fetchAllData(session);
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const value = { user, profile, alarms, loading, setLoading, setProfile };

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

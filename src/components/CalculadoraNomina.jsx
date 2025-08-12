import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabaseClient';
import Layout from './Layout';
import styles from './CalculadoraNomina.module.css';

// --- Icoanele și Componentele Helper (rămân neschimbate) ---
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>;
const ArchiveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8v13H3V8"></path><path d="M1 3h22v5H1z"></path><path d="M10 12h4"></path></svg>;
const CalendarDay = ({ day, data, onClick, isPlaceholder }) => {
    const hasData = !isPlaceholder && (data.desayuno || data.cena || data.procena || (data.km_final && parseFloat(data.km_final) > 0) || (data.contenedores > 0) || (data.suma_festivo > 0));
    const dayClasses = `${styles.calendarDay} ${isPlaceholder ? styles.placeholderDay : ''} ${hasData ? styles.hasData : ''}`;
    return (<div className={dayClasses} onClick={!isPlaceholder ? onClick : undefined}><span className={styles.dayNumber}>{day}</span></div>);
};
const CustomNumberInput = ({ label, name, value, onDataChange, min = 0, step = 1 }) => {
    const handleIncrement = () => onDataChange(name, (value || 0) + step);
    const handleDecrement = () => { const newValue = (value || 0) - step; if (newValue >= min) onDataChange(name, newValue); };
    return ( <div className={styles.inputGroup}><label>{label}</label><div className={styles.customNumberInput}><button onClick={handleDecrement} className={styles.stepperButton}>-</button><input type="number" name={name} value={value} readOnly className={styles.numericDisplay} /><button onClick={handleIncrement} className={styles.stepperButton}>+</button></div></div>);
};
const ParteDiarioModal = ({ isOpen, onClose, data, onDataChange, onToggleChange, day, monthName, year }) => {
    if (!isOpen) return null;
    const handleKmChange = (e) => { const { name, value } = e.target; const newValue = value === '' ? '' : parseFloat(value); onDataChange(name, newValue); };
    return ( <div className={styles.modalOverlay}><div className={styles.modalContent}><div className={styles.modalHeader}><h3 className={styles.modalTitle}>Parte Diario - {day} {monthName} {year}</h3><button onClick={onClose} className={styles.closeButton}><CloseIcon /></button></div><div className={styles.modalBody}><div className={styles.parteDiarioSection}><h4>Dietas</h4><div className={styles.checkboxGroupModal}><div><input type="checkbox" id={`modal-desayuno-${day}`} checked={!!data.desayuno} onChange={() => onToggleChange('desayuno')} /><label htmlFor={`modal-desayuno-${day}`}>Desayuno</label></div><div><input type="checkbox" id={`modal-cena-${day}`} checked={!!data.cena} onChange={() => onToggleChange('cena')} /><label htmlFor={`modal-cena-${day}`}>Cena</label></div><div><input type="checkbox" id={`modal-procena-${day}`} checked={!!data.procena} onChange={() => onToggleChange('procena')} /><label htmlFor={`modal-procena-${day}`}>Procena</label></div></div></div><div className={styles.parteDiarioSection}><h4>Kilómetros</h4><div className={styles.inputGrid}><div className={styles.inputGroup}><label>KM Iniciar</label><input type="number" name="km_iniciar" value={data.km_iniciar || ''} onChange={handleKmChange} /></div><div className={styles.inputGroup}><label>KM Final</label><input type="number" name="km_final" value={data.km_final || ''} onChange={handleKmChange} /></div></div></div><div className={styles.parteDiarioSection}><h4>Actividades Especiales</h4><div className={styles.inputGrid}><CustomNumberInput label="Contenedores Barridos" name="contenedores" value={data.contenedores || 0} onDataChange={onDataChange} /><CustomNumberInput label="Suma Festivo/Plus (€)" name="suma_festivo" value={data.suma_festivo || 0} onDataChange={onDataChange} step={10} /></div></div></div><div className={styles.modalFooter}><button onClick={onClose} className={styles.saveButton}>Guardar y Cerrar</button></div></div></div>);
};

// Funcție ajutătoare pentru a verifica dacă există date reale în pontaj
const isPontajDirty = (pontajData) => {
    if (!pontajData || !pontajData.zilePontaj) return false;
    return pontajData.zilePontaj.some(zi =>
      zi.desayuno || zi.cena || zi.procena || (zi.km_final && parseFloat(zi.km_final) > 0) || (zi.contenedores > 0) || (zi.suma_festivo > 0)
    );
};


function CalculadoraNomina() {
    const { user, profile } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [listaSoferi, setListaSoferi] = useState([]);
    const [soferSelectat, setSoferSelectat] = useState(null); // Va stoca ID-ul complet al șoferului
    const [rezultat, setRezultat] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isArchiveOpen, setIsArchiveOpen] = useState(false);
    const [isLoadingArchive, setIsLoadingArchive] = useState(false);
    const [archiveData, setArchiveData] = useState([]);
    const [isParteDiarioOpen, setIsParteDiarioOpen] = useState(false);
    const [selectedDayIndex, setSelectedDayIndex] = useState(null);

    const defaultConfig = useMemo(() => ({
        salario_base: 1050, antiguedad: 0, precio_desayuno: 10,
        precio_cena: 15, precio_procena: 5, precio_km: 0.05,
        precio_contenedor: 6, precio_dia_trabajado: 20
    }), []);

    const defaultPontaj = useMemo(() => ({
        zilePontaj: Array.from({ length: 31 }, () => ({ 
            desayuno: false, cena: false, procena: false, 
            km_iniciar: '', km_final: '', contenedores: 0, suma_festivo: 0
        })),
    }), []);
    
    const [config, setConfig] = useState(defaultConfig);
    const [pontaj, setPontaj] = useState(defaultPontaj);

    const getTargetUserId = useCallback(() => profile?.role === 'dispecer' ? soferSelectat : user?.id, [profile, soferSelectat, user]);

    useEffect(() => {
        if (profile?.role === 'dispecer') {
            const fetchDrivers = async () => {
                const { data, error } = await supabase.from('profiles').select('id, nombre_completo').eq('role', 'sofer');
                if (error) console.error("Error fetching drivers:", error);
                else setListaSoferi(data || []);
            };
            fetchDrivers();
        }
    }, [profile]);
    
    useEffect(() => {
        const targetId = getTargetUserId();
        if (!targetId) {
            setIsLoading(false);
            setConfig(defaultConfig);
            setPontaj(defaultPontaj);
            setRezultat(null);
            return;
        }

        const loadData = async () => {
            setIsLoading(true);
            const { data: profileData } = await supabase.from('nomina_perfiles').select('config_nomina').eq('user_id', targetId).single();
            setConfig(profileData?.config_nomina || defaultConfig);

            const anCurent = currentDate.getFullYear();
            const lunaCurenta = currentDate.getMonth() + 1;
            const { data: pontajSalvat } = await supabase.from('pontaje_curente').select('pontaj_complet').eq('user_id', targetId).eq('an', anCurent).eq('mes', lunaCurenta).single();
            
            if (pontajSalvat && pontajSalvat.pontaj_complet && Array.isArray(pontajSalvat.pontaj_complet.zilePontaj)) {
                const zileComplete = [...defaultPontaj.zilePontaj];
                pontajSalvat.pontaj_complet.zilePontaj.forEach((zi, index) => {
                    if (index < 31) zileComplete[index] = { ...zileComplete[index], ...zi };
                });
                setPontaj({ ...pontajSalvat.pontaj_complet, zilePontaj: zileComplete });
            } else {
                setPontaj(defaultPontaj);
            }
            
            setRezultat(null);
            setIsLoading(false);
        };

        loadData();
    }, [getTargetUserId, currentDate, defaultConfig, defaultPontaj]);

    // Efect de auto-salvare a pontajului
    useEffect(() => {
        const targetId = getTargetUserId();
        if (!targetId || !isPontajDirty(pontaj)) {
            return;
        }

        const handler = setTimeout(() => {
            const saveDraft = async () => {
                const payload = { 
                    user_id: targetId, 
                    an: currentDate.getFullYear(), 
                    mes: currentDate.getMonth() + 1, 
                    pontaj_complet: pontaj 
                };
                const { error } = await supabase.from('pontaje_curente').upsert(payload, { onConflict: 'user_id, an, mes' });
                if (error) {
                    console.error("EROARE la salvarea pontajului:", error);
                } else {
                    console.log("Pontajul a fost salvat automat în Supabase.");
                }
            };
            saveDraft();
        }, 1500);

        return () => clearTimeout(handler);
    }, [pontaj, getTargetUserId, currentDate]);
    
    const handleConfigChange = (e) => { const { name, value } = e.target; const newValue = value === '' ? '' : parseFloat(value); setConfig(prev => ({ ...prev, [name]: newValue })); };
    const handleSoferSelect = (e) => setSoferSelectat(e.target.value);
    const handleOpenParteDiario = (dayIndex) => { setSelectedDayIndex(dayIndex); setIsParteDiarioOpen(true); };
    
    // #################### AICI SE REZOLVĂ ACTUALIZAREA KILOMETRILOR ####################
    const handleCloseParteDiario = async () => {
        if (selectedDayIndex !== null) {
            const ziModificata = pontaj.zilePontaj[selectedDayIndex];
            const kmFinal = parseFloat(ziModificata.km_final) || 0;

            // Doar dacă șoferul a introdus un KM final valid
            if (kmFinal > 0) {
                // Identificăm ID-ul camionului șoferului curent
                let camionId = null;
                if (profile?.role === 'sofer') {
                    // Șoferul își editează propriul pontaj, luăm camion_id din profilul său
                    camionId = profile.camioane?.id; // Folosim 'camioane' încărcat în AuthContext
                } else if (profile?.role === 'dispecer' && soferSelectat) {
                    // Dispecerul editează, trebuie să găsim camionul șoferului selectat
                    const { data: soferData } = await supabase
                        .from('profiles')
                        .select('camioane:camion_id(*)')
                        .eq('id', soferSelectat)
                        .single();
                    camionId = soferData?.camioane?.id;
                }

                if (camionId) {
                    console.log(`Actualizare kilometraj pentru camion ID ${camionId} la ${kmFinal} km.`);
                    const { error } = await supabase
                        .from('camioane')
                        .update({ kilometros: kmFinal })
                        .eq('id', camionId);

                    if (error) {
                        console.error("Eroare la actualizarea kilometrajului:", error);
                    } else {
                        console.log("Kilometrajul camionului a fost actualizat cu succes!");
                    }
                }
            }
        }
        
        setSelectedDayIndex(null);
        setIsParteDiarioOpen(false);
    };

    const handleParteDiarioDataChange = (name, value) => { const newZilePontaj = [...pontaj.zilePontaj]; newZilePontaj[selectedDayIndex] = { ...newZilePontaj[selectedDayIndex], [name]: value }; setPontaj(prev => ({ ...prev, zilePontaj: newZilePontaj })); };
    const handleParteDiarioToggleChange = (field) => { const newZilePontaj = [...pontaj.zilePontaj]; const currentDay = newZilePontaj[selectedDayIndex]; newZilePontaj[selectedDayIndex] = { ...currentDay, [field]: !currentDay[field] }; setPontaj(prev => ({ ...prev, zilePontaj: newZilePontaj })); };
    
    // ... restul funcțiilor (calculate, archive, etc.) rămân neschimbate ...
    const handleSaveConfig = async () => { /* ... */ };
    const handleCalculate = () => { /* ... */ };
    const handleSaveToArchive = async () => { /* ... */ };
    const handleViewArchive = async () => { /* ... */ };
    const renderCalendar = () => { /* ... */ };
    // ... JSX-ul rămâne neschimbat ...
    return (
        <Layout backgroundClassName="calculadora-background">
            { /* ... tot JSX-ul tău de dinainte ... */ }
        </Layout>
    );
}

export default CalculadoraNomina;

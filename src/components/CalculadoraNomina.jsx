import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabaseClient';
import Layout from './Layout';
import styles from './CalculadoraNomina.module.css';

// --- Icoane și Componente Helper (neschimbate) ---
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
    return ( <div className={styles.inputGroup}><label>{label}</label><div className={styles.customNumberInput}><button onClick={handleDecrement} className={styles.stepperButton}>-</button><input type="number" name={name} value={value || 0} readOnly className={styles.numericDisplay} /><button onClick={handleIncrement} className={styles.stepperButton}>+</button></div></div>);
};
const ParteDiarioModal = ({ isOpen, onClose, data, onDataChange, onToggleChange, day, monthName, year }) => {
    if (!isOpen) return null;
    const handleKmChange = (e) => { const { name, value } = e.target; const newValue = value === '' ? '' : parseFloat(value); onDataChange(name, newValue); };
    return ( <div className={styles.modalOverlay}><div className={styles.modalContent}><div className={styles.modalHeader}><h3 className={styles.modalTitle}>Parte Diario - {day} {monthName} {year}</h3><button onClick={onClose} className={styles.closeButton}><CloseIcon /></button></div><div className={styles.modalBody}><div className={styles.parteDiarioSection}><h4>Dietas</h4><div className={styles.checkboxGroupModal}><div><input type="checkbox" id={`modal-desayuno-${day}`} checked={!!data.desayuno} onChange={() => onToggleChange('desayuno')} /><label htmlFor={`modal-desayuno-${day}`}>Desayuno</label></div><div><input type="checkbox" id={`modal-cena-${day}`} checked={!!data.cena} onChange={() => onToggleChange('cena')} /><label htmlFor={`modal-cena-${day}`}>Cena</label></div><div><input type="checkbox" id={`modal-procena-${day}`} checked={!!data.procena} onChange={() => onToggleChange('procena')} /><label htmlFor={`modal-procena-${day}`}>Procena</label></div></div></div><div className={styles.parteDiarioSection}><h4>Kilómetros</h4><div className={styles.inputGrid}><div className={styles.inputGroup}><label>KM Iniciar</label><input type="number" name="km_iniciar" value={data.km_iniciar || ''} onChange={handleKmChange} /></div><div className={styles.inputGroup}><label>KM Final</label><input type="number" name="km_final" value={data.km_final || ''} onChange={handleKmChange} /></div></div></div><div className={styles.parteDiarioSection}><h4>Actividades Especiales</h4><div className={styles.inputGrid}><CustomNumberInput label="Contenedores Barridos" name="contenedores" value={data.contenedores || 0} onDataChange={onDataChange} /><CustomNumberInput label="Suma Festivo/Plus (€)" name="suma_festivo" value={data.suma_festivo || 0} onDataChange={onDataChange} step={10} /></div></div></div><div className={styles.modalFooter}><button onClick={onClose} className={styles.saveButton}>Guardar y Cerrar</button></div></div></div>);
};


function CalculadoraNomina() {
    const { user, profile } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [listaSoferi, setListaSoferi] = useState([]);
    const [soferSelectat, setSoferSelectat] = useState(null);
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
            if (pontajSalvat?.pontaj_complet?.zilePontaj) {
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

    const handleConfigChange = (e) => { const { name, value } = e.target; const newValue = value === '' ? '' : parseFloat(value); setConfig(prev => ({ ...prev, [name]: newValue })); };
    const handleSoferSelect = (e) => setSoferSelectat(e.target.value);
    const handleOpenParteDiario = (dayIndex) => { setSelectedDayIndex(dayIndex); setIsParteDiarioOpen(true); };
    
    // #################### AICI ESTE TOATĂ LOGICA DE SALVARE ####################
    const handleCloseParteDiario = async () => {
        const targetId = getTargetUserId();
        if (!targetId) {
            // Doar închidem modalul dacă nu avem un target (nu ar trebui să se întâmple)
            setSelectedDayIndex(null);
            setIsParteDiarioOpen(false);
            return;
        }

        // --- Pasul 1: Salvează ciorna de pontaj ---
        const payload = { 
            user_id: targetId, 
            an: currentDate.getFullYear(), 
            mes: currentDate.getMonth() + 1, 
            pontaj_complet: pontaj 
        };
        const { error: draftError } = await supabase.from('pontaje_curente').upsert(payload, { onConflict: 'user_id, an, mes' });

        if (draftError) {
            alert(`Eroare la salvarea ciornei: ${draftError.message}`);
            // Oprim aici dacă salvarea ciornei a eșuat
        } else {
            console.log("Ciorna de pontaj a fost salvată cu succes!");

            // --- Pasul 2: Dacă ciorna s-a salvat, actualizează kilometrajul camionului ---
            if (selectedDayIndex !== null) {
                const ziModificata = pontaj.zilePontaj[selectedDayIndex];
                const kmFinal = parseFloat(ziModificata.km_final) || 0;

                if (kmFinal > 0) {
                    let camionId = null;
                    if (profile?.role === 'sofer') {
                        camionId = profile.camioane?.id;
                    } else if (profile?.role === 'dispecer') {
                        const { data: soferData } = await supabase.from('profiles').select('camioane:camion_id(*)').eq('id', targetId).single();
                        camionId = soferData?.camioane?.id;
                    }

                    if (camionId) {
                        const { error: kmError } = await supabase.from('camioane').update({ kilometros: kmFinal }).eq('id', camionId);
                        if (kmError) alert(`Eroare la actualizarea kilometrajului: ${kmError.message}`);
                        else console.log("Kilometrajul camionului a fost actualizat!");
                    }
                }
            }
        }
        
        // --- Pasul 3: Închide fereastra modală ---
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
    
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const isReady = (profile?.role === 'dispecer' && soferSelectat) || profile?.role === 'sofer';
    
    if (isLoading) return <Layout><div className={styles.card}><p>Cargando datos...</p></div></Layout>;

    return (
        <Layout backgroundClassName="calculadora-background">
            <div className={styles.header}>
                <h1>Calculadora de Nómina</h1>
                <button className={styles.archiveButton} onClick={handleViewArchive} disabled={!isReady}><ArchiveIcon /> Ver Archivo</button>
            </div>
            {profile?.role === 'dispecer' && (
                <div className={styles.dispatcherSelector}>
                    <label htmlFor="sofer-select">Seleccione un Conductor:</label>
                    <select id="sofer-select" onChange={handleSoferSelect} value={soferSelectat || ''}>
                        <option value="" disabled>-- Elija un conductor --</option>
                        {listaSoferi.map(sofer => (<option key={sofer.id} value={sofer.id}>{sofer.nombre_completo}</option>))}
                    </select>
                </div>
            )}
            {isReady ? (
                <div className={styles.mainContainer}>
                    <div className={styles.column}>
                        <div className={styles.card}>
                            <h3>1. Configuración de Contrato</h3>
                            <div className={styles.inputGrid}>
                                <div className={styles.inputGroup}><label>Salario Base (€)</label><input type="number" name="salario_base" value={config.salario_base} onChange={handleConfigChange} /></div>
                                <div className={styles.inputGroup}><label>Antigüedad (€)</label><input type="number" name="antiguedad" value={config.antiguedad} onChange={handleConfigChange} /></div>
                                <div className={styles.inputGroup}><label>Precio Día Trabajado (€)</label><input type="number" name="precio_dia_trabajado" value={config.precio_dia_trabajado} onChange={handleConfigChange} /></div>
                                <div className={styles.inputGroup}><label>Precio Desayuno (€)</label><input type="number" name="precio_desayuno" value={config.precio_desayuno} onChange={handleConfigChange} /></div>
                                <div className={styles.inputGroup}><label>Precio Cena (€)</label><input type="number" name="precio_cena" value={config.precio_cena} onChange={handleConfigChange} /></div>
                                <div className={styles.inputGroup}><label>Precio Procena (€)</label><input type="number" name="precio_procena" value={config.precio_procena} onChange={handleConfigChange} /></div>
                                <div className={styles.inputGroup}><label>Precio/km (€)</label><input type="number" name="precio_km" value={config.precio_km} onChange={handleConfigChange} /></div>
                                <div className={styles.inputGroup}><label>Precio Contenedor (€)</label><input type="number" name="precio_contenedor" value={config.precio_contenedor} onChange={handleConfigChange} /></div>
                            </div>
                            <button onClick={handleSaveConfig} className={styles.saveButton}>Guardar Configuración</button>
                        </div>
                        <button onClick={handleCalculate} className={styles.calculateButton}>Calcular Nómina</button>
                    </div>
                    <div className={styles.column}>
                        <div className={styles.card}>
                            <div className={styles.calendarHeader}>
                                <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}>&lt;</button>
                                <h3>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
                                <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}>&gt;</button>
                            </div>
                            <p className={styles.calendarHint}>Haz clic en un día para añadir el parte diario.</p>
                            <div className={styles.calendarWeekdays}><div>L</div><div>M</div><div>X</div><div>J</div><div>V</div><div>S</div><div>D</div></div>
                            <div className={styles.calendarGrid}>{renderCalendar()}</div>
                        </div>
                        {rezultat && (
                            <div className={`${styles.card} ${styles.resultCard}`}>
                                <h3>Resultado del Cálculo</h3>
                                <p className={styles.totalBruto}>{rezultat.totalBruto} €</p>
                                <ul className={styles.resultDetails}>
                                    {rezultat.detalii_calcul && Object.entries(rezultat.detalii_calcul).map(([key, value]) => (<li key={key}><span>{key}</span><span>{value}</span></li>))}
                                </ul>
                                <button onClick={handleSaveToArchive} className={styles.saveButton}>Guardar en Archivo</button>
                            </div>
                        )}
                    </div>
                </div>
            ) : (<div className={styles.card}><p>{isLoading ? 'Cargando...' : 'Por favor, seleccione un conductor para continuar.'}</p></div>)}
            <ParteDiarioModal
                isOpen={isParteDiarioOpen}
                onClose={handleCloseParteDiario}
                data={selectedDayIndex !== null && pontaj.zilePontaj[selectedDayIndex] ? pontaj.zilePontaj[selectedDayIndex] : {}}
                onDataChange={handleParteDiarioDataChange}
                onToggleChange={handleParteDiarioToggleChange}
                day={selectedDayIndex !== null ? selectedDayIndex + 1 : ''}
                monthName={monthNames[currentDate.getMonth()]}
                year={currentDate.getFullYear()}
            />
            {isArchiveOpen && ( /* ... cod modal arhivă ... */ )}
        </Layout>
    );
}

export default CalculadoraNomina;

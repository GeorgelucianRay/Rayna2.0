import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabaseClient';
import Layout from './Layout';
import styles from './CalculadoraNomina.module.css';

// --- Iconițe (Neschimbate) ---
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>;
const ArchiveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8v13H3V8"></path><path d="M1 3h22v5H1z"></path><path d="M10 12h4"></path></svg>;

// --- Componenta pentru o zi din calendar (Modificată) ---
// Acum are un indicator dacă ziua are date și deschide pop-up-ul la click
const CalendarDay = ({ day, data, onClick, isPlaceholder }) => {
    const hasData = !isPlaceholder && (data.desayuno || data.cena || data.procena || data.km_final > 0 || data.contenedores > 0 || data.suma_festivo > 0);
    const dayClasses = `${styles.calendarDay} ${isPlaceholder ? styles.placeholderDay : ''} ${hasData ? styles.hasData : ''}`;
    
    return (
        <div className={dayClasses} onClick={!isPlaceholder ? onClick : undefined}>
            <span className={styles.dayNumber}>{day}</span>
        </div>
    );
};


// --- NOU: Componenta pentru fereastra Pop-up "Parte Diario" ---
const ParteDiarioModal = ({ isOpen, onClose, data, onDataChange, onToggleChange, day, monthName, year }) => {
    if (!isOpen) return null;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        // Convertim la număr dacă este cazul, altfel lăsăm string
        const numericValue = ['km_iniciar', 'km_final', 'contenedores', 'suma_festivo'].includes(name) ? parseFloat(value) || 0 : value;
        onDataChange(name, numericValue);
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h3 className={styles.modalTitle}>Parte Diario - {day} {monthName} {year}</h3>
                    <button onClick={onClose} className={styles.closeButton}><CloseIcon /></button>
                </div>
                <div className={styles.modalBody}>
                    <div className={styles.parteDiarioSection}>
                        <h4>Diurne</h4>
                        <div className={styles.checkboxGroupModal}>
                            <div><input type="checkbox" id={`modal-desayuno-${day}`} checked={data.desayuno} onChange={() => onToggleChange('desayuno')} /><label htmlFor={`modal-desayuno-${day}`}>Desayuno</label></div>
                            <div><input type="checkbox" id={`modal-cena-${day}`} checked={data.cena} onChange={() => onToggleChange('cena')} /><label htmlFor={`modal-cena-${day}`}>Cena</label></div>
                            <div><input type="checkbox" id={`modal-procena-${day}`} checked={data.procena} onChange={() => onToggleChange('procena')} /><label htmlFor={`modal-procena-${day}`}>Procena</label></div>
                        </div>
                    </div>
                     <div className={styles.parteDiarioSection}>
                        <h4>Kilometri</h4>
                        <div className={styles.inputGrid}>
                            <div className={styles.inputGroup}><label>KM Iniciar</label><input type="number" name="km_iniciar" value={data.km_iniciar} onChange={handleInputChange} /></div>
                            <div className={styles.inputGroup}><label>KM Final</label><input type="number" name="km_final" value={data.km_final} onChange={handleInputChange} /></div>
                        </div>
                    </div>
                     <div className={styles.parteDiarioSection}>
                        <h4>Activități Speciale</h4>
                         <div className={styles.inputGrid}>
                            <div className={styles.inputGroup}><label>Contenedores Barridos</label><input type="number" min="0" step="1" name="contenedores" value={data.contenedores} onChange={handleInputChange} /></div>
                            <div className={styles.inputGroup}><label>Suma Festivo/Plus (€)</label><input type="number" min="0" step="1" name="suma_festivo" value={data.suma_festivo} onChange={handleInputChange} /></div>
                        </div>
                    </div>
                </div>
                <div className={styles.modalFooter}>
                    <button onClick={onClose} className={styles.saveButton}>Guardar y Cerrar</button>
                </div>
            </div>
        </div>
    );
};


// --- Componenta Principală (Modificată masiv) ---
function CalculadoraNomina() {
    const { user, profile } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [listaSoferi, setListaSoferi] = useState([]);
    const [soferSelectat, setSoferSelectat] = useState(null);
    const [rezultat, setRezultat] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // Stări pentru Arhivă
    const [isArchiveOpen, setIsArchiveOpen] = useState(false);
    const [isLoadingArchive, setIsLoadingArchive] = useState(false);
    const [archiveData, setArchiveData] = useState([]);
    
    // NOU: Stări pentru Pop-up "Parte Diario"
    const [isParteDiarioOpen, setIsParteDiarioOpen] = useState(false);
    const [selectedDayIndex, setSelectedDayIndex] = useState(null);

    // MODIFICAT: Structura pentru configurare, cu noul preț
    const defaultConfig = useMemo(() => ({
        salario_base: 1050, antiguedad: 0, precio_desayuno: 10,
        precio_cena: 15, precio_procena: 5, precio_km: 0.05,
        precio_contenedor: 6, precio_dia_trabajado: 20
    }), []);

    // MODIFICAT: Structura pentru pontaj, reflectând noul model de date zilnic
    const defaultPontaj = useMemo(() => ({
        zilePontaj: Array(31).fill({ 
            desayuno: false, cena: false, procena: false, 
            km_iniciar: 0, km_final: 0, contenedores: 0, suma_festivo: 0
        }),
    }), []);
    
    const [config, setConfig] = useState(defaultConfig);
    const [pontaj, setPontaj] = useState(defaultPontaj);

    // --- Hooks useEffect (Logică similară, adaptată la noile state) ---
    useEffect(() => {
        const fetchDrivers = async () => {
            if (profile?.role === 'dispecer') {
                setIsLoading(true);
                const { data, error } = await supabase.from('nomina_perfiles').select('user_id, nombre_completo, config_nomina');
                if (error) console.error("Error fetching drivers:", error);
                else {
                    const mappedData = data.map(d => ({ id: d.user_id, nombre_completo: d.nombre_completo, config_nomina: d.config_nomina }));
                    setListaSoferi(mappedData || []);
                }
                setIsLoading(false);
            }
        };
        fetchDrivers();
    }, [profile]);

    useEffect(() => {
        if (profile?.role === 'dispecer') {
            const driverProfile = listaSoferi.find(s => s.id === soferSelectat);
            setConfig(driverProfile?.config_nomina || defaultConfig);
        } else if (profile?.role === 'sofer' && user) {
            const fetchMyConfig = async () => {
                const { data } = await supabase.from('nomina_perfiles').select('config_nomina').eq('user_id', user.id).single();
                setConfig(data?.config_nomina || defaultConfig);
            }
            fetchMyConfig();
        }
        // TODO: Aici ar trebui încărcat și pontajul salvat ca "draft" pentru luna curentă
    }, [soferSelectat, profile, listaSoferi, defaultConfig, user]);

    const getTargetUserId = () => profile?.role === 'dispecer' ? soferSelectat : user?.id;

    const handleSoferSelect = (e) => {
        const selectedId = e.target.value;
        setSoferSelectat(selectedId);
        setPontaj(defaultPontaj);
        setRezultat(null);
    };

    const handleConfigChange = (e) => {
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    };

    // --- NOU: Funcții pentru gestionarea pop-up-ului "Parte Diario" ---
    const handleOpenParteDiario = (dayIndex) => {
        setSelectedDayIndex(dayIndex);
        setIsParteDiarioOpen(true);
    };

    const handleCloseParteDiario = () => {
        setIsParteDiarioOpen(false);
        setSelectedDayIndex(null);
        // TODO: Aici se poate adăuga logica de auto-salvare a pontajului ca draft
    };

    const handleParteDiarioDataChange = (name, value) => {
        const newZilePontaj = [...pontaj.zilePontaj];
        newZilePontaj[selectedDayIndex] = { ...newZilePontaj[selectedDayIndex], [name]: value };
        setPontaj(prev => ({ ...prev, zilePontaj: newZilePontaj }));
    };
    
    const handleParteDiarioToggleChange = (field) => {
        const newZilePontaj = [...pontaj.zilePontaj];
        const currentDay = newZilePontaj[selectedDayIndex];
        newZilePontaj[selectedDayIndex] = { ...currentDay, [field]: !currentDay[field] };
        setPontaj(prev => ({ ...prev, zilePontaj: newZilePontaj }));
    };


    // --- MODIFICAT: Logica de calcul principală ---
    const handleCalculate = () => {
        let totalDesayunos = 0, totalCenas = 0, totalProcenas = 0;
        let totalKm = 0, totalContenedores = 0, totalSumaFestivos = 0;
        let zileMuncite = new Set();

        pontaj.zilePontaj.forEach((zi, index) => {
            if(zi.desayuno) totalDesayunos++;
            if(zi.cena) totalCenas++;
            if(zi.procena) totalProcenas++;
            
            const kmZi = (zi.km_final || 0) - (zi.km_iniciar || 0);
            if (kmZi > 0) totalKm += kmZi;

            totalContenedores += (zi.contenedores || 0);
            totalSumaFestivos += (zi.suma_festivo || 0);
            
            // Criteriu pentru o zi muncită
            if (zi.desayuno || zi.cena || zi.procena || kmZi > 0 || zi.contenedores > 0 || zi.suma_festivo > 0) {
                zileMuncite.add(index);
            }
        });
        
        const totalZileMuncite = zileMuncite.size;
        
        // Calcul sume financiare
        const sumaDesayuno = totalDesayunos * (config.precio_desayuno || 0);
        const sumaCena = totalCenas * (config.precio_cena || 0);
        const sumaProcena = totalProcenas * (config.precio_procena || 0);
        const sumaKm = totalKm * (config.precio_km || 0);
        const sumaContainere = totalContenedores * (config.precio_contenedor || 0);
        const sumaZileMuncite = totalZileMuncite * (config.precio_dia_trabajado || 0);
        
        const totalBruto = (config.salario_base || 0) + (config.antiguedad || 0) + sumaDesayuno + sumaCena + sumaProcena + sumaKm + sumaContainere + sumaZileMuncite + totalSumaFestivos;

        setRezultat({
            totalBruto: totalBruto.toFixed(2),
            detalii_calcul: {
                'Salario Base': (config.salario_base || 0).toFixed(2) + '€',
                'Antigüedad': (config.antiguedad || 0).toFixed(2) + '€',
                'Total Días Trabajados': `${totalZileMuncite} días x ${config.precio_dia_trabajado.toFixed(2)}€ = ${sumaZileMuncite.toFixed(2)}€`,
                'Total Desayuno': `${totalDesayunos} uds. x ${config.precio_desayuno.toFixed(2)}€ = ${sumaDesayuno.toFixed(2)}€`,
                'Total Cena': `${totalCenas} uds. x ${config.precio_cena.toFixed(2)}€ = ${sumaCena.toFixed(2)}€`,
                'Total Procena': `${totalProcenas} uds. x ${config.precio_procena.toFixed(2)}€ = ${sumaProcena.toFixed(2)}€`,
                'Total Kilómetros': `${totalKm} km x ${config.precio_km.toFixed(2)}€ = ${sumaKm.toFixed(2)}€`,
                'Total Contenedores': `${totalContenedores} uds. x ${config.precio_contenedor.toFixed(2)}€ = ${sumaContainere.toFixed(2)}€`,
                'Total Festivos/Plus': totalSumaFestivos.toFixed(2) + '€',
            },
            sumar_activitate: { // Pentru salvarea în arhivă
                'Días Trabajados': totalZileMuncite,
                'Total Desayunos': totalDesayunos,
                'Total Cenas': totalCenas,
                'Total Procenas': totalProcenas,
                'Kilómetros Recorridos': totalKm,
                'Contenedores Barridos': totalContenedores,
                'Suma Festivos/Plus (€)': totalSumaFestivos,
            }
        });
    };

    // --- Funcții de salvare (Logică neschimbată) ---
    const handleSaveConfig = async () => { /* ... logica neschimbată ... */ };
    const handleSaveToArchive = async () => { /* ... logica neschimbată ... */ };
    const handleViewArchive = async () => { /* ... logica neschimbată ... */ };


    // --- Logica de randare calendar (Modificată pentru a deschide pop-up) ---
    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
        let days = [];
        for (let i = 0; i < startDay; i++) { days.push(<div key={`ph-s-${i}`} className={`${styles.calendarDay} ${styles.placeholderDay}`}></div>); }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(<CalendarDay 
                key={i} 
                day={i} 
                data={pontaj.zilePontaj[i - 1]} 
                onClick={() => handleOpenParteDiario(i - 1)} 
            />);
        }
        while (days.length % 7 !== 0) { days.push(<div key={`ph-e-${days.length}`} className={`${styles.calendarDay} ${styles.placeholderDay}`}></div>); }
        return days;
    };
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    
    const isReady = (profile?.role === 'dispecer' && soferSelectat) || profile?.role === 'sofer';
    
    return (
        <Layout backgroundClassName="calculadora-background">
            <div className={styles.header}>
                <h1>Calculadora de Nómina</h1>
                <button className={styles.archiveButton} onClick={handleViewArchive} disabled={!isReady}><ArchiveIcon /> Ver Archivo</button>
            </div>

            {profile?.role === 'dispecer' && (
                <div className={styles.dispatcherSelector}>
                    {/* ... selectorul de șoferi ... */}
                </div>
            )}

            {isReady ? (
                <div className={styles.mainContainer}>
                    <div className={styles.column}>
                        {/* MODIFICAT: Cardul de Configurare cu noul câmp */}
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
                        
                        {/* ELIMINAT: Cardul "Cálculo Mensual" nu mai este necesar */}

                        <button onClick={handleCalculate} className={styles.calculateButton}>Calcular Nómina</button>
                    </div>
                    
                    <div className={styles.column}>
                        {/* MODIFICAT: Calendarul este acum piesa centrală */}
                        <div className={styles.card}>
                            <div className={styles.calendarHeader}>
                                {/* ... butoane de navigare lună ... */}
                                <h3>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
                                {/* ... butoane de navigare lună ... */}
                            </div>
                             <p className={styles.calendarHint}>Haz clic en un día para añadir el parte diario.</p>
                            <div className={styles.calendarWeekdays}><div>L</div><div>M</div><div>X</div><div>J</div><div>V</div><div>S</div><div>D</div></div>
                            <div className={styles.calendarGrid}>{renderCalendar()}</div>
                        </div>

                        {rezultat && (
                            <div className={`${styles.card} ${styles.resultCard}`}>
                                {/* ... afișarea rezultatului ... */}
                            </div>
                        )}
                    </div>
                </div>
            ) : ( /* ... mesaje de încărcare/selecție ... */ )}

            {/* NOU: Randarea condiționată a ferestrei pop-up */}
            <ParteDiarioModal
                isOpen={isParteDiarioOpen}
                onClose={handleCloseParteDiario}
                data={selectedDayIndex !== null ? pontaj.zilePontaj[selectedDayIndex] : {}}
                onDataChange={handleParteDiarioDataChange}
                onToggleChange={handleParteDiarioToggleChange}
                day={selectedDayIndex !== null ? selectedDayIndex + 1 : ''}
                monthName={monthNames[currentDate.getMonth()]}
                year={currentDate.getFullYear()}
            />

            {/* Arhiva (neschimbată) */}
            {isArchiveOpen && (
                <div className={styles.modalOverlay}>
                    {/* ... conținutul modal arhivă ... */}
                </div>
            )}
        </Layout>
    );
}

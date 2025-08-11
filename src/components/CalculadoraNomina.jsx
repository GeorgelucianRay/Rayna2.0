import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabaseClient';
import Layout from './Layout';
import styles from './CalculadoraNomina.module.css';

// --- Iconos ---
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>;
const ArchiveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8v13H3V8"></path><path d="M1 3h22v5H1z"></path><path d="M10 12h4"></path></svg>;

// --- Componenta pentru o zi din calendar ---
const CalendarDay = ({ day, data, onClick, isPlaceholder }) => {
    const hasData = !isPlaceholder && (data.desayuno || data.cena || data.procena || data.km_final > 0 || data.contenedores > 0 || data.suma_festivo > 0);
    const dayClasses = `${styles.calendarDay} ${isPlaceholder ? styles.placeholderDay : ''} ${hasData ? styles.hasData : ''}`;
    
    return (
        <div className={dayClasses} onClick={!isPlaceholder ? onClick : undefined}>
            <span className={styles.dayNumber}>{day}</span>
        </div>
    );
};

// --- Componenta reutilizabilă pentru input numeric cu butoane ---
const CustomNumberInput = ({ label, name, value, onDataChange, min = 0, step = 1 }) => {
    const handleIncrement = () => {
        const newValue = (value || 0) + step;
        onDataChange(name, newValue);
    };

    const handleDecrement = () => {
        const newValue = (value || 0) - step;
        if (newValue >= min) {
            onDataChange(name, newValue);
        }
    };

    return (
        <div className={styles.inputGroup}>
            <label>{label}</label>
            <div className={styles.customNumberInput}>
                <button onClick={handleDecrement} className={styles.stepperButton}>-</button>
                <input 
                    type="number" 
                    name={name}
                    value={value} 
                    readOnly
                    className={styles.numericDisplay}
                />
                <button onClick={handleIncrement} className={styles.stepperButton}>+</button>
            </div>
        </div>
    );
};

// --- Componenta pentru fereastra modală "Parte Diario" ---
const ParteDiarioModal = ({ isOpen, onClose, data, onDataChange, onToggleChange, day, monthName, year }) => {
    if (!isOpen) return null;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        onDataChange(name, parseFloat(value) || 0);
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
                        <h4>Dietas</h4>
                        <div className={styles.checkboxGroupModal}>
                            <div><input type="checkbox" id={`modal-desayuno-${day}`} checked={!!data.desayuno} onChange={() => onToggleChange('desayuno')} /><label htmlFor={`modal-desayuno-${day}`}>Desayuno</label></div>
                            <div><input type="checkbox" id={`modal-cena-${day}`} checked={!!data.cena} onChange={() => onToggleChange('cena')} /><label htmlFor={`modal-cena-${day}`}>Cena</label></div>
                            <div><input type="checkbox" id={`modal-procena-${day}`} checked={!!data.procena} onChange={() => onToggleChange('procena')} /><label htmlFor={`modal-procena-${day}`}>Procena</label></div>
                        </div>
                    </div>
                     <div className={styles.parteDiarioSection}>
                        <h4>Kilómetros</h4>
                        <div className={styles.inputGrid}>
                            <div className={styles.inputGroup}><label>KM Iniciar</label><input type="number" name="km_iniciar" value={data.km_iniciar || ''} onChange={handleInputChange} /></div>
                            <div className={styles.inputGroup}><label>KM Final</label><input type="number" name="km_final" value={data.km_final || ''} onChange={handleInputChange} /></div>
                        </div>
                    </div>
                     <div className={styles.parteDiarioSection}>
                        <h4>Actividades Especiales</h4>
                         <div className={styles.inputGrid}>
                            <CustomNumberInput 
                                label="Contenedores Barridos"
                                name="contenedores"
                                value={data.contenedores || 0}
                                onDataChange={onDataChange}
                            />
                            <CustomNumberInput 
                                label="Suma Festivo/Plus (€)"
                                name="suma_festivo"
                                value={data.suma_festivo || 0}
                                onDataChange={onDataChange}
                                step={10}
                            />
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


// --- Componenta Principală ---
function CalculadoraNomina() {
    const { user, profile } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [listaSoferi, setListaSoferi] = useState([]);
    const [soferSelectat, setSoferSelectat] = useState(null);
    const [rezultat, setRezultat] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    
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
        zilePontaj: Array(31).fill({ 
            desayuno: false, cena: false, procena: false, 
            km_iniciar: 0, km_final: 0, contenedores: 0, suma_festivo: 0
        }),
    }), []);
    
    const [config, setConfig] = useState(defaultConfig);
    const [pontaj, setPontaj] = useState(defaultPontaj);

    const getTargetUserId = () => profile?.role === 'dispecer' ? soferSelectat : user?.id;
    
    // --- HOOKS PENTRU LOGICA PRINCIPALĂ ---

    // Fetching driver list (for dispatcher)
    useEffect(() => {
        const fetchDrivers = async () => {
            if (profile?.role === 'dispecer') {
                setIsLoading(true);
                const { data, error } = await supabase.from('nomina_perfiles').select('user_id, nombre_completo, config_nomina');
                if (error) {
                    console.error("Error al obtener la lista de conductores:", error);
                    alert("Error al obtener la lista de conductores.");
                } else {
                    const mappedData = data.map(d => ({ id: d.user_id, nombre_completo: d.nombre_completo, config_nomina: d.config_nomina }));
                    setListaSoferi(mappedData || []);
                }
                setIsLoading(false);
            }
        };
        fetchDrivers();
    }, [profile]);

    // MODIFICAT: Hook pentru a încărca atât Configurația, cât și Pontajul salvat (ciorna)
    useEffect(() => {
        const targetId = getTargetUserId();
        if (!targetId) {
            setConfig(defaultConfig);
            setPontaj(defaultPontaj);
            setRezultat(null);
            return;
        }

        const loadData = async () => {
            // 1. Încărcăm Configurația
            const { data: profileData } = await supabase
                .from('nomina_perfiles').select('config_nomina').eq('user_id', targetId).single();
            setConfig(profileData?.config_nomina || defaultConfig);

            // 2. Încărcăm Pontajul salvat pentru luna curentă
            const anCurent = currentDate.getFullYear();
            const lunaCurenta = currentDate.getMonth() + 1;

            const { data: pontajSalvat } = await supabase
                .from('pontaje_curente').select('pontaj_complet').eq('user_id', targetId)
                .eq('an', anCurent).eq('mes', lunaCurenta).single();

            if (pontajSalvat && pontajSalvat.pontaj_complet) {
                console.log("Ciorna a fost încărcată din Supabase.");
                setPontaj(pontajSalvat.pontaj_complet);
            } else {
                console.log("Nu a fost găsită nicio ciornă. Se încarcă pontajul implicit.");
                setPontaj(defaultPontaj);
            }
            
            setRezultat(null); 
        };

        loadData();
    }, [soferSelectat, profile, user, currentDate, defaultConfig, defaultPontaj]);

    // NOU: Hook pentru auto-salvarea pontajului ca ciornă (draft)
    useEffect(() => {
        const handler = setTimeout(() => {
            const targetId = getTargetUserId();
            // Comparăm obiectele JSON pentru a nu salva starea inițială goală
            if (targetId && JSON.stringify(pontaj) !== JSON.stringify(defaultPontaj)) {
                
                const saveDraft = async () => {
                    console.log("Auto-salvare ciornă...");
                    const { error } = await supabase
                        .from('pontaje_curente')
                        .upsert({ 
                            user_id: targetId,
                            an: currentDate.getFullYear(),
                            mes: currentDate.getMonth() + 1,
                            pontaj_complet: pontaj
                        }, {
                            onConflict: 'user_id, an, mes'
                        });

                    if (error) {
                        console.error('Eroare la auto-salvare:', error);
                    }
                };
                saveDraft();
            }
        }, 1500); // Salvează la 1.5 secunde după ultima modificare

        return () => {
            clearTimeout(handler);
        };
    }, [pontaj, currentDate, user, profile, soferSelectat, defaultPontaj]);


    // --- HANDLERS (Funcții de interacțiune) ---

    const handleSoferSelect = (e) => {
        setSoferSelectat(e.target.value);
        // Datele se vor reîncărca automat datorită hook-ului de mai sus
    };

    const handleConfigChange = (e) => {
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    };

    const handleOpenParteDiario = (dayIndex) => {
        setSelectedDayIndex(dayIndex);
        setIsParteDiarioOpen(true);
    };

    const handleCloseParteDiario = () => {
        setIsParteDiarioOpen(false);
        setSelectedDayIndex(null);
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

    const handleCalculate = () => {
        // ... Logica de calcul rămâne aceeași ...
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
            if (zi.desayuno || zi.cena || zi.procena || kmZi > 0 || zi.contenedores > 0 || zi.suma_festivo > 0) {
                zileMuncite.add(index);
            }
        });
        const totalZileMuncite = zileMuncite.size;
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
                'Salario Base': `${(config.salario_base || 0).toFixed(2)}€`,
                'Antigüedad': `${(config.antiguedad || 0).toFixed(2)}€`,
                'Total Días Trabajados': `${totalZileMuncite} días x ${(config.precio_dia_trabajado || 0).toFixed(2)}€ = ${sumaZileMuncite.toFixed(2)}€`,
                'Total Desayunos': `${totalDesayunos} uds. x ${(config.precio_desayuno || 0).toFixed(2)}€ = ${sumaDesayuno.toFixed(2)}€`,
                'Total Cenas': `${totalCenas} uds. x ${(config.precio_cena || 0).toFixed(2)}€ = ${sumaCena.toFixed(2)}€`,
                'Total Procenas': `${totalProcenas} uds. x ${(config.precio_procena || 0).toFixed(2)}€ = ${sumaProcena.toFixed(2)}€`,
                'Total Kilómetros': `${totalKm} km x ${(config.precio_km || 0).toFixed(2)}€ = ${sumaKm.toFixed(2)}€`,
                'Total Contenedores': `${totalContenedores} uds. x ${(config.precio_contenedor || 0).toFixed(2)}€ = ${sumaContainere.toFixed(2)}€`,
                'Total Festivos/Plus': `${totalSumaFestivos.toFixed(2)}€`,
            },
            sumar_activitate: {'Días Trabajados': totalZileMuncite, 'Total Desayunos': totalDesayunos, 'Total Cenas': totalCenas, 'Total Procenas': totalProcenas, 'Kilómetros Recorridos': totalKm, 'Contenedores Barridos': totalContenedores, 'Suma Festivos/Plus (€)': totalSumaFestivos, }
        });
    };

    const handleSaveConfig = async () => { /* ... Logica de salvare neschimbată ... */ };
    const handleSaveToArchive = async () => { /* ... Logica de salvare neschimbată ... */ };
    const handleViewArchive = async () => { /* ... Logica de vizualizare neschimbată ... */ };

    // --- FUNCȚII DE RANDARE ---
    const renderCalendar = () => {
        // ... Logica de randare calendar rămâne aceeași ...
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
        let days = [];
        for (let i = 0; i < startDay; i++) { days.push(<div key={`ph-s-${i}`} className={`${styles.calendarDay} ${styles.placeholderDay}`}></div>); }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(<CalendarDay key={i} day={i} data={pontaj.zilePontaj[i - 1]} onClick={() => handleOpenParteDiario(i - 1)} />);
        }
        while (days.length % 7 !== 0) { days.push(<div key={`ph-e-${days.length}`} className={`${styles.calendarDay} ${styles.placeholderDay}`}></div>); }
        return days;
    };
    
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const isReady = (profile?.role === 'dispecer' && soferSelectat) || profile?.role === 'sofer';
    const driverData = profile?.role === 'dispecer' ? listaSoferi.find(s => s.id === soferSelectat) : profile;
    
    return (
        <Layout backgroundClassName="calculadora-background">
            {/* ... Blocul JSX de randare rămâne același ca în răspunsul anterior ... */}
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
            ) : (
                <div className={styles.card}><p>{isLoading ? 'Cargando conductores...' : 'Por favor, seleccione un conductor para continuar.'}</p></div>
            )}
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
            {isArchiveOpen && (
                <div className={styles.modalOverlay}>
                    {/* ... conținutul modal arhivă ... */}
                </div>
            )}
        </Layout>
    );
}

export default CalculadoraNomina;

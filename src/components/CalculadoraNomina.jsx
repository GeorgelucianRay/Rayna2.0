import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabaseClient';
import Layout from './Layout';
import styles from './CalculadoraNomina.module.css';

// ... (Iconițele și CalendarDay rămân la fel) ...
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>;
const ArchiveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8v13H3V8"></path><path d="M1 3h22v5H1z"></path><path d="M10 12h4"></path></svg>;

const CalendarDay = ({ day, data, onToggle, isPlaceholder }) => {
    const dayClasses = `${styles.calendarDay} ${isPlaceholder ? styles.placeholderDay : ''}`;
    return (
        <div className={dayClasses}>
            <span className={styles.dayNumber}>{day}</span>
            {!isPlaceholder && (
                <div className={styles.checkboxGroup}>
                    <div><input type="checkbox" id={`desayuno-${day}`} checked={data.desayuno} onChange={() => onToggle('desayuno')} /><label htmlFor={`desayuno-${day}`}>D</label></div>
                    <div><input type="checkbox" id={`cena-${day}`} checked={data.cena} onChange={() => onToggle('cena')} /><label htmlFor={`cena-${day}`}>C</label></div>
                    <div><input type="checkbox" id={`procena-${day}`} checked={data.procena} onChange={() => onToggle('procena')} /><label htmlFor={`procena-${day}`}>P</label></div>
                </div>
            )}
        </div>
    );
};

function CalculadoraNomina() {
    // ... (Toate state-urile rămân neschimbate) ...
    const { user, profile } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isArchiveOpen, setIsArchiveOpen] = useState(false);
    const [archiveData, setArchiveData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingArchive, setIsLoadingArchive] = useState(false);
    const [listaSoferi, setListaSoferi] = useState([]);
    const [soferSelectat, setSoferSelectat] = useState(null);

    const defaultConfig = useMemo(() => ({
        salario_base: 1050, antiguedad: 0, precio_desayuno: 0,
        precio_cena: 0, precio_procena: 0, precio_km: 0.05, precio_contenedor: 6,
    }), []);
    
    const defaultPontaj = useMemo(() => ({
        km_start: '', km_final: '', festivos: [], contenedores: 0,
        zilePontaj: Array(31).fill({ desayuno: false, cena: false, procena: false }),
    }), []);

    const [config, setConfig] = useState(defaultConfig);
    const [pontaj, setPontaj] = useState(defaultPontaj);
    const [rezultat, setRezultat] = useState(null);


    // ... (useEffect-urile și majoritatea funcțiilor rămân neschimbate) ...
    useEffect(() => {
        const fetchDrivers = async () => {
            if (profile?.role === 'dispecer') {
                setIsLoading(true);
                const { data, error } = await supabase.from('nomina_perfiles').select('user_id, nombre_completo, config_nomina');
                
                if (error) {
                    console.error("Error al obtener la lista de conductores desde nomina_perfiles:", error);
                    alert("Error al obtener la lista de conductores.");
                } else {
                    const mappedData = data.map(d => ({
                        id: d.user_id,
                        nombre_completo: d.nombre_completo,
                        config_nomina: d.config_nomina
                    }));
                    setListaSoferi(mappedData || []);
                }
                setIsLoading(false);
            }
        };
        fetchDrivers();
    }, [profile]);

    useEffect(() => {
        const driverProfile = soferSelectat ? listaSoferi.find(s => s.id === soferSelectat) : null;
        if (profile?.role === 'dispecer') {
            setConfig(driverProfile?.config_nomina || defaultConfig);
        } else if (profile?.role === 'sofer') {
            const fetchMyNominaConfig = async () => {
                const { data } = await supabase.from('nomina_perfiles').select('config_nomina').eq('user_id', user.id).single();
                setConfig(data?.config_nomina || defaultConfig);
            }
            fetchMyNominaConfig();
        }
    }, [soferSelectat, profile, listaSoferi, defaultConfig, user]);
    
    const handleSoferSelect = (e) => {
        const selectedId = e.target.value;
        setSoferSelectat(selectedId);
        setPontaj(defaultPontaj);
        setRezultat(null);
    };

    const getTargetUserId = () => profile?.role === 'dispecer' ? soferSelectat : user.id;

    const handleConfigChange = (e) => {
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, [name]: value === '' ? '' : parseFloat(value) || 0 }));
    };

    const handlePontajChange = (e) => {
        const { name, value } = e.target;
        setPontaj(prev => ({ ...prev, [name]: value === '' ? '' : parseFloat(value) || 0 }));
    };

    const handlePontajToggle = (dayIndex, field) => {
        const newPontajDays = [...pontaj.zilePontaj];
        newPontajDays[dayIndex] = { ...newPontajDays[dayIndex], [field]: !newPontajDays[dayIndex][field] };
        setPontaj(prev => ({ ...prev, zilePontaj: newPontajDays }));
    };
    
    const addFestivo = () => {
        const suma = parseFloat(prompt("Introduzca el importe para este festivo/plus:"));
        if (!isNaN(suma) && suma > 0) {
            setPontaj(prev => ({ ...prev, festivos: [...prev.festivos, { suma }] }));
        }
    };

    // === MODIFICARE CHEIE 1: Schimbăm ce salvăm în `rezultat` ===
    const handleCalculate = () => {
        // Calculăm cantitățile
        const totalDesayuno = pontaj.zilePontaj.filter(z => z.desayuno).length;
        const totalCena = pontaj.zilePontaj.filter(z => z.cena).length;
        const totalProcena = pontaj.zilePontaj.filter(z => z.procena).length;
        const totalZileMuncite = new Set(pontaj.zilePontaj.map((z, i) => (z.desayuno || z.cena || z.procena) ? i : null).filter(i => i !== null)).size;
        
        const kmParcursi = (pontaj.km_final || 0) > (pontaj.km_start || 0) ? (pontaj.km_final || 0) - (pontaj.km_start || 0) : 0;
        const totalContainere = (pontaj.contenedores || 0);
        const totalFestivos = pontaj.festivos.length;
        const sumaTotalaFestivos = pontaj.festivos.reduce((acc, f) => acc + f.suma, 0);

        // Calculăm sumele financiare (rămân necesare pentru afișarea inițială)
        const sumaDesayuno = totalDesayuno * (config.precio_desayuno || 0);
        const sumaCena = totalCena * (config.precio_cena || 0);
        const sumaProcena = totalProcena * (config.precio_procena || 0);
        const sumaKm = kmParcursi * (config.precio_km || 0);
        const sumaContainere = totalContainere * (config.precio_contenedor || 0);
        const totalBruto = (config.salario_base || 0) + (config.antiguedad || 0) + sumaDesayuno + sumaCena + sumaProcena + sumaKm + sumaContainere + sumaTotalaFestivos;

        setRezultat({
            totalBruto: totalBruto.toFixed(2),
            // Obiectul `detalii` va fi afișat imediat după calcul
            detalii_calcul: {
                'Salario Base': (config.salario_base || 0).toFixed(2) + '€',
                'Antigüedad': (config.antiguedad || 0).toFixed(2) + '€',
                'Total Desayuno': `${totalDesayuno} días x ${(config.precio_desayuno || 0).toFixed(2)}€ = ${sumaDesayuno.toFixed(2)}€`,
                'Total Cena': `${totalCena} días x ${(config.precio_cena || 0).toFixed(2)}€ = ${sumaCena.toFixed(2)}€`,
                'Total Procena': `${totalProcena} días x ${(config.precio_procena || 0).toFixed(2)}€ = ${sumaProcena.toFixed(2)}€`,
                'Total Kilómetros': `${kmParcursi} km x ${(config.precio_km || 0).toFixed(2)}€ = ${sumaKm.toFixed(2)}€`,
                'Total Contenedores': `${totalContainere} uds. x ${(config.precio_contenedor || 0).toFixed(2)}€ = ${sumaContainere.toFixed(2)}€`,
                'Total Festivos/Plus': sumaTotalaFestivos.toFixed(2) + '€',
            },
            // Noul obiect `sumar_activitate` va fi salvat în arhivă
            sumar_activitate: {
                'Días Trabajados': totalZileMuncite,
                'Total Desayunos': totalDesayuno,
                'Total Cenas': totalCena,
                'Total Procenas': totalProcena,
                'Kilómetros Recorridos': kmParcursi,
                'Contenedores Barridos': totalContainere,
                'Festivos / Plus': totalFestivos,
            }
        });
    };

    const handleSaveConfig = async () => {
        const targetId = getTargetUserId();
        if (!targetId) { alert("Por favor, seleccione un conductor."); return; }
        const { error } = await supabase.from('nomina_perfiles').update({ config_nomina: config }).eq('user_id', targetId);
        if (error) alert('Error al guardar la configuración: ' + error.message);
        else alert('¡Configuración guardada con éxito!');
    };

    const handleSaveToArchive = async () => {
        const targetId = getTargetUserId();
        if (!targetId || !rezultat) return;
        
        // Salvăm `sumar_activitate` în coloana `detalii`
        const { error } = await supabase.from('nominas_calculadas').insert({
            user_id: targetId, mes: currentDate.getMonth() + 1, an: currentDate.getFullYear(),
            total_bruto: parseFloat(rezultat.totalBruto), // Putem păstra totalul brut pentru referință
            detalii: rezultat.sumar_activitate 
        });

        if (error) {
            alert('Error al guardar en el archivo: ' + error.message);
        } else {
            alert('Cálculo guardado en el archivo.');
            setRezultat(null);
        }
    };
    
    const handleViewArchive = async () => {
        const targetId = getTargetUserId();
        if (!targetId) {
            alert("Por favor, seleccione un conductor para ver su archivo.");
            return;
        }
        setIsArchiveOpen(true);
        setIsLoadingArchive(true);
        const { data, error } = await supabase.from('nominas_calculadas').select('*').eq('user_id', targetId).order('an', { ascending: false }).order('mes', { ascending: false });
        
        if (error) {
            alert("Error al cargar el archivo: " + error.message);
        } else {
            setArchiveData(data || []);
        }
        setIsLoadingArchive(false);
    };
    
    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
        let days = [];
        for (let i = 0; i < startDay; i++) { days.push(<div key={`ph-s-${i}`} className={`${styles.calendarDay} ${styles.placeholderDay}`}></div>); }
        for (let i = 1; i <= daysInMonth; i++) { days.push(<CalendarDay key={i} day={i} data={pontaj.zilePontaj[i - 1]} onToggle={(field) => handlePontajToggle(i - 1, field)} />); }
        while (days.length % 7 !== 0) { days.push(<div key={`ph-e-${days.length}`} className={`${styles.calendarDay} ${styles.placeholderDay}`}></div>); }
        return days;
    };
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    
    const isReady = (profile?.role === 'dispecer' && soferSelectat) || profile?.role === 'sofer';
    const driverData = profile?.role === 'dispecer' ? listaSoferi.find(s => s.id === soferSelectat) : profile;
    
    return (
        <Layout backgroundClassName="calculadora-background">
            <div className={styles.header}>
                <h1>Calculadora de Nómina</h1>
                <button className={styles.archiveButton} onClick={handleViewArchive} disabled={!isReady}>
                    <ArchiveIcon /> Ver Archivo
                </button>
            </div>
            {profile?.role === 'dispecer' && (
                <div className={styles.dispatcherSelector}>
                    <label htmlFor="sofer-select">Seleccione un Conductor:</label>
                    <select id="sofer-select" onChange={handleSoferSelect} value={soferSelectat || ''}>
                        <option value="" disabled>-- Elija un conductor --</option>
                        {listaSoferi.map(sofer => (
                            <option key={sofer.id} value={sofer.id}>{sofer.nombre_completo}</option>
                        ))}
                    </select>
                </div>
            )}
            {isReady && config ? (
                <div className={styles.mainContainer}>
                    <div className={styles.column}>
                        <div className={styles.card}>
                            <h3>1. Configuración de Contrato</h3>
                            <div className={styles.inputGrid}>
                                <div className={styles.inputGroup}><label>Salario Base (€)</label><input type="number" name="salario_base" value={config.salario_base} onChange={handleConfigChange} /></div>
                                <div className={styles.inputGroup}><label>Antigüedad (€)</label><input type="number" name="antiguedad" value={config.antiguedad} onChange={handleConfigChange} /></div>
                                <div className={styles.inputGroup}><label>Precio Desayuno (€)</label><input type="number" name="precio_desayuno" value={config.precio_desayuno} onChange={handleConfigChange} /></div>
                                <div className={styles.inputGroup}><label>Precio Cena (€)</label><input type="number" name="precio_cena" value={config.precio_cena} onChange={handleConfigChange} /></div>
                                <div className={styles.inputGroup}><label>Precio Procena (€)</label><input type="number" name="precio_procena" value={config.precio_procena} onChange={handleConfigChange} /></div>
                                <div className={styles.inputGroup}><label>Precio/km (€)</label><input type="number" name="precio_km" value={config.precio_km} onChange={handleConfigChange} /></div>
                                <div className={styles.inputGroup}><label>Precio Contenedor (€)</label><input type="number" name="precio_contenedor" value={config.precio_contenedor} onChange={handleConfigChange} /></div>
                            </div>
                            <button onClick={handleSaveConfig} className={styles.saveButton}>Guardar Configuración</button>
                        </div>
                        <div className={styles.card}>
                            <h3>2. Cálculo Mensual</h3>
                            <div className={styles.inputGrid}>
                                <div className={styles.inputGroup}><label>KM Inicio de Mes</label><input type="number" name="km_start" value={pontaj.km_start} onChange={handlePontajChange} /></div>
                                <div className={styles.inputGroup}><label>KM Final de Mes</label><input type="number" name="km_final" value={pontaj.km_final} onChange={handlePontajChange} /></div>
                                <div className={styles.inputGroup}><label>Nº Contenedores</label><input type="number" name="contenedores" value={pontaj.contenedores} onChange={handlePontajChange} /></div>
                            </div>
                            <div className={styles.festivosSection}>
                                <button onClick={addFestivo} className={styles.addFestivoButton}>Añadir Festivo / Plus</button>
                                <p>Festivos añadidos: {pontaj.festivos.map(f => `${f.suma}€`).join(', ')}</p>
                            </div>
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
                            <div className={styles.calendarWeekdays}>
                                <div>L</div><div>M</div><div>X</div><div>J</div><div>V</div><div>S</div><div>D</div>
                            </div>
                            <div className={styles.calendarGrid}>
                                {renderCalendar()}
                            </div>
                        </div>
                        {rezultat && (
                            <div className={`${styles.card} ${styles.resultCard}`}>
                                <h3>Resultado del Cálculo</h3>
                                <p className={styles.totalBruto}>Total Bruto: {rezultat.totalBruto} €</p>
                                <ul className={styles.resultDetails}>
                                    {rezultat.detalii_calcul && Object.entries(rezultat.detalii_calcul).map(([key, value]) => (
                                        <li key={key}><span>{key}</span><span>{value}</span></li>
                                    ))}
                                </ul>
                                <button onClick={handleSaveToArchive} className={styles.saveButton}>Guardar en Archivo</button>
                            </div>
                        )}
                    </div>
                </div>
            ) : ( profile?.role === 'dispecer' && <div className={styles.card}><p>{isLoading ? 'Cargando conductores...' : 'Por favor, seleccione un conductor para continuar.'}</p></div> )}

            {/* === MODIFICARE CHEIE 2: Schimbăm cum afișăm datele în arhivă === */}
            {isArchiveOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>Archivo de Actividad {driverData ? `para ${driverData.nombre_completo}` : ''}</h3>
                            <button onClick={() => setIsArchiveOpen(false)} className={styles.closeButton}><CloseIcon /></button>
                        </div>
                        <div className={styles.modalBody}>
                            {isLoadingArchive ? (
                                <p>Cargando archivo...</p>
                            ) : (
                                archiveData.length > 0 ? (
                                    archiveData.map(item => (
                                        <div key={item.id} className={styles.archiveItem}>
                                            <div className={styles.archiveHeader}>
                                                <span>{monthNames[item.mes - 1]} {item.an}</span>
                                                {/* Am scos suma totală, conform cerinței */}
                                            </div>
                                            <ul className={styles.resultDetails}>
                                              {/* Afișăm sumarul de activitate, nu detaliile financiare */}
                                              {item.detalii && Object.entries(item.detalii).map(([key, value]) => (
                                                  <li key={key}><span>{key}</span><span>{value.toString()}</span></li>
                                              ))}
                                            </ul>
                                        </div>
                                    ))
                                ) : (
                                    <p>No hay actividad guardada en el archivo.</p>
                                )
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}

export default CalculadoraNomina;

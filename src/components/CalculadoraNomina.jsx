import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabaseClient';
import Layout from './Layout';
import styles from './CalculadoraNomina.module.css'; // Stilurile noi

// --- Componente de Iconițe (le puteți muta într-un fișier separat) ---
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>;
const ArchiveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8v13H3V8"></path><path d="M1 3h22v5H1z"></path><path d="M10 12h4"></path></svg>;

// --- Componenta pentru o singură zi din calendar ---
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

// --- Componenta Principală ---
function CalculadoraNomina() {
    const { user, profile } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());

    const [isArchiveOpen, setIsArchiveOpen] = useState(false);
    const [archiveData, setArchiveData] = useState([]);
    const [isLoadingArchive, setIsLoadingArchive] = useState(false);

    // --- State pentru Configurare Contract ---
    const [config, setConfig] = useState({
        salario_base: 1050,
        antiguedad: 50,
        precio_dia: 13,
        precio_desayuno: 4.28,
        precio_cena: 12.98,
        precio_procena: 11.98,
        precio_km: 0.05,
        precio_contenedor: 6,
    });

    // --- State pentru Pontaj Lunar ---
    const [pontaj, setPontaj] = useState({
        km_start: '',
        km_final: '',
        festivos: [],
        contenedores: 0,
        zilePontaj: Array(31).fill({ desayuno: false, cena: false, procena: false }),
    });

    const [rezultat, setRezultat] = useState(null);

    // Încărcare configurare salvată la început
    useEffect(() => {
        if (profile && profile.config_nomina) {
            setConfig(profile.config_nomina);
        }
    }, [profile]);
    
    const handleConfigChange = (e) => {
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    };

    const handlePontajChange = (e) => {
        const { name, value } = e.target;
        setPontaj(prev => ({ ...prev, [name]: value === '' ? '' : parseFloat(value) || 0 }));
    };

    const handlePontajToggle = (dayIndex, field) => {
        const noiZile = [...pontaj.zilePontaj];
        noiZile[dayIndex] = { ...noiZile[dayIndex], [field]: !noiZile[dayIndex][field] };
        setPontaj(prev => ({ ...prev, zilePontaj: noiZile }));
    };

    const addFestivo = () => {
        const suma = parseFloat(prompt("Introduce la suma para este festivo/plus:"));
        if (!isNaN(suma) && suma > 0) {
            setPontaj(prev => ({ ...prev, festivos: [...prev.festivos, { suma }] }));
        }
    };

    const handleCalculate = () => {
        const zileInLuna = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        
        const totalZileMuncite = pontaj.zilePontaj.slice(0, zileInLuna).filter(z => z.desayuno || z.cena || z.procena).length;
        const totalDesayuno = pontaj.zilePontaj.slice(0, zileInLuna).filter(z => z.desayuno).length;
        const totalCena = pontaj.zilePontaj.slice(0, zileInLuna).filter(z => z.cena).length;
        const totalProcena = pontaj.zilePontaj.slice(0, zileInLuna).filter(z => z.procena).length;

        const sumaZileMuncite = totalZileMuncite * config.precio_dia;
        const sumaDesayuno = totalDesayuno * config.precio_desayuno;
        const sumaCena = totalCena * config.precio_cena;
        const sumaProcena = totalProcena * config.precio_procena;
        
        const kmParcursi = pontaj.km_final > pontaj.km_start ? pontaj.km_final - pontaj.km_start : 0;
        const sumaKm = kmParcursi * config.precio_km;
        
        const sumaContainere = pontaj.contenedores * config.precio_contenedor;
        const sumaFestivos = pontaj.festivos.reduce((acc, f) => acc + f.suma, 0);

        const totalBruto = config.salario_base + config.antiguedad + sumaDesayuno + sumaCena + sumaProcena + sumaKm + sumaContainere + sumaFestivos;

        setRezultat({
            totalBruto: totalBruto.toFixed(2),
            detalii: {
                'Salario Base': config.salario_base.toFixed(2),
                'Antigüedad': config.antiguedad.toFixed(2),
                'Total Desayuno': `${totalDesayuno} días x ${config.precio_desayuno}€ = ${sumaDesayuno.toFixed(2)}€`,
                'Total Cena': `${totalCena} días x ${config.precio_cena}€ = ${sumaCena.toFixed(2)}€`,
                'Total Procena': `${totalProcena} días x ${config.precio_procena}€ = ${sumaProcena.toFixed(2)}€`,
                'Total Kilómetros': `${kmParcursi} km x ${config.precio_km}€ = ${sumaKm.toFixed(2)}€`,
                'Total Contenedores': `${pontaj.contenedores} uds. x ${config.precio_contenedor}€ = ${sumaContainere.toFixed(2)}€`,
                'Total Festivos/Plus': `${sumaFestivos.toFixed(2)}€`,
            }
        });
    };

    const handleSaveConfig = async () => {
        const { error } = await supabase
            .from('profiles')
            .update({ config_nomina: config })
            .eq('id', user.id);
        if (error) alert('Error al guardar la configuración: ' + error.message);
        else alert('Configuración guardada con éxito!');
    };

    const handleSaveToArchive = async () => {
        if (!rezultat) return;
        const { error } = await supabase.from('nominas_calculadas').insert({
            user_id: user.id,
            mes: currentDate.getMonth() + 1,
            an: currentDate.getFullYear(),
            total_bruto: parseFloat(rezultat.totalBruto),
            detalles: rezultat.detalii
        });
        if (error) alert('Error al guardar en el archivo: ' + error.message);
        else {
            alert('Cálculo guardado en el archivo.');
            setRezultat(null); // Resetare rezultat după salvare
        }
    };

    const handleViewArchive = async () => {
        setIsArchiveOpen(true);
        setIsLoadingArchive(true);
        const { data, error } = await supabase
            .from('nominas_calculadas')
            .select('*')
            .eq('user_id', user.id)
            .order('an', { ascending: false })
            .order('mes', { ascending: false });
        
        if (error) alert("Error al cargar el archivo: " + error.message);
        else setArchiveData(data);
        setIsLoadingArchive(false);
    };

    // --- Logică pentru calendar ---
    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=Duminică, 1=Luni
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Ajustare pentru a începe săptămâna Luni
        
        let days = [];
        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`placeholder-start-${i}`} className={`${styles.calendarDay} ${styles.placeholderDay}`}></div>);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(<CalendarDay key={i} day={i} data={pontaj.zilePontaj[i - 1]} onToggle={(field) => handlePontajToggle(i - 1, field)} />);
        }
        // Adaugă zile goale la final pentru a umple rândul
        while (days.length % 7 !== 0) {
            days.push(<div key={`placeholder-end-${days.length}`} className={`${styles.calendarDay} ${styles.placeholderDay}`}></div>);
        }
        return days;
    };
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    return (
        <Layout backgroundClassName="profile-background">
            <div className={styles.header}>
                <h1>Calculadora de Nómina</h1>
                <button className={styles.archiveButton} onClick={handleViewArchive}><ArchiveIcon /> Ver Archivo</button>
            </div>

            <div className={styles.mainContainer}>
                {/* --- Coloana Stânga: Configurare și Calcul --- */}
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
                            <p>Plusuri adăugate: {pontaj.festivos.map(f => `${f.suma}€`).join(', ')}</p>
                        </div>
                    </div>

                    <button onClick={handleCalculate} className={styles.calculateButton}>Calcular Nómina</button>

                </div>

                {/* --- Coloana Dreapta: Calendar și Rezultat --- */}
                <div className={styles.column}>
                    <div className={styles.card}>
                        <div className={styles.calendarHeader}>
                            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}>&lt;</button>
                            <h3>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
                            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}>&gt;</button>
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
                                {Object.entries(rezultat.detalii).map(([key, value]) => (
                                    <li key={key}><span>{key}</span><span>{value}</span></li>
                                ))}
                            </ul>
                            <button onClick={handleSaveToArchive} className={styles.saveButton}>Guardar en Archivo</button>
                        </div>
                    )}
                </div>
            </div>

            {/* --- MODAL PENTRU ARHIVĂ --- */}
            {isArchiveOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>Archivo de Nóminas</h3>
                            <button onClick={() => setIsArchiveOpen(false)} className={styles.closeButton}><CloseIcon /></button>
                        </div>
                        <div className={styles.modalBody}>
                            {isLoadingArchive ? <p>Cargando archivo...</p> : (
                                archiveData.length > 0 ? archiveData.map(item => (
                                    <div key={item.id} className={styles.archiveItem}>
                                        <div className={styles.archiveHeader}>
                                            <span>{monthNames[item.mes - 1]} {item.an}</span>
                                            <span className={styles.archiveTotal}>{item.total_bruto.toFixed(2)} €</span>
                                        </div>
                                        <ul className={styles.resultDetails}>
                                          {Object.entries(item.detalles).map(([key, value]) => (
                                              <li key={key}><span>{key}</span><span>{value}</span></li>
                                          ))}
                                        </ul>
                                    </div>
                                )) : <p>No hay cálculos guardados en el archivo.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}

export default CalculadoraNomina;


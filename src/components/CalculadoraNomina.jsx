// src/components/CalculadoraNomina.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import Layout from './Layout';
import styles from './CalculadoraNomina.module.css';

/* ------------ Icons ------------ */
const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
);
const ArchiveIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8v13H3V8"></path><path d="M1 3h22v5H1z"></path><path d="M10 12h4"></path></svg>
);

/* ------------ Helpers ------------ */
const CalendarDay = ({ day, data, onClick, isPlaceholder }) => {
  const hasData = !isPlaceholder && (
    data.desayuno || data.cena || data.procena ||
    ((+data.km_final || 0) > (+data.km_iniciar || 0)) ||
    (data.contenedores || 0) > 0 ||
    (data.suma_festivo || 0) > 0
  );
  const cls = `${styles.calendarDay} ${isPlaceholder ? styles.placeholderDay : ''} ${hasData ? styles.hasData : ''}`;
  return (
    <div className={cls} onClick={!isPlaceholder ? onClick : undefined}>
      <span className={styles.dayNumber}>{day}</span>
    </div>
  );
};

const CustomNumberInput = ({ label, name, value, onDataChange, min = 0, step = 1 }) => {
  const inc = () => onDataChange(name, Number(value || 0) + step);
  const dec = () => {
    const nv = Number(value || 0) - step;
    onDataChange(name, nv < min ? min : nv);
  };
  const onType = (e) => {
    const raw = e.target.value;
    if (raw === '') return onDataChange(name, '');     // permite să ștergi 0 complet
    const n = Number(raw);
    if (!Number.isNaN(n)) onDataChange(name, n);
  };
  return (
    <div className={styles.inputGroup}>
      <label>{label}</label>
      <div className={styles.customNumberInput}>
        <button type="button" onClick={dec} className={styles.stepperButton}>-</button>
        <input
          type="number"
          value={value === '' ? '' : (value ?? 0)}
          onChange={onType}
          className={styles.numericDisplay}
        />
        <button type="button" onClick={inc} className={styles.stepperButton}>+</button>
      </div>
    </div>
  );
};

const ParteDiarioModal = ({ isOpen, onClose, data, onDataChange, onToggleChange, day, monthName, year }) => {
  if (!isOpen) return null;
  const onNum = (e) => {
    const { name, value } = e.target;
    onDataChange(name, value === '' ? '' : Number(value));
  };
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Parte Diario — {day} {monthName} {year}</h3>
          <button className={styles.closeIcon} onClick={onClose}><CloseIcon /></button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.parteDiarioSection}>
            <h4>Dietas</h4>
            <div className={styles.checkboxGroupModal}>
              <label><input type="checkbox" checked={!!data.desayuno} onChange={() => onToggleChange('desayuno')} /> Desayuno</label>
              <label><input type="checkbox" checked={!!data.cena} onChange={() => onToggleChange('cena')} /> Cena</label>
              <label><input type="checkbox" checked={!!data.procena} onChange={() => onToggleChange('procena')} /> Procena</label>
            </div>
          </div>

          <div className={styles.parteDiarioSection}>
            <h4>Kilómetros</h4>
            <div className={styles.inputGrid}>
              <div className={styles.inputGroup}>
                <label>KM Iniciar</label>
                <input type="number" name="km_iniciar" value={data.km_iniciar ?? ''} onChange={onNum}/>
              </div>
              <div className={styles.inputGroup}>
                <label>KM Final</label>
                <input type="number" name="km_final" value={data.km_final ?? ''} onChange={onNum}/>
              </div>
            </div>
          </div>

          <div className={styles.parteDiarioSection}>
            <h4>Actividades especiales</h4>
            <div className={styles.inputGrid}>
              <CustomNumberInput label="Contenedores barridos" name="contenedores" value={data.contenedores ?? 0} onDataChange={onDataChange} />
              <CustomNumberInput label="Suma festivo/plus (€)" name="suma_festivo" value={data.suma_festivo ?? 0} onDataChange={onDataChange} step={10} />
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.actionMini} type="button" onClick={onClose}>Guardar y cerrar</button>
        </div>
      </div>
    </div>
  );
};

/* ------------ Main component ------------ */
export default function CalculadoraNomina() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const search = new URLSearchParams(location.search);
  const preselectUserId = search.get('user_id'); // vine din ChoferFinderProfile

  const [currentDate, setCurrentDate] = useState(new Date());
  const [drivers, setDrivers] = useState([]);        // {user_id, nombre_completo}
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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
  const [result, setResult] = useState(null);

  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [archiveData, setArchiveData] = useState([]);

  const [isParteOpen, setIsParteOpen] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(null);

  const monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const targetUserId = profile?.role === 'dispecer' ? selectedDriver : user?.id;
  const ready = (profile?.role === 'dispecer' && selectedDriver) || profile?.role === 'sofer';

  /* preselect din query (?user_id=...) pentru dispecer */
  useEffect(() => {
    if (profile?.role === 'dispecer' && preselectUserId) {
      setSelectedDriver(preselectUserId);
    }
  }, [profile?.role, preselectUserId]);

  /* load drivers for dispatcher */
  useEffect(() => {
    if (profile?.role !== 'dispecer') return;
    (async () => {
      const { data, error } = await supabase
        .from('nomina_perfiles')
        .select('user_id, nombre_completo')
        .order('nombre_completo', { ascending: true });
      if (!error) setDrivers(data || []);
    })();
  }, [profile]);

  /* load config + draft for target user & month */
  useEffect(() => {
    if (!targetUserId) {
      setIsLoading(false);
      setConfig(defaultConfig);
      setPontaj(defaultPontaj);
      setResult(null);
      return;
    }
    (async () => {
      setIsLoading(true);
      const { data: prof } = await supabase
        .from('nomina_perfiles')
        .select('config_nomina')
        .eq('user_id', targetUserId)
        .maybeSingle();

      setConfig(prof?.config_nomina ?? defaultConfig);

      const y = currentDate.getFullYear();
      const m = currentDate.getMonth() + 1;
      const { data: dr } = await supabase
        .from('pontaje_curente')
        .select('pontaj_complet')
        .eq('user_id', targetUserId)
        .eq('an', y)
        .eq('mes', m)
        .maybeSingle();

      setPontaj(dr?.pontaj_complet ?? defaultPontaj);
      setResult(null);
      setIsLoading(false);
    })();
  }, [targetUserId, currentDate, defaultConfig, defaultPontaj]);

  /* debounced auto-save draft -> triggers DB to update km via trigger */
  useEffect(() => {
    if (!targetUserId) return;
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth() + 1;
    const t = setTimeout(async () => {
      await supabase.from('pontaje_curente').upsert(
        { user_id: targetUserId, an: y, mes: m, pontaj_complet: pontaj },
        { onConflict: 'user_id,an,mes' }
      );
      // trigger-ul din DB va actualiza camioane.kilometros dacă km_final a crescut
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pontaj, targetUserId, currentDate]);

  /* handlers */
  const onDriverChange = (e) => setSelectedDriver(e.target.value || null);
  const onConfigChange = (e) => {
    const { name, value } = e.target;
    // permite '', altfel număr
    setConfig((prev) => ({ ...prev, [name]: value === '' ? '' : Number(value) }));
  };

  const openParte = (idx) => { setSelectedDayIndex(idx); setIsParteOpen(true); };
  const closeParte = () => { setSelectedDayIndex(null); setIsParteOpen(false); };

  const onParteValue = (name, value) => {
    setPontaj((prev) => {
      const arr = [...prev.zilePontaj];
      arr[selectedDayIndex] = { ...arr[selectedDayIndex], [name]: value };
      return { ...prev, zilePontaj: arr };
    });
  };
  const onParteToggle = (field) => {
    setPontaj((prev) => {
      const arr = [...prev.zilePontaj];
      arr[selectedDayIndex] = { ...arr[selectedDayIndex], [field]: !arr[selectedDayIndex][field] };
      return { ...prev, zilePontaj: arr };
    });
  };

  const saveConfig = async () => {
    if (!targetUserId) return;
    const coerce = (v) => (v === '' ? 0 : Number(v));
    const clean = {
      salario_base: coerce(config.salario_base),
      antiguedad: coerce(config.antiguedad),
      precio_dia_trabajado: coerce(config.precio_dia_trabajado),
      precio_desayuno: coerce(config.precio_desayuno),
      precio_cena: coerce(config.precio_cena),
      precio_procena: coerce(config.precio_procena),
      precio_km: coerce(config.precio_km),
      precio_contenedor: coerce(config.precio_contenedor),
    };
    const { error } = await supabase
      .from('nomina_perfiles')
      .update({ config_nomina: clean })
      .eq('user_id', targetUserId);
    if (!error) alert('¡Configuración guardada!');
  };

  const calc = () => {
    let d=0,c=0,p=0, km=0, cont=0, plus=0;
    const worked = new Set();
    pontaj.zilePontaj.forEach((z, i) => {
      if (z.desayuno) d++;
      if (z.cena) c++;
      if (z.procena) p++;
      const k = (+z.km_final || 0) - (+z.km_iniciar || 0);
      if (k>0) km += k;
      cont += (z.contenedores || 0);
      plus += (z.suma_festivo || 0);
      if (z.desayuno || z.cena || z.procena || k>0 || (z.contenedores||0)>0 || (z.suma_festivo||0)>0) worked.add(i);
    });
    const dz = worked.size;
    const sDes = d * (Number(config.precio_desayuno) || 0);
    const sCen = c * (Number(config.precio_cena) || 0);
    const sPro = p * (Number(config.precio_procena) || 0);
    const sKm  = km * (Number(config.precio_km) || 0);
    const sCon = cont * (Number(config.precio_contenedor) || 0);
    const sDia = dz * (Number(config.precio_dia_trabajado) || 0);
    const total = (Number(config.salario_base) || 0) + (Number(config.antiguedad) || 0) + sDes + sCen + sPro + sKm + sCon + sDia + plus;

    setResult({
      totalBruto: total.toFixed(2),
      detalii_calcul: {
        'Salario Base': `${(Number(config.salario_base) || 0).toFixed(2)}€`,
        'Antigüedad': `${(Number(config.antiguedad) || 0).toFixed(2)}€`,
        'Total Días Trabajados': `${dz} días x ${(Number(config.precio_dia_trabajado) || 0).toFixed(2)}€ = ${sDia.toFixed(2)}€`,
        'Total Desayunos': `${d} x ${(Number(config.precio_desayuno) || 0).toFixed(2)}€ = ${sDes.toFixed(2)}€`,
        'Total Cenas': `${c} x ${(Number(config.precio_cena) || 0).toFixed(2)}€ = ${sCen.toFixed(2)}€`,
        'Total Procenas': `${p} x ${(Number(config.precio_procena) || 0).toFixed(2)}€ = ${sPro.toFixed(2)}€`,
        'Total Kilómetros': `${km} km x ${(Number(config.precio_km) || 0).toFixed(2)}€ = ${sKm.toFixed(2)}€`,
        'Total Contenedores': `${cont} x ${(Number(config.precio_contenedor) || 0).toFixed(2)}€ = ${sCon.toFixed(2)}€`,
        'Total Festivos/Plus': `${plus.toFixed(2)}€`,
      },
      sumar_activitate: {
        'Días Trabajados': dz,
        'Total Desayunos': d,
        'Total Cenas': c,
        'Total Procenas': p,
        'Kilómetros Recorridos': km,
        'Contenedores Barridos': cont,
        'Suma Festivos/Plus (€)': plus,
      }
    });
  };

  const saveToArchive = async () => {
    if (!targetUserId || !result) return;
    const { error } = await supabase.from('nominas_calculadas').insert({
      user_id: targetUserId,
      mes: currentDate.getMonth() + 1,
      an: currentDate.getFullYear(),
      total_bruto: Number(result.totalBruto),
      detalles: result.sumar_activitate
    });
    if (!error) { alert('Cálculo guardado en el archivo.'); setResult(null); }
  };

  const openArchive = async () => {
    if (!targetUserId) { alert('Seleccione un conductor.'); return; }
    setIsArchiveOpen(true);
    setArchiveBusy(true);
    const { data } = await supabase
      .from('nominas_calculadas')
      .select('*')
      .eq('user_id', targetUserId)
      .order('an', { ascending: false })
      .order('mes', { ascending: false });
    setArchiveData(data || []);
    setArchiveBusy(false);
  };

  /* calendar */
  const renderCalendar = () => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const first = new Date(y, m, 1).getDay();      // 0=Do
    const daysIn = new Date(y, m + 1, 0).getDate();
    const start = first === 0 ? 6 : first - 1;     // Por interfaz L->D
    const cells = [];
    for (let i=0; i<start; i++) cells.push(<div key={`ph-s-${i}`} className={`${styles.calendarDay} ${styles.placeholderDay}`} />);
    for (let d=1; d<=daysIn; d++) {
      cells.push(
        <CalendarDay
          key={d}
          day={d}
          data={pontaj.zilePontaj[d-1]}
          onClick={() => openParte(d-1)}
        />
      );
    }
    while (cells.length % 7 !== 0) cells.push(<div key={`ph-e-${cells.length}`} className={`${styles.calendarDay} ${styles.placeholderDay}`} />);
    return cells;
  };

  if (isLoading) {
    return <Layout><div className={styles.card}><p>Cargando datos...</p></div></Layout>;
  }

  const driverLabel = (uid) => drivers.find(d => d.user_id === uid)?.nombre_completo || '';

  return (
    <Layout backgroundClassName="calculadora-background">
      <div className={styles.header}>
        <h1>Calculadora de Nómina {profile?.role==='dispecer' && selectedDriver ? `— ${driverLabel(selectedDriver)}` : ''}</h1>
        <button className={styles.archiveButton} onClick={openArchive} disabled={!ready}>
          <ArchiveIcon/> Ver Archivo
        </button>
      </div>

      {profile?.role === 'dispecer' && (
        <div className={styles.dispatcherSelector}>
          <label htmlFor="driver">Seleccione un Conductor:</label>
          <select
            id="driver"
            onChange={onDriverChange}
            value={selectedDriver || ''}
          >
            <option value="" disabled>-- Elija un conductor --</option>
            {drivers.map(d => (
              <option key={d.user_id} value={d.user_id}>{d.nombre_completo}</option>
            ))}
          </select>
        </div>
      )}

      {ready ? (
        <div className={styles.mainContainer}>
          <div className={styles.column}>
            <div className={styles.card}>
              <h3>1. Configuración de Contrato</h3>
              <div className={styles.inputGrid}>
                <div className={styles.inputGroup}><label>Salario Base (€)</label><input type="number" name="salario_base" value={config.salario_base === '' ? '' : config.salario_base} onChange={onConfigChange} /></div>
                <div className={styles.inputGroup}><label>Antigüedad (€)</label><input type="number" name="antiguedad" value={config.antiguedad === '' ? '' : config.antiguedad} onChange={onConfigChange} /></div>
                <div className={styles.inputGroup}><label>Precio Día Trabajado (€)</label><input type="number" name="precio_dia_trabajado" value={config.precio_dia_trabajado === '' ? '' : config.precio_dia_trabajado} onChange={onConfigChange} /></div>
                <div className={styles.inputGroup}><label>Precio Desayuno (€)</label><input type="number" name="precio_desayuno" value={config.precio_desayuno === '' ? '' : config.precio_desayuno} onChange={onConfigChange} /></div>
                <div className={styles.inputGroup}><label>Precio Cena (€)</label><input type="number" name="precio_cena" value={config.precio_cena === '' ? '' : config.precio_cena} onChange={onConfigChange} /></div>
                <div className={styles.inputGroup}><label>Precio Procena (€)</label><input type="number" name="precio_procena" value={config.precio_procena === '' ? '' : config.precio_procena} onChange={onConfigChange} /></div>
                <div className={styles.inputGroup}><label>Precio/km (€)</label><input type="number" name="precio_km" value={config.precio_km === '' ? '' : config.precio_km} onChange={onConfigChange} /></div>
                <div className={styles.inputGroup}><label>Precio Contenedor (€)</label><input type="number" name="precio_contenedor" value={config.precio_contenedor === '' ? '' : config.precio_contenedor} onChange={onConfigChange} /></div>
              </div>
              <button className={styles.saveButton} onClick={saveConfig}>Guardar configuración</button>
            </div>

            <button className={styles.calculateButton} onClick={calc}>Calcular nómina</button>
          </div>

          <div className={styles.column}>
            <div className={styles.card}>
              <div className={styles.calendarHeader}>
                <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth()-1, 1))}>&lt;</button>
                <h3>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
                <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth()+1, 1))}>&gt;</button>
              </div>
              <p className={styles.calendarHint}>Haz clic en un día para añadir el parte diario.</p>
              <div className={styles.calendarWeekdays}>
                <div>Lu</div><div>Ma</div><div>Mi</div><div>Ju</div><div>Vi</div><div>Sá</div><div>Do</div>
              </div>
              <div className={styles.calendarGrid}>{renderCalendar()}</div>
            </div>

            {result && (
              <div className={`${styles.card} ${styles.resultCard}`}>
                <h3>Resultado del Cálculo</h3>
                <p className={styles.totalBruto}>{result.totalBruto} €</p>
                <ul className={styles.resultDetails}>
                  {Object.entries(result.detalii_calcul).map(([k,v]) => (
                    <li key={k}><span>{k}</span><span>{v}</span></li>
                  ))}
                </ul>
                <button className={styles.saveButton} onClick={saveToArchive}>Guardar cálculo</button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={styles.card}>
          <p>Por favor, seleccione un conductor para continuar.</p>
        </div>
      )}

      <ParteDiarioModal
        isOpen={isParteOpen}
        onClose={closeParte}
        data={selectedDayIndex !== null ? pontaj.zilePontaj[selectedDayIndex] : {}}
        onDataChange={onParteValue}
        onToggleChange={onParteToggle}
        day={selectedDayIndex !== null ? selectedDayIndex + 1 : ''}
        monthName={monthNames[currentDate.getMonth()]}
        year={currentDate.getFullYear()}
      />

      {isArchiveOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Archivo de Nóminas {profile?.role==='dispecer' && selectedDriver && `— ${driverLabel(selectedDriver)}`}</h3>
              <button className={styles.closeIcon} onClick={()=>setIsArchiveOpen(false)}><CloseIcon/></button>
            </div>
            <div className={styles.archiveModalBody}>
              {archiveBusy ? <p>Cargando archivo...</p> : (
                archiveData.length ? archiveData.map(item => (
                  <div key={item.id} className={styles.archiveItem}>
                    <div className={styles.archiveHeader}>
                      <span>{monthNames[item.mes - 1]} {item.an}</span>
                      <span className={styles.archiveTotal}>{Number(item.total_bruto).toFixed(2)}€</span>
                    </div>
                    <ul className={styles.resultDetails}>
                      {item.detalles && Object.entries(item.detalles).map(([k,v]) => (
                        <li key={k}><span>{k}</span><span>{String(v)}</span></li>
                      ))}
                    </ul>
                  </div>
                )) : <p>No hay nóminas guardadas en el archivo.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
// src/components/CalculadoraNomina.jsx
import React, { useMemo, useState } from 'react';
import Layout from './Layout';
import styles from './CalculadoraNominas.module.css';

import NominaConfigCard from './NominaConfigCard';
import NominaCalendar from './NominaCalendar';
import ParteDiarioModal from './ParteDiarioModal';
import NominaResultCard from './NominaResultCard';

export default function CalculadoraNomina() {
  const monthNames = useMemo(
    () => ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"],
    []
  );

  const [currentDate, setCurrentDate] = useState(new Date());

  // Config implicit (poți ajusta valorile)
  const defaultConfig = useMemo(() => ({
    salario_base: 1050,
    antiguedad: 0,
    precio_dia_trabajado: 20,
    precio_desayuno: 10,
    precio_cena: 15,
    precio_procena: 5,
    precio_km: 0.05,
    precio_contenedor: 6,
  }), []);

  // Generează pontajul pentru luna curentă (fără DB)
  const makePontajForMonth = (date) => {
    const y = date.getFullYear();
    const m = date.getMonth();
    const days = new Date(y, m + 1, 0).getDate();
    return Array.from({ length: days }, () => ({
      desayuno: false,
      cena: false,
      procena: false,
      km_iniciar: '',
      km_final: '',
      contenedores: 0,
      suma_festivo: 0
    }));
  };

  const [config, setConfig] = useState(defaultConfig);
  const [zilePontaj, setZilePontaj] = useState(makePontajForMonth(currentDate));

  // Modal parte-diario (editare pe zi)
  const [isParteOpen, setIsParteOpen] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(null);

  const openParte = (idx) => { setSelectedDayIndex(idx); setIsParteOpen(true); };
  const closeParte = () => { setSelectedDayIndex(null); setIsParteOpen(false); };

  const onParteValue = (name, value) => {
    setZilePontaj(prev => {
      const arr = [...prev];
      arr[selectedDayIndex] = { ...arr[selectedDayIndex], [name]: value };
      return arr;
    });
  };
  const onParteToggle = (field) => {
    setZilePontaj(prev => {
      const arr = [...prev];
      arr[selectedDayIndex] = { ...arr[selectedDayIndex], [field]: !arr[selectedDayIndex][field] };
      return arr;
    });
  };

  // Navigare lună (resetăm foaia pentru lună nouă – local, fără DB)
  const goPrevMonth = () => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    setCurrentDate(d);
    setZilePontaj(makePontajForMonth(d));
  };
  const goNextMonth = () => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    setCurrentDate(d);
    setZilePontaj(makePontajForMonth(d));
  };

  // Calcul rezultat
  const [result, setResult] = useState(null);
  const calc = () => {
    let d=0,c=0,p=0, km=0, cont=0, plus=0;
    const worked = new Set();

    zilePontaj.forEach((z, i) => {
      if (z.desayuno) d++;
      if (z.cena) c++;
      if (z.procena) p++;

      const ki = +z.km_iniciar || 0;
      const kf = +z.km_final || 0;
      const k = kf - ki;
      if (k > 0) km += k;

      cont += (z.contenedores || 0);
      plus += (z.suma_festivo || 0);

      if (z.desayuno || z.cena || z.procena || k>0 || (z.contenedores||0)>0 || (z.suma_festivo||0)>0) {
        worked.add(i);
      }
    });

    const dz = worked.size;

    const sDes = d * (Number(config.precio_desayuno) || 0);
    const sCen = c * (Number(config.precio_cena) || 0);
    const sPro = p * (Number(config.precio_procena) || 0);
    const sKm  = km * (Number(config.precio_km) || 0);
    const sCon = cont * (Number(config.precio_contenedor) || 0);
    const sDia = dz * (Number(config.precio_dia_trabajado) || 0);

    const total = (Number(config.salario_base) || 0)
      + (Number(config.antiguedad) || 0)
      + sDes + sCen + sPro + sKm + sCon + sDia + plus;

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

  return (
    <Layout backgroundClassName="calculadora-background">
      <div className={styles.header}>
        <h1>Calculadora de Nómina</h1>
      </div>

      <div className={styles.mainContainer}>
        <div className={styles.column}>
          <NominaConfigCard
            config={config}
            onChange={setConfig}
          />
          <button className={styles.calculateButton} onClick={calc}>
            Calcular nómina
          </button>
        </div>

        <div className={styles.column}>
          <div className={styles.card}>
            <div className={styles.calendarHeader}>
              <button onClick={goPrevMonth}>&lt;</button>
              <h3>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
              <button onClick={goNextMonth}>&gt;</button>
            </div>
            <p className={styles.calendarHint}>Haz clic en un día para añadir el parte diario.</p>

            <NominaCalendar
              date={currentDate}
              zilePontaj={zilePontaj}
              onPickDay={openParte}
            />
          </div>

          {result && <NominaResultCard result={result} />}
        </div>
      </div>

      <ParteDiarioModal
        isOpen={isParteOpen}
        onClose={closeParte}
        data={selectedDayIndex !== null ? zilePontaj[selectedDayIndex] : {}}
        onDataChange={onParteValue}
        onToggleChange={onParteToggle}
        day={selectedDayIndex !== null ? selectedDayIndex + 1 : ''}
        monthName={monthNames[currentDate.getMonth()]}
        year={currentDate.getFullYear()}
      />
    </Layout>
  );
}
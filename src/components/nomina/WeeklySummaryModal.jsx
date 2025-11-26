import React, { useMemo, useCallback } from 'react';
import { useAuth } from '../../AuthContext';
import styles from './WeeklySummaryModal.module.css';

/**
 * Helper: întoarce luni pentru săptămâna dintr-o dată dată (ISO week, luni=0)
 */
function getMonday(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (x.getDay() + 6) % 7; // Luni=0 ... Duminică=6
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Construiește structura săptămânii (Lu–Do) din currentDate & zilePontaj
 *  - currentDate = ziua selectată în „Día X”
 *  - zilePontaj = array pentru luna curentă (index 0 = ziua 1)
 *
 * Notă: zilele care ies în afara lunii au datele goale (nu avem pontaj pentru luna următoare/anterior).
 */
export function buildWeekData(currentDate, zilePontaj, mondayOverride = null) {
  const monday = mondayOverride ? new Date(mondayOverride) : getMonday(currentDate);
  const days = [];
  let kmInitMonday = 0;
  let kmFinalWeek = 0;
  let kmWeekTotal = 0;

  // Luni–Duminică (7 zile)
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);

    const sameMonth =
      d.getFullYear() === currentDate.getFullYear() &&
      d.getMonth() === currentDate.getMonth();

    const idx = sameMonth ? d.getDate() - 1 : null;
    const zi = idx != null && zilePontaj[idx] ? zilePontaj[idx] : {};

    const km_i = Number(zi.km_iniciar || 0);
    const km_f = Number(zi.km_final || 0);
    const km_d = Math.max(0, km_f - km_i);

    if (!kmInitMonday && km_i) kmInitMonday = km_i;
    if (km_f) kmFinalWeek = km_f;

    kmWeekTotal += km_d;

    days.push({
      date: d,
      label: d.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: '2-digit',
        month: 'short',
      }),
      des: !!zi.desayuno,
      cen: !!zi.cena,
      pro: !!zi.procena,
      festivo: Number(zi.suma_festivo || 0),
      km_iniciar: km_i,
      km_final: km_f,
      km_dia: km_d,
      contenedores: Number(zi.contenedores || 0),
      camion_matricula: zi.camion_matricula || null,
      observaciones: '',
    });
  }

  return {
    monday,
    friday: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6), // Duminică
    days,
    kmInitMonday,
    kmFinalFriday: kmFinalWeek,
    kmWeekTotal: Math.max(0, kmWeekTotal),
  };
}

// **SEGMENTARE**: închidem partea săptămânală când se schimbă camionul
function cutDaysByTruck(days) {
  if (!days || !days.length) return { effectiveDays: [], cutIndex: 0 };

  const baseTruck = days.find(d => d.camion_matricula)?.camion_matricula;
  if (!baseTruck) {
    // niciun camion setat – nu tăiem nimic
    return { effectiveDays: days, cutIndex: days.length };
  }

  let cutIndex = days.length;
  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    if (d.camion_matricula && d.camion_matricula !== baseTruck) {
      cutIndex = i; // ne oprim înainte de primul camion diferit
      break;
    }
  }

  return {
    effectiveDays: days.slice(0, cutIndex),
    cutIndex,
    baseTruck,
  };
}

export default function WeeklySummaryModal({ isOpen, onClose, weekData }) {
  const { profile } = useAuth();

  if (!isOpen || !weekData) return null;

  const chofer = useMemo(
    () =>
      profile?.nombre_completo ||
      profile?.full_name ||
      profile?.username ||
      '—',
    [profile]
  );

  const { effectiveDays, cutIndex, baseTruck } = useMemo(
    () => cutDaysByTruck(weekData.days || []),
    [weekData]
  );

  // Camión afişat: camion săptămână (din zile) sau, dacă nu există, din profil
  const camionSemana = useMemo(() => {
    const fromDays = baseTruck || effectiveDays.find(d => d.camion_matricula)?.camion_matricula;
    return (
      fromDays ||
      profile?.camioane?.matricula ||
      profile?.matricula ||
      profile?.camion ||
      '—'
    );
  }, [baseTruck, effectiveDays, profile]);

  const rangoSemana = useMemo(() => {
    const fmt = (d) =>
      d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    return `${fmt(weekData.monday)} — ${fmt(weekData.friday)}`;
  }, [weekData]);

  // Recalculăm KMs doar pe zilele „valabile” (până la schimbarea camionului)
  const kmStats = useMemo(() => {
    if (!effectiveDays.length) {
      return {
        kmIni: weekData.kmInitMonday || 0,
        kmFin: weekData.kmFinalFriday || 0,
        kmTotal: weekData.kmWeekTotal || 0,
      };
    }

    let kmIni = 0;
    let kmFin = 0;
    let total = 0;

    effectiveDays.forEach((d) => {
      const kmi = Number(d.km_iniciar || 0);
      const kmf = Number(d.km_final || 0);
      const kmd = Math.max(0, kmf - kmi);

      if (!kmIni && kmi) kmIni = kmi;
      if (kmf) kmFin = kmf;
      total += kmd;
    });

    return {
      kmIni,
      kmFin,
      kmTotal: total,
    };
  }, [effectiveDays, weekData]);

  // PDF – HOJA DE GASTOS SEMANA (Lunes–Domingo, se taie când se schimbă camionul)
  const handleGeneratePDF = useCallback(
    async () => {
      try {
        const { default: jsPDF } = await import('jspdf');
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });

        const W = doc.internal.pageSize.getWidth();
        const M = 12;
        let y = M;

        const allDays = weekData.days || [];

        // Titlu
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('HOJA DE GASTOS SEMANA', W / 2, y, { align: 'center' });
        y += 8;

        // Info săptămână
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Semana: ${rangoSemana}`, W - M, y, { align: 'right' });
        y += 8;

        // Tabel L–D
        const colDia = 40;
        const colAncho = (W - M * 2 - colDia) / 4;
        const rowAlt = 7;

        // Header tabel
        doc.setFont('helvetica', 'bold');
        doc.setDrawColor(0);
        doc.setLineWidth(0.2);

        let x = M;
        doc.rect(x, y, colDia, rowAlt, 'S');
        doc.text('DÍA', x + 2, y + 4);
        x += colDia;

        const headers = ['DESAYUNO', 'CENA', 'PERNOCTA', 'OTROS'];
        headers.forEach((h) => {
          doc.rect(x, y, colAncho, rowAlt, 'S');
          doc.text(h, x + colAncho / 2, y + 4, { align: 'center' });
          x += colAncho;
        });

        y += rowAlt;

        const labels = [
          'LUNES',
          'MARTES',
          'MIÉRCOLES',
          'JUEVES',
          'VIERNES',
          'SÁBADO',
          'DOMINGO',
        ];

        doc.setFont('helvetica', 'normal');

        labels.forEach((label, idx) => {
          // dacă idx >= cutIndex => săptămâna se consideră „închisă” (schimbare camion) => rând gol
          const d = idx < cutIndex ? allDays[idx] || {} : {};

          x = M;
          doc.rect(x, y, colDia, rowAlt, 'S');
          doc.text(label, x + 2, y + 4);
          x += colDia;

          // DESAYUNO
          doc.rect(x, y, colAncho, rowAlt, 'S');
          if (d.des && idx < cutIndex) {
            doc.text('X', x + colAncho / 2, y + 4, { align: 'center' });
          }
          x += colAncho;

          // CENA
          doc.rect(x, y, colAncho, rowAlt, 'S');
          if (d.cen && idx < cutIndex) {
            doc.text('X', x + colAncho / 2, y + 4, { align: 'center' });
          }
          x += colAncho;

          // PERNOCTA
          doc.rect(x, y, colAncho, rowAlt, 'S');
          if (d.pro && idx < cutIndex) {
            doc.text('X', x + colAncho / 2, y + 4, { align: 'center' });
          }
          x += colAncho;

          // OTROS (folosim festivo ca exemplu)
          doc.rect(x, y, colAncho, rowAlt, 'S');
          if (d.festivo && idx < cutIndex) {
            doc.text(String(d.festivo), x + colAncho / 2, y + 4, { align: 'center' });
          }

          y += rowAlt;
        });

        y += 6;

        // Secțiune jos: conductor, vehículo, observații, kms
        doc.setFont('helvetica', 'bold');
        doc.text('CONDUCTOR:', M, y);
        doc.setFont('helvetica', 'normal');
        doc.text(String(chofer || '—'), M + 30, y);
        y += 6;

        doc.setFont('helvetica', 'bold');
        doc.text('VEHÍCULO:', M, y);
        doc.setFont('helvetica', 'normal');
        doc.text(String(camionSemana || '—'), M + 30, y);
        y += 8;

        // OBSERVACIONES
        doc.setFont('helvetica', 'bold');
        doc.text('OBSERVACIONES:', M, y);
        y += 4;
        doc.setDrawColor(150);
        doc.rect(M, y, W - 2 * M, 12, 'S');
        y += 18;

        // KMS
        const line = (label, val) => {
          doc.setFont('helvetica', 'bold');
          doc.text(label, M, y);
          doc.setFont('helvetica', 'normal');
          doc.text(String(val || 0), W - M, y, { align: 'right' });
          y += 6;
        };

        line('KMS INICIALES SEMANA', kmStats.kmIni);
        line('KMS FINALIZACIÓN SEMANA', kmStats.kmFin);
        line('TOTAL', kmStats.kmTotal);

        y += 4;

        // Câmpuri extra goale
        const extraLine = (label) => {
          doc.setFont('helvetica', 'bold');
          doc.text(label, M, y);
          doc.setDrawColor(150);
          doc.rect(M + 40, y - 4, W - M * 2 - 40, 6, 'S');
          y += 7;
        };

        extraLine('CARGAS / DESCARGAS');
        extraLine('EXTRAS');
        extraLine('FESTIVOS TRABAJADOS');
        extraLine('SALIDAS EN DOMINGO');
        extraLine('REGRESOS EN SÁBADO');
        extraLine('GAS-OIL (LITROS / KMS)');

        const name = weekData.monday.toISOString().slice(0, 10);
        doc.save(`parte-semanal_${name}.pdf`);
      } catch (err) {
        console.error('PDF semanal error:', err);
        alert('No se pudo generar el PDF.');
      }
    },
    [chofer, camionSemana, rangoSemana, weekData, cutIndex, kmStats]
  );

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.sheet}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.titleBar}>
          <h2>PARTE SEMANAL</h2>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Meta */}
        <div className={styles.meta}>
          <div>
            <span>Chofer:</span> {chofer}
          </div>
          <div>
            <span>Camión:</span> {camionSemana}
          </div>
          <div>
            <span>Semana:</span> {rangoSemana}
          </div>
          <div className={styles.weekHint}>
            {/* hint mic: săptămâna se ia din "Día X" */}
            <small>
              La semana se calcula a partir del <b>Día</b> seleccionado en la pantalla anterior.
            </small>
          </div>
        </div>

        {/* Tabel intern (vizual) */}
        <div className={styles.tableWrap}>
          <div className={`${styles.row} ${styles.header}`}>
            <div className={styles.cDia}>Día</div>
            <div className={styles.cTiny}>D</div>
            <div className={styles.cTiny}>C</div>
            <div className={styles.cTiny}>P</div>
            <div className={styles.cSm}>Festivo (€)</div>
            <div className={styles.cSm}>KM ini.</div>
            <div className={styles.cSm}>KM fin.</div>
            <div className={styles.cSm}>KM día</div>
            <div className={styles.cXs}>Cont.</div>
            <div className={styles.cObs}>Obs.</div>
          </div>

          {weekData.days.map((d, i) => {
            const isCutOff = i >= cutIndex && cutIndex !== 0;
            const row = isCutOff ? {} : d;

            return (
              <div key={i} className={styles.row}>
                <div className={styles.cDia}>{row.label || d.label}</div>
                <div className={styles.cTiny}>{row.des ? 'X' : ''}</div>
                <div className={styles.cTiny}>{row.cen ? 'X' : ''}</div>
                <div className={styles.cTiny}>{row.pro ? 'X' : ''}</div>
                <div className={styles.cSm}>{row.festivo || ''}</div>
                <div className={styles.cSm}>{row.km_iniciar || ''}</div>
                <div className={styles.cSm}>{row.km_final || ''}</div>
                <div className={styles.cSm}>{row.km_dia || ''}</div>
                <div className={styles.cXs}>{row.contenedores || ''}</div>
                <div className={styles.cObs}></div>
              </div>
            );
          })}
        </div>

        {/* Rezumat */}
        <div className={styles.stats}>
          <div>
            KM inicial semana:{' '}
            <b>{kmStats.kmIni || 0}</b>
          </div>
          <div>
            KM final semana:{' '}
            <b>{kmStats.kmFin || 0}</b>
          </div>
          <div>
            KM totales semana:{' '}
            <b className={styles.km}>{kmStats.kmTotal}</b>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.pdfBtn}
            onClick={handleGeneratePDF}
          >
            📄 Generar PDF
          </button>
        </div>
      </div>
    </div>
  );
}
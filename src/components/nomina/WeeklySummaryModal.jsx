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
 *  - mondayOverride: dacă vrei să forțezi o luni anume (Date), altfel ia luni din currentDate
 *
 * NOTE:
 *  - zilePontaj = array-ul pe lună din CalculadoraNomina (1 index = ziua)
 *  - currentDate = ziua selectată (Día X) din lună
 */
export function buildWeekData(currentDate, zilePontaj, mondayOverride = null) {
  const monday = mondayOverride ? new Date(mondayOverride) : getMonday(currentDate);
  const days = [];
  let kmInitMonday = 0;
  let kmFinalWeek = 0;
  let kmWeekTotal = 0;

  // Lu–Do (7 zile)
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);

    const sameMonth =
      d.getFullYear() === currentDate.getFullYear() &&
      d.getMonth() === currentDate.getMonth();
    const idx = sameMonth ? d.getDate() - 1 : null; // index în luna curentă
    const zi = idx != null && zilePontaj[idx] ? zilePontaj[idx] : {};

    const km_i = Number(zi.km_iniciar || 0);
    const km_f = Number(zi.km_final || 0);
    const km_d = Math.max(0, km_f - km_i);

    // Primul km din săptămână (prima zi cu valoare)
    if (!kmInitMonday && km_i) kmInitMonday = km_i;
    // Ultimul km din săptămână (se actualizează mereu când găsim km_final)
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
      observaciones: '', // plasă pentru viitor – rămâne gol în PDF/UI
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

  // Camión săptămânal:
  //  1) prima matriculă non-goală din zile
  //  2) altfel profil camion / matricula
  const camionSemana = useMemo(() => {
    const d = weekData.days || [];
    const fromDays = d.find((day) => day.camion_matricula)?.camion_matricula;
    return (
      fromDays ||
      profile?.camioane?.matricula ||
      profile?.matricula ||
      profile?.camion ||
      '—'
    );
  }, [weekData, profile]);

  const rangoSemana = useMemo(() => {
    const fmt = (d) =>
      d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    return `${fmt(weekData.monday)} — ${fmt(weekData.friday)}`;
  }, [weekData]);

  // PDF – HOJA DE GASTOS SEMANA (Lunes–Domingo, Desayuno/Cena/Pernocta/Otros)
  const handleGeneratePDF = useCallback(
    async () => {
      try {
        const { default: jsPDF } = await import('jspdf');
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });

        const W = doc.internal.pageSize.getWidth();
        const M = 12;
        let y = M;

        const days = weekData.days || [];

        // Titlu sus: HOJA DE GASTOS SEMANA
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('HOJA DE GASTOS SEMANA', W / 2, y, { align: 'center' });
        y += 8;

        // Linie cu info săptămână în dreapta
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Semana: ${rangoSemana}`, W - M, y, { align: 'right' });
        y += 8;

        // Tabel Lunes–Domingo cu DESAYUNO / CENA / PERNOCTA / OTROS
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

        // Rânduri pentru LUNES–DOMINGO (structură ca în foaia ta)
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
          const d = days[idx] || {};
          x = M;

          // Celulă nume zi
          doc.rect(x, y, colDia, rowAlt, 'S');
          doc.text(label, x + 2, y + 4);
          x += colDia;

          // DESAYUNO
          doc.rect(x, y, colAncho, rowAlt, 'S');
          if (d.des) doc.text('X', x + colAncho / 2, y + 4, { align: 'center' });
          x += colAncho;

          // CENA
          doc.rect(x, y, colAncho, rowAlt, 'S');
          if (d.cen) doc.text('X', x + colAncho / 2, y + 4, { align: 'center' });
          x += colAncho;

          // PERNOCTA – folosim procena (pro)
          doc.rect(x, y, colAncho, rowAlt, 'S');
          if (d.pro) doc.text('X', x + colAncho / 2, y + 4, { align: 'center' });
          x += colAncho;

          // OTROS – folosim festivo ca exemplu (poți ajusta ulterior)
          doc.rect(x, y, colAncho, rowAlt, 'S');
          if (d.festivo) {
            doc.text(String(d.festivo), x + colAncho / 2, y + 4, { align: 'center' });
          }

          y += rowAlt;
        });

        y += 6;

        // Secțiunea de jos cu KMs și observații – ca în formular
        const kmIni = weekData.kmInitMonday || 0;
        const kmFin = weekData.kmFinalFriday || 0;
        const kmTotal =
          kmFin && kmIni
            ? Math.max(0, kmFin - kmIni)
            : weekData.kmWeekTotal || 0;

        // CONDUCTOR / VEHÍCULO
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

        // Linie KMS INICIALES / FINALES / TOTAL
        const line = (label, val) => {
          doc.setFont('helvetica', 'bold');
          doc.text(label, M, y);
          doc.setFont('helvetica', 'normal');
          doc.text(String(val || 0), W - M, y, { align: 'right' });
          y += 6;
        };

        line('KMS INICIALES SEMANA', kmIni);
        line('KMS FINALIZACIÓN SEMANA', kmFin);
        line('TOTAL', kmTotal);

        y += 4;

        // Alte câmpuri (goale) – CARGAS/DESCARGAS, EXTRAS etc.
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
    [chofer, camionSemana, rangoSemana, weekData]
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
        </div>

        {/* Tabel intern (vizual, tehnic – pdf-ul este ca foaia de hârtie) */}
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

          {weekData.days.map((d, i) => (
            <div key={i} className={styles.row}>
              <div className={styles.cDia}>{d.label}</div>
              <div className={styles.cTiny}>{d.des ? 'X' : ''}</div>
              <div className={styles.cTiny}>{d.cen ? 'X' : ''}</div>
              <div className={styles.cTiny}>{d.pro ? 'X' : ''}</div>
              <div className={styles.cSm}>{d.festivo || ''}</div>
              <div className={styles.cSm}>{d.km_iniciar || ''}</div>
              <div className={styles.cSm}>{d.km_final || ''}</div>
              <div className={styles.cSm}>{d.km_dia || ''}</div>
              <div className={styles.cXs}>{d.contenedores || ''}</div>
              <div className={styles.cObs}></div>
            </div>
          ))}
        </div>

        {/* Rezumat */}
        <div className={styles.stats}>
          <div>
            KM inicial semana:{' '}
            <b>{weekData.kmInitMonday || 0}</b>
          </div>
          <div>
            KM final semana:{' '}
            <b>{weekData.kmFinalFriday || 0}</b>
          </div>
          <div>
            KM totales semana:{' '}
            <b className={styles.km}>{weekData.kmWeekTotal}</b>
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
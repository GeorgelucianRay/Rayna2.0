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
 * Construiește structura săptămânii (Lu–Vi) din currentDate & zilePontaj
 *  - mondayOverride: dacă vrei să forțezi o luni anume (Date), altfel ia luni din currentDate
 */
export function buildWeekData(currentDate, zilePontaj, mondayOverride = null) {
  const monday = mondayOverride ? new Date(mondayOverride) : getMonday(currentDate);
  const days = [];
  let kmInitMonday = 0;
  let kmFinalFriday = 0;
  let kmWeekTotal = 0;

  for (let i = 0; i < 5; i++) { // Lu-Vi
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);

    const sameMonth = (d.getFullYear() === currentDate.getFullYear()) &&
                      (d.getMonth() === currentDate.getMonth());
    const idx = sameMonth ? d.getDate() - 1 : null; // index în luna curentă
    const zi = idx != null && zilePontaj[idx] ? zilePontaj[idx] : {};

    const km_i = Number(zi.km_iniciar || 0);
    const km_f = Number(zi.km_final || 0);
    const km_d = Math.max(0, km_f - km_i);

    if (i === 0) kmInitMonday = km_i || 0;
    if (i === 4) kmFinalFriday = km_f || 0;
    kmWeekTotal += km_d;

    days.push({
      date: d,
      label: d.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'short' }),
      des: !!zi.desayuno,
      cen: !!zi.cena,
      pro: !!zi.procena,
      festivo: Number(zi.suma_festivo || 0),
      km_iniciar: km_i,
      km_final: km_f,
      km_dia: km_d,
      contenedores: Number(zi.contenedores || 0),
      observaciones: '' // plasă pentru viitor – rămâne gol în PDF/UI
    });
  }

  return {
    monday,
    friday: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 4),
    days,
    kmInitMonday,
    kmFinalFriday,
    kmWeekTotal: Math.max(0, kmWeekTotal)
  };
}

export default function WeeklySummaryModal({ isOpen, onClose, weekData }) {
  const { profile } = useAuth();

  if (!isOpen || !weekData) return null;

  const chofer = useMemo(
    () => profile?.nombre_completo || profile?.full_name || profile?.username || '—',
    [profile]
  );
  const camion = useMemo(
    () => profile?.camioane?.matricula || profile?.matricula || profile?.camion || '—',
    [profile]
  );

  const rangoSemana = useMemo(() => {
    const fmt = (d) => d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
    return `${fmt(weekData.monday)} — ${fmt(weekData.friday)}`;
  }, [weekData]);

  // PDF – tabel fidel: Lu→Vi, coloane D/C/P (X), Festivo, Km ini/fin/zi, Cont.
  const handleGeneratePDF = useCallback(async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();
      const M = 10;
      let y = M;

      // Titlu
      doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
      doc.text('PARTE SEMANAL', M, y);
      doc.setDrawColor(34, 197, 94); doc.setLineWidth(0.5);
      doc.roundedRect(M - 2, y - 7, W - 2 * (M - 2), 11, 2, 2, 'S');
      y += 12;

      // Meta
      const metaLine = (lbl, val) => {
        doc.setFontSize(12); doc.setFont('helvetica', 'bold');
        doc.text(`${lbl}:`, M, y);
        doc.setFont('helvetica', 'normal');
        doc.text(String(val || '—'), M + 28, y);
        y += 7;
      };
      metaLine('Chofer', chofer);
      metaLine('Camión', camion);
      metaLine('Semana', rangoSemana);
      y += 2;

      // Header tabel
      const cols = [
        { key: 'dia',       label: 'Día',        w: 28 },
        { key: 'D',         label: 'D',          w: 10 },
        { key: 'C',         label: 'C',          w: 10 },
        { key: 'P',         label: 'P',          w: 10 },
        { key: 'festivo',   label: 'Festivo (€)',w: 22 },
        { key: 'km_i',      label: 'KM ini.',    w: 22 },
        { key: 'km_f',      label: 'KM fin.',    w: 22 },
        { key: 'km_d',      label: 'KM día',     w: 20 },
        { key: 'conts',     label: 'Cont.',      w: 16 },
        { key: 'obs',       label: 'Obs.',       w: 24 },
      ];
      const headerH = 8;
      let x = M;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      cols.forEach(c => {
        doc.roundedRect(x, y, c.w, headerH, 1.5, 1.5, 'S');
        doc.text(c.label, x + 1.5, y + 5.5);
        x += c.w;
      });
      y += headerH;

      // Linii zile (Lu–Vi)
      const rowH = 8;
      weekData.days.forEach((d) => {
        x = M;
        const vals = {
          dia: d.label,
          D: d.des ? 'X' : '',
          C: d.cen ? 'X' : '',
          P: d.pro ? 'X' : '',
          festivo: d.festivo ? String(d.festivo) : '',
          km_i: d.km_iniciar || '',
          km_f: d.km_final || '',
          km_d: d.km_dia || '',
          conts: d.contenedores || '',
          obs: ''
        };

        doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
        cols.forEach(c => {
          doc.roundedRect(x, y, c.w, rowH, 1.2, 1.2, 'S');
          const txt = String(vals[c.key] ?? '');
          // aliniere: stânga pentru 'dia' și 'obs', centru pt restul
          if (c.key === 'dia' || c.key === 'obs') {
            doc.text(txt, x + 1.6, y + 5.3);
          } else {
            doc.text(txt, x + c.w / 2, y + 5.3, { align: 'center' });
          }
          x += c.w;
        });
        y += rowH;
      });

      // Rezumat jos
      y += 4;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
      doc.text(`KM inicial (Lunes): ${weekData.kmInitMonday}`, M, y);
      y += 6;
      doc.text(`KM final (Viernes): ${weekData.kmFinalFriday}`, M, y);
      y += 6;
      doc.text(`KM totales semana: ${weekData.kmWeekTotal}`, M, y);

      doc.save(`parte-semanal_${weekData.monday.toISOString().slice(0,10)}.pdf`);
    } catch (err) {
      console.error('PDF semanal error:', err);
      alert('No se pudo generar el PDF.');
    }
  }, [chofer, camion, rangoSemana, weekData]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.titleBar}>
          <h2>PARTE SEMANAL</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        {/* Meta */}
        <div className={styles.meta}>
          <div><span>Chofer:</span> {chofer}</div>
          <div><span>Camión:</span> {camion}</div>
          <div><span>Semana:</span> {rangoSemana}</div>
        </div>

        {/* Tabel */}
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
          <div>KM inicial (Lunes): <b>{weekData.kmInitMonday}</b></div>
          <div>KM final (Viernes): <b>{weekData.kmFinalFriday}</b></div>
          <div>KM totales semana: <b className={styles.km}>{weekData.kmWeekTotal}</b></div>
        </div>

        <div className={styles.actions}>
          <button className={styles.pdfBtn} onClick={handleGeneratePDF}>📄 Generar PDF</button>
        </div>
      </div>
    </div>
  );
}
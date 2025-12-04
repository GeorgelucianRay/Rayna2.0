// src/components/nomina/WeeklySummaryModal.jsx
import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext';
import styles from './WeeklySummaryModal.module.css';

export default function WeeklySummaryModal({
  isOpen,
  onClose,
  weeks,
  initialIndex = 0,
  onChangeWeek,
}) {
  /*
   * Keep hook calls at top-level so that their order remains consistent between
   * renders. Even if the modal is closed or has no data, we call the hooks (with
   * safe default data) to preserve the call order.
   */
  const { profile } = useAuth() || {};

  // Select the week to display (either initial index or updated via navigation)
  const [weekIndex, setWeekIndex] = useState(initialIndex);
  const weekData = weeks?.[weekIndex] || null;

  // If modal just opened or weeks changed, reset to initial index
  useEffect(() => {
    setWeekIndex(initialIndex);
  }, [initialIndex, weeks]);

  if (!isOpen || !weekData) return null;

  const chofer = useMemo(
    () =>
      profile?.nombre_completo ||
      profile?.full_name ||
      profile?.username ||
      '—',
    [profile]
  );
  const camion = useMemo(
    () =>
      profile?.camioane?.matricula ||
      profile?.matricula ||
      profile?.camion ||
      '—',
    [profile]
  );

  const rangoSemana = useMemo(() => {
    const fmt = (d) =>
      d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    return `${fmt(weekData.monday)} — ${fmt(weekData.friday)}`;
  }, [weekData]);

  // Generate PDF for weekly summary
  const handleGeneratePDF = useCallback(async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();
      const M = 14;
      let y = M;

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('PARTE SEMANAL', M, y);
      doc.setDrawColor(34, 197, 94);
      doc.setLineWidth(0.6);
      doc.roundedRect(M - 2, y - 8, W - 2 * (M - 2), 12, 2.5, 2.5, 'S');
      y += 14;

      // Meta information
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.text(`Chofer: ${chofer}`, M, y);
      y += 6;
      doc.text(`Camión: ${camion}`, M, y);
      y += 6;
      doc.text(`Semana: ${rangoSemana}`, M, y);
      y += 10;

      // Table columns (for Lu–Vi days)
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

      // Rows for each day (Monday–Friday)
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

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        cols.forEach(c => {
          doc.roundedRect(x, y, c.w, rowH, 1.2, 1.2, 'S');
          const txt = String(vals[c.key] ?? '');
          // Alignment: left for 'dia' and 'obs', center for others
          if (c.key === 'dia' || c.key === 'obs') {
            doc.text(txt, x + 1.6, y + 5.3);
          } else {
            doc.text(txt, x + c.w / 2, y + 5.3, { align: 'center' });
          }
          x += c.w;
        });
        y += rowH;
      });

      // Summary at bottom
      y += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
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

        {/* Tabla */}
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

        {/* Resumen */}
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
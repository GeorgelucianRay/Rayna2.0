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
  const { profile } = useAuth();
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex, isOpen]);

  const totalWeeks = weeks?.length || 0;

  // 🔹 weekData safe – poate fi null, dar hookul se execută mereu
  const weekData = useMemo(() => {
    if (!weeks || !weeks.length) return null;
    const safeIndex = Math.min(Math.max(index, 0), weeks.length - 1);
    return weeks[safeIndex];
  }, [weeks, index]);

  /* ──────────────────────────────────────────────────────────────
     DETERMINARE CAMION SĂPTĂMÂNĂ
  ─────────────────────────────────────────────────────────────── */
  const camionSemana = useMemo(() => {
    if (!weekData) return (
      profile?.camioane?.matricula ||
      profile?.matricula ||
      profile?.camion ||
      '—'
    );

    const camioaneSet = new Set();

    weekData.days.forEach(d => {
      if (d.camion_matricula) camioaneSet.add(d.camion_matricula);
    });

    if (camioaneSet.size === 1) return [...camioaneSet][0];

    if (camioaneSet.size === 0)
      return (
        profile?.camioane?.matricula ||
        profile?.matricula ||
        profile?.camion ||
        '—'
      );

    return [...camioaneSet];
  }, [weekData, profile]);

  /* ──────────────────────────────────────────────────────────────
     RANGE SĂPTĂMÂNĂ
  ─────────────────────────────────────────────────────────────── */
  const rangoSemana = useMemo(() => {
    if (!weekData) return '';
    const fmt = (d) =>
      d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'long',
      });
    return `${fmt(weekData.monday)} — ${fmt(weekData.friday)}`;
  }, [weekData]);

  /* ──────────────────────────────────────────────────────────────
     KM STATISTICS
  ─────────────────────────────────────────────────────────────── */
  const kmStats = useMemo(() => {
    if (!weekData) {
      return { kmIni: 0, kmFin: 0, kmTotal: 0 };
    }

    let kmIni = 0;
    let kmFin = 0;
    let total = 0;

    weekData.days.forEach((d) => {
      const kmi = Number(d.km_iniciar || 0);
      const kmf = Number(d.km_final || 0);
      const kmd = Math.max(0, kmf - kmi);

      if (kmi && !kmIni) kmIni = kmi;
      if (kmf) kmFin = kmf;
      total += kmd;
    });

    return {
      kmIni,
      kmFin,
      kmTotal: total,
    };
  }, [weekData]);

  const goPrevWeek = useCallback(() => {
    setIndex(i => {
      const ni = i > 0 ? i - 1 : 0;
      onChangeWeek && onChangeWeek(ni);
      return ni;
    });
  }, [onChangeWeek]);

  const goNextWeek = useCallback(() => {
    setIndex(i => {
      const ni = i < totalWeeks - 1 ? i + 1 : totalWeeks - 1;
      onChangeWeek && onChangeWeek(ni);
      return ni;
    });
  }, [onChangeWeek, totalWeeks]);

  const handleSelectWeek = useCallback((e) => {
    const ni = Number(e.target.value);
    setIndex(ni);
    onChangeWeek && onChangeWeek(ni);
  }, [onChangeWeek]);

  /* ──────────────────────────────────────────────────────────────
     PDF GENERATOR
  ─────────────────────────────────────────────────────────────── */
  const handleGeneratePDF = useCallback(async () => {
    if (!weekData) return;
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });

      const W = doc.internal.pageSize.getWidth();
      const M = 12;
      let y = M;

      const days = weekData.days;

      // TITLU
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('HOJA DE GASTOS SEMANA', W / 2, y, { align: 'center' });
      y += 8;

      // INFO
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Semana: ${rangoSemana}`, W - M, y, { align: 'right' });
      y += 5;

      // CAMION(ES)
      doc.setFont('helvetica', 'bold');
      doc.text('Vehículo(s): ', M, y);

      doc.setFont('helvetica', 'normal');
      if (Array.isArray(camionSemana)) {
        doc.text(camionSemana.join(', '), M + 28, y);
      } else {
        doc.text(camionSemana || '—', M + 28, y);
      }
      y += 8;

      // TABLA ZILNICĂ
      const colDia = 40;
      const colAncho = (W - M * 2 - colDia) / 4;
      const rowAlt = 7;

      doc.setFont('helvetica', 'bold');
      doc.rect(M, y, colDia, rowAlt, 'S');
      doc.text('DÍA', M + 2, y + 4);

      doc.rect(M + colDia, y, colAncho, rowAlt, 'S');
      doc.text('DESAYUNO', M + colDia + 2, y + 4);

      doc.rect(M + colDia + colAncho, y, colAncho, rowAlt, 'S');
      doc.text('CENA', M + colDia + colAncho + 2, y + 4);

      doc.rect(M + colDia + colAncho * 2, y, colAncho, rowAlt, 'S');
      doc.text('PRO-CENA', M + colDia + colAncho * 2 + 2, y + 4);

      doc.rect(M + colDia + colAncho * 3, y, colAncho, rowAlt, 'S');
      doc.text('FESTIVO', M + colDia + colAncho * 3 + 2, y + 4);

      y += rowAlt;

      const labels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

      doc.setFont('helvetica', 'normal');

      days.forEach((d, idx) => {
        let x = M;
        doc.rect(x, y, colDia, rowAlt, 'S');
        doc.text(`${labels[idx]} — ${d.label}`, x + 2, y + 4);
        x += colDia;

        doc.rect(x, y, colAncho, rowAlt, 'S');
        if (d.des) doc.text('X', x + colAncho / 2, y + 4, { align: 'center' });
        x += colAncho;

        doc.rect(x, y, colAncho, rowAlt, 'S');
        if (d.cen) doc.text('X', x + colAncho / 2, y + 4, { align: 'center' });
        x += colAncho;

        doc.rect(x, y, colAncho, rowAlt, 'S');
        if (d.pro) doc.text('X', x + colAncho / 2, y + 4, { align: 'center' });
        x += colAncho;

        doc.rect(x, y, colAncho, rowAlt, 'S');
        if (d.festivo) doc.text(String(d.festivo), x + colAncho / 2, y + 4, { align: 'center' });
        y += rowAlt;
      });

      y += 5;

      const line = (label, val) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, M, y);
        doc.setFont('helvetica', 'normal');
        doc.text(String(val || 0), W - M, y, { align: 'right' });
        y += 6;
      };

      line('KM inicial semana', kmStats.kmIni);
      line('KM final semana', kmStats.kmFin);
      line('KM totales semana', kmStats.kmTotal);

      const file = weekData.monday.toISOString().slice(0, 10);
      doc.save(`parte-semanal_${file}.pdf`);

    } catch (err) {
      console.error(err);
      alert('Error al generar el PDF.');
    }
  }, [camionSemana, weekData, kmStats, rangoSemana]);

  /* ──────────────────────────────────────────────────────────────
     RETURN – abia acum verificăm isOpen/ weekData
  ─────────────────────────────────────────────────────────────── */

  if (!isOpen || !weekData) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.titleBar}>
          <h2>PARTE SEMANAL</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* SELECTOR SĂPTĂMÂNĂ */}
        <div className={styles.weekSelectorBar}>
          <button
            className={styles.weekNavBtn}
            onClick={goPrevWeek}
            disabled={index === 0}
          >
            ←
          </button>

          <select
            className={styles.weekSelect}
            value={index}
            onChange={handleSelectWeek}
          >
            {weeks && weeks.map((w, i) => {
              const f = (d) =>
                d.toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'short',
                });
              return (
                <option key={i} value={i}>
                  Semana {i + 1} ({f(w.monday)} – {f(w.friday)})
                </option>
              );
            })}
          </select>

          <button
            className={styles.weekNavBtn}
            onClick={goNextWeek}
            disabled={index === totalWeeks - 1}
          >
            →
          </button>
        </div>

        {/* META INFO */}
        <div className={styles.meta}>
          <div><span>Chofer:</span> {profile?.nombre_completo || profile?.username || '—'}</div>
          <div>
            <span>Vehículo:</span>{' '}
            {Array.isArray(camionSemana)
              ? camionSemana.join(', ')
              : camionSemana}
          </div>
          <div><span>Semana:</span> {rangoSemana}</div>
        </div>

        <div className={styles.actions}>
          <button className={styles.pdfBtn} onClick={handleGeneratePDF}>
            Descargar PDF semanal
          </button>
        </div>
      </div>
    </div>
  );
}
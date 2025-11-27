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

  if (!isOpen || !weeks || !weeks.length) return null;

  const weekData = weeks[index];

  /* ──────────────────────────────────────────────────────────────
     DETERMINARE CAMION SĂPTĂMÂNĂ
     - dacă unele zile au camion diferit, se returnează listă
     - altfel camion unic, prestabilit
  ─────────────────────────────────────────────────────────────── */
  const camionSemana = useMemo(() => {
    const camioaneSet = new Set();

    weekData.days.forEach(d => {
      if (d.camion_matricula) camioaneSet.add(d.camion_matricula);
    });

    // dacă există doar 1 camion → afișăm unul
    if (camioaneSet.size === 1) return [...camioaneSet][0];

    // dacă nu există niciunul → fallback la profil
    if (camioaneSet.size === 0)
      return (
        profile?.camioane?.matricula ||
        profile?.matricula ||
        profile?.camion ||
        '—'
      );

    // mai multe camioane → returnăm lista
    return [...camioaneSet];
  }, [weekData, profile]);

  /* ──────────────────────────────────────────────────────────────
     RANGE SĂPTĂMÂNĂ
  ─────────────────────────────────────────────────────────────── */
  const rangoSemana = useMemo(() => {
    const fmt = (d) =>
      d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'long',
      });
    return `${fmt(weekData.monday)} — ${fmt(weekData.friday)}`;
  }, [weekData]);

  /* ──────────────────────────────────────────────────────────────
     KM STATISTICS — doar zilele din luna curentă
  ─────────────────────────────────────────────────────────────── */
  const kmStats = useMemo(() => {
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

  const totalWeeks = weeks.length;

  const goPrevWeek = () => {
    setIndex(i => {
      const ni = i > 0 ? i - 1 : 0;
      onChangeWeek && onChangeWeek(ni);
      return ni;
    });
  };

  const goNextWeek = () => {
    setIndex(i => {
      const ni = i < totalWeeks - 1 ? i + 1 : totalWeeks - 1;
      onChangeWeek && onChangeWeek(ni);
      return ni;
    });
  };

  const handleSelectWeek = (e) => {
    const ni = Number(e.target.value);
    setIndex(ni);
    onChangeWeek && onChangeWeek(ni);
  };

  /* ──────────────────────────────────────────────────────────────
     PDF GENERATOR — versiune finală
  ─────────────────────────────────────────────────────────────── */
  const handleGeneratePDF = useCallback(async () => {
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

      const headers = ['D', 'C', 'P', 'F(€)'];
      let x = M + colDia;

      headers.forEach((h) => {
        doc.rect(x, y, colAncho, rowAlt, 'S');
        doc.text(h, x + colAncho / 2, y + 4, { align: 'center' });
        x += colAncho;
      });
      y += rowAlt;

      const labels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

      doc.setFont('helvetica', 'normal');

      days.forEach((d, idx) => {
        x = M;
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

      // KM PANEL
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

      // SAVE
      const file = weekData.monday.toISOString().slice(0, 10);
      doc.save(`parte-semanal_${file}.pdf`);

    } catch (err) {
      console.error(err);
      alert('Error al generar el PDF.');
    }
  }, [camionSemana, weekData, kmStats, rangoSemana]);

  /* ────────────────────────────────────────────────────────────── */

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
            {weeks.map((w, i) => {
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

        {/* TABEL SĂPTĂMÂNĂ */}
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
            </div>
          ))}
        </div>

        {/* STATS */}
        <div className={styles.stats}>
          <div>KM inicial: <b>{kmStats.kmIni || 0}</b></div>
          <div>KM final: <b>{kmStats.kmFin || 0}</b></div>
          <div>KM totales: <b className={styles.km}>{kmStats.kmTotal}</b></div>
        </div>

        <div className={styles.actions}>
          <button className={styles.pdfBtn} onClick={handleGeneratePDF}>
            📄 Generar PDF
          </button>
        </div>
      </div>
    </div>
  );
}
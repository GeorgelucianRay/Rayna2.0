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

  const chofer = useMemo(
    () =>
      profile?.nombre_completo ||
      profile?.full_name ||
      profile?.username ||
      '—',
    [profile]
  );

  const camionSemana = useMemo(() => {
    const fromDays =
      weekData.days.find((d) => d.camion_matricula)?.camion_matricula;
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

  // KMs doar pe zilele din luna curentă (d.getMonth() == luna din currentDate)
  const kmStats = useMemo(() => {
    const days = weekData.days || [];
    let kmIni = 0;
    let kmFin = 0;
    let total = 0;

    days.forEach((d) => {
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
  }, [weekData]);

  const totalWeeks = weeks.length;

  const goPrevWeek = () => {
    setIndex((i) => {
      const ni = i > 0 ? i - 1 : 0;
      onChangeWeek && onChangeWeek(ni);
      return ni;
    });
  };

  const goNextWeek = () => {
    setIndex((i) => {
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

  // PDF – HOJA DE GASTOS SEMANA (Lunes–Domingo)
  const handleGeneratePDF = useCallback(
    async () => {
      try {
        const { default: jsPDF } = await import('jspdf');
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });

        const W = doc.internal.pageSize.getWidth();
        const M = 12;
        let y = M;

        const days = weekData.days || [];

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
          const d = days[idx] || {};
          x = M;

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

          // PERNOCTA
          doc.rect(x, y, colAncho, rowAlt, 'S');
          if (d.pro) doc.text('X', x + colAncho / 2, y + 4, { align: 'center' });
          x += colAncho;

          // OTROS → folosim festivo ca exemplu
          doc.rect(x, y, colAncho, rowAlt, 'S');
          if (d.festivo) {
            doc.text(String(d.festivo), x + colAncho / 2, y + 4, { align: 'center' });
          }

          y += rowAlt;
        });

        y += 6;

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
    [chofer, camionSemana, rangoSemana, weekData, kmStats]
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

        {/* selector săptămână */}
        <div className={styles.weekSelectorBar}>
          <button
            className={styles.weekNavBtn}
            onClick={goPrevWeek}
            disabled={index === 0}
          >
            ← Semana anterior
          </button>

          <select
            className={styles.weekSelect}
            value={index}
            onChange={handleSelectWeek}
          >
            {weeks.map((w, i) => {
              const fmt = (d) =>
                d.toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'short',
                });
              return (
                <option key={i} value={i}>
                  Semana {i + 1} ({fmt(w.monday)} – {fmt(w.friday)})
                </option>
              );
            })}
          </select>

          <button
            className={styles.weekNavBtn}
            onClick={goNextWeek}
            disabled={index === totalWeeks - 1}
          >
            Semana siguiente →
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

        {/* Tabel vizual */}
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
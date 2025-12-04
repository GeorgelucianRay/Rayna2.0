// src/components/nomina/SimpleSummaryModal.jsx
import React, { useMemo, useCallback } from 'react';
import { useAuth } from '../../AuthContext';
import styles from './SummaryModal.module.css';

export default function SimpleSummaryModal({ data, onClose }) {
  // Accesăm profilul utilizatorului (chiar dacă data e nulă)
  const { profile } = useAuth() || {};
  const profileSafe = profile || {};

  // Derivăm nume șofer și camión
  const chofer = useMemo(() => (
    profileSafe?.nombre_completo ||
    profileSafe?.full_name ||
    profileSafe?.username ||
    '—'
  ), [profileSafe]);

  const camion = useMemo(() => (
    profileSafe?.camioane?.matricula ||
    profileSafe?.matricula ||
    profileSafe?.camion ||
    '—'
  ), [profileSafe]);

  // Calculăm kilometraj total
  const kmSalida  = Number(data?.km_iniciar ?? 0) || 0;
  const kmLlegada = Number(data?.km_final   ?? 0) || 0;
  const kmTotal   = Math.max(0, kmLlegada - kmSalida);

  // Generăm PDF doar dacă există date
  const handleGeneratePDF = useCallback(async () => {
    if (!data) return;
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();
      const M = 14;
      let y = M;

      // Antet
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('PARTE DIARIO', M, y);
      doc.setDrawColor(34, 197, 94);
      doc.setLineWidth(0.6);
      doc.roundedRect(M - 2, y - 8, W - 2 * (M - 2), 12, 2.5, 2.5, 'S');
      y += 14;

      // Meta
      doc.setFont('helvetica','normal'); doc.setFontSize(12);
      doc.text(`Chofer: ${chofer}`, M, y); y += 6;
      doc.text(`Camión: ${camion}`, M, y); y += 6;
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, M, y); y += 10;

      // Coloanele tabelului
      const cols = [
        { key: 'concepto', label: 'Concepto', w: 64 },
        { key: 'cantidad', label: 'Cantidad', w: 26 },
        { key: 'precio',   label: 'Precio',   w: 26 },
        { key: 'total',    label: 'Total',    w: 28 },
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

      // Funcție pentru a adăuga rânduri
      const rowH = 8;
      const addRow = (label, val) => {
        x = M;
        const vals = {
          concepto: label,
          cantidad: '',
          precio: '',
          total: val != null ? `${val}€` : '—',
        };
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        cols.forEach(c => {
          doc.roundedRect(x, y, c.w, rowH, 1.2, 1.2, 'S');
          const txt = String(vals[c.key] ?? '');
          if (c.key === 'concepto') {
            doc.text(txt, x + 1.6, y + 5.3);
          } else {
            doc.text(txt, x + c.w / 2, y + 5.3, { align: 'center' });
          }
          x += c.w;
        });
        y += rowH;
      };

      // Adăugăm rândurile principale
      addRow('KM salida', kmSalida);
      addRow('KM llegada', kmLlegada);
      addRow('KM totales', kmTotal);

      // Total brut (dacă există)
      doc.setFont('helvetica', 'bold');
      doc.text(
        `Total bruto: ${
          data?.totalBruto != null ? `${data.totalBruto}€` : '—'
        }`,
        M,
        y + 6
      );

      doc.save(`parte-diario_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (err) {
      console.error('PDF diario error:', err);
      alert('No se pudo generar el PDF.');
    }
  }, [chofer, camion, data, kmSalida, kmLlegada, kmTotal]);

  // Dacă nu există date, returnăm null (după apelul hook‑urilor)
  if (!data) return null;

  // UI pentru modal
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.titleBar}>
          <h2>PARTE DIARIO</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        {/* Meta */}
        <div className={styles.meta}>
          <div><span>Chofer:</span> {chofer}</div>
          <div><span>Camión:</span> {camion}</div>
          <div><span>Fecha:</span> {new Date().toLocaleDateString('es-ES')}</div>
        </div>

        {/* Kilometraje */}
        <div className={styles.kmGrid}>
          <div><span>KM salida:</span> {data?.km_iniciar ?? '—'}</div>
          <div><span>KM llegada:</span> {data?.km_final ?? '—'}</div>
          <div><span>KM totales:</span> {kmTotal}</div>
        </div>

        {/* Statistici */}
        <div className={styles.stats}>
          <div>Días trabajados: <b>{data?.workedDays ?? '—'}</b></div>
          <div>Desayunos: <b>{data?.desayunos ?? '—'}</b></div>
          <div>Cenas: <b>{data?.cenas ?? '—'}</b></div>
          <div>Pro-cenas: <b>{data?.procenas ?? '—'}</b></div>
          <div>Contenedores: <b>{data?.contenedores ?? '—'}</b></div>
        </div>

        <div className={styles.actions}>
          <button className={styles.pdfBtn} onClick={handleGeneratePDF}>📄 Generar PDF</button>
        </div>
      </div>
    </div>
  );
}
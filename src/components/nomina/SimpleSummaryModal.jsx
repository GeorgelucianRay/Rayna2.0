// src/components/nomina/SimpleSummaryModal.jsx
import React, { useMemo, useCallback } from 'react';
import { useAuth } from '../../AuthContext';
import styles from './SummaryModal.module.css';

export default function SimpleSummaryModal({ data, onClose }) {
  // dacă modalul e deschis fără data, nu randăm
  if (!data) return null;

  // profile poate fi încărcat async — protejăm accesul
  let profileSafe;
  try {
    const { profile } = useAuth() || {};
    profileSafe = profile || {};
  } catch {
    profileSafe = {};
  }

  const chofer = useMemo(() => {
    return (
      profileSafe?.nombre_completo ||
      profileSafe?.full_name ||
      profileSafe?.username ||
      '—'
    );
  }, [profileSafe]);

  const camion = useMemo(() => {
    return (
      profileSafe?.camioane?.matricula ||
      profileSafe?.matricula ||
      profileSafe?.camion ||
      '—'
    );
  }, [profileSafe]);

  const kmSalida  = Number(data?.km_iniciar ?? 0) || 0;
  const kmLlegada = Number(data?.km_final   ?? 0) || 0;
  const kmTotal   = Math.max(0, kmLlegada - kmSalida);

  // Importăm jsPDF doar când se apasă butonul (evită erori la import)
  const handleGeneratePDF = useCallback(async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();
      const M = 14;
      let y = M;

      // Header
      doc.setFont('helvetica','bold'); doc.setFontSize(20);
      doc.text('PARTE DIARIO', M, y);
      doc.setDrawColor(34,197,94); doc.setLineWidth(0.6);
      doc.roundedRect(M-2, y-8, W-2*(M-2), 12, 2.5, 2.5, 'S');
      y += 14;

      // Meta
      doc.setFont('helvetica','normal'); doc.setFontSize(12);
      doc.text(`Chofer: ${chofer}`, M, y);
      y += 6;
      doc.text(`Camión: ${camion}`, M, y);
      y += 6;
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, M, y);
      y += 10;

      // Table columns
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

      // Rows (conceptos)
      const rowH = 8;
      const addRow = (label, val) => {
        x = M;
        const cells = [
          String(label),
          String(typeof val === 'number' ? eur.format(val) : val || '—'),
        ];
        const [concepto, totalStr] = cells;
        // cantidad și precio sunt extrase din textul `label` dacă există paranteze
        const match = concepto.match(/^(.*) x (\d+) @ ([\d,.]+)$/);
        let cantidad = '', precio = '';
        let conceptoStr = concepto;
        if (match) {
          conceptoStr = match[1];
          cantidad = match[2];
          precio = match[3] + '€';
        }
        const vals = {
          concepto: conceptoStr,
          cantidad,
          precio,
          total: totalStr
        };

        doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
        cols.forEach(c => {
          doc.roundedRect(x, y, c.w, rowH, 1.2, 1.2, 'S');
          const txt = String(vals[c.key] ?? '');
          // aliniere: stânga pentru 'concepto', centru pt restul
          if (c.key === 'concepto') {
            doc.text(txt, x + 1.6, y + 5.3);
          } else {
            doc.text(txt, x + c.w / 2, y + 5.3, { align: 'center' });
          }
          x += c.w;
        });
        y += rowH;
      };

      // Adaugă toate conceptele relevante
      addRow('Salario base', data?.salario_base);
      addRow('Antigüedad', data?.antiguedad);
      addRow('Vacaciones', data?.vacaciones);
      addRow('Festivos', data?.festivos);
      addRow('Km recorridos', data?.km_total);
      addRow('Dietas (desayuno)', data?.dietas_desayuno);
      addRow('Dietas (cena)', data?.dietas_cena);
      addRow('Dietas (pro-cena)', data?.dietas_procena);
      addRow('Contenedores', data?.contenedores);

      // Suma totală
      doc.setFont('helvetica', 'bold');
      doc.text(`Total bruto: ${data?.totalBruto != null ? eur.format(data.totalBruto) : '—'}`, M, y + 6);

      doc.save(`parte-diario_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (err) {
      console.error('PDF diario error:', err);
      alert('No se pudo generar el PDF.');
    }
  }, [chofer, camion, data]);

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

        {/* Estadísticas */}
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
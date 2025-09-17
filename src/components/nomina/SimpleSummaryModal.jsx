import React, { useMemo } from 'react';
import jsPDF from 'jspdf';
import { useAuth } from '../../AuthContext';
import styles from './SummaryModal.module.css';

export default function SimpleSummaryModal({ data, onClose }) {
  const { profile } = useAuth();
  if (!data) return null;

  // Chofer & Camión din profile (conform MiPerfilPage)
  const chofer = useMemo(
    () => profile?.nombre_completo || profile?.full_name || profile?.username || '—',
    [profile]
  );
  const camion = useMemo(
    () => profile?.camioane?.matricula || profile?.matricula || profile?.camion || '—',
    [profile]
  );

  const kmSalida  = Number(data.km_iniciar || 0);
  const kmLlegada = Number(data.km_final   || 0);
  const kmTotal   = Math.max(0, kmLlegada - kmSalida);

  // ===== PDF fidel, compoziție curată (A4, mm) =====
  const generatePDF = () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const margin = 14;
    let y = margin;

    // Header: PARTE DIARIO
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('PARTE DIARIO', margin, y);
    doc.setDrawColor(34, 197, 94);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin - 2, y - 8, W - margin * 2 + 4, 12, 2, 2, 'S');
    y += 14;

    const panel = (label, value) => {
      const h = 12;
      doc.setDrawColor(160, 160, 160);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, W - margin * 2, h, 3, 3, 'S');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, margin + 5, y + 7);
      doc.setFont('helvetica', 'normal');
      doc.text(String(value || '—'), margin + 40, y + 7);
      y += h + 6;
    };

    panel('CHOFER', chofer);
    panel('CAMIÓN', camion);
    panel('FECHA', `${data.day} ${data.monthName} ${data.year}`);

    // Itinerario
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(34, 197, 94);
    doc.text('ITINERARIO', W / 2, y, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    const itinerarios = Array.isArray(data.curse) && data.curse.length > 0
      ? data.curse.map(c => `${c.start || 'N/A'}   →   ${c.end || 'N/A'}`)
      : ['— sin carreras registradas —'];

    itinerarios.forEach(line => {
      doc.text(line, W / 2, y, { align: 'center' });
      y += 7;
    });

    y += 4;

    // KM: trei rânduri, fiecare cu etichetă + valoare pe aceeași linie
    const kmRow = (label, value) => {
      const h = 10;
      doc.setDrawColor(80, 80, 80);
      doc.roundedRect(margin, y, W - margin * 2, h, 2, 2, 'S');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
      doc.text(label, margin + 5, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.text(String(value), W - margin - 5, y + 6, { align: 'right' });
      y += h + 6;
    };
    kmRow('KM. SALIDA', kmSalida);
    kmRow('KM. LLEGADA', kmLlegada);
    kmRow('KM TOTAL', kmTotal);

    doc.save(`parte-diario_${data.year}-${String(data.monthName)}-${data.day}.pdf`);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.summarySheet} onClick={(e) => e.stopPropagation()}>
        {/* header bar */}
        <div className={styles.headerBar}>
          <h2>PARTE DIARIO</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        {/* panouri: chofer / camion / fecha */}
        <div className={styles.metaPanels}>
          <div className={styles.metaPanel}>
            <span className={styles.metaLabel}>CHOFER:</span>
            <span className={styles.metaValue}>{chofer}</span>
          </div>
          <div className={styles.metaPanel}>
            <span className={styles.metaLabel}>CAMIÓN:</span>
            <span className={styles.metaValue}>{camion}</span>
          </div>
          <div className={styles.metaPanel}>
            <span className={styles.metaLabel}>FECHA:</span>
            <span className={styles.metaValue}>{`${data.day} ${data.monthName} ${data.year}`}</span>
          </div>
        </div>

        {/* itinerario centrat */}
        <div className={styles.itineraryBlock}>
          <div className={styles.itineraryTitle}>ITINERARIO</div>
          <div className={styles.itineraryList}>
            {Array.isArray(data.curse) && data.curse.length > 0 ? (
              data.curse.map((c, i) => (
                <div key={i} className={styles.itineraryRow}>
                  <span>{c.start || 'N/A'}</span>
                  <span className={styles.arrow}>→</span>
                  <span>{c.end || 'N/A'}</span>
                </div>
              ))
            ) : (
              <div className={styles.itineraryRowMuted}>— sin carreras registradas —</div>
            )}
          </div>
        </div>

        {/* KM: label + valoare pe aceeași linie */}
        <div className={styles.kmGroup}>
          <div className={styles.kmRow}>
            <span className={styles.kmLabel}>KM. SALIDA</span>
            <span className={styles.kmValue}>{kmSalida}</span>
          </div>
          <div className={styles.kmRow}>
            <span className={styles.kmLabel}>KM. LLEGADA</span>
            <span className={styles.kmValue}>{kmLlegada}</span>
          </div>
          <div className={styles.kmRow}>
            <span className={styles.kmLabel}>KM TOTAL</span>
            <span className={styles.kmValue}>{kmTotal}</span>
          </div>
        </div>

        {/* acțiuni */}
        <div className={styles.actionsCentered}>
          <button className={styles.pdfButton} onClick={generatePDF}>📄 Generar PDF</button>
        </div>
      </div>
    </div>
  );
}
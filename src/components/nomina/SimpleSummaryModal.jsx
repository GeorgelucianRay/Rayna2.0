import React, { useMemo, useCallback } from 'react';
import jsPDF from 'jspdf';
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

      const panel = (label, value) => {
        const h = 12;
        doc.setDrawColor(155,155,155); doc.setLineWidth(0.3);
        doc.roundedRect(M, y, W-2*M, h, 3, 3, 'S');
        doc.setFontSize(12);
        doc.setFont('helvetica','bold'); doc.text(`${label}:`, M+6, y+7);
        doc.setFont('helvetica','normal'); doc.text(String(value ?? '—'), M+42, y+7);
        y += h + 6;
      };

      panel('CHOFER', chofer);
      panel('CAMIÓN', camion);
      panel('FECHA', `${data?.day ?? '—'} ${data?.monthName ?? ''} ${data?.year ?? ''}`);

      // Itinerario
      doc.setFont('helvetica','bold'); doc.setFontSize(14);
      doc.setTextColor(34,197,94);
      doc.text('ITINERARIO', W/2, y, { align:'center' });
      doc.setTextColor(0,0,0);
      y += 8;

      doc.setFont('helvetica','normal'); doc.setFontSize(12);
      const lines = Array.isArray(data?.curse) && data.curse.length
        ? data.curse.map(c => `${c?.start || 'N/A'}   →   ${c?.end || 'N/A'}`)
        : ['— sin carreras registradas —'];
      lines.forEach(l => { doc.text(l, W/2, y, { align:'center' }); y += 7; });
      y += 4;

      const kmRow = (label, value) => {
        const h = 10;
        doc.setDrawColor(90,90,90);
        doc.roundedRect(M, y, W-2*M, h, 2, 2, 'S');
        doc.setFont('helvetica','bold'); doc.setFontSize(12);
        doc.text(label, M+8, y+6);
        doc.setFont('helvetica','normal');
        doc.text(String(value ?? '0'), W-M-8, y+6, { align:'right' });
        y += h + 6;
      };
      kmRow('KM. SALIDA',  kmSalida);
      kmRow('KM. LLEGADA', kmLlegada);
      kmRow('KM TOTAL',   kmTotal);

      const mName = String(data?.monthName ?? '').replace(/\s+/g,'_');
      doc.save(`parte-diario_${data?.year ?? ''}-${mName}-${data?.day ?? ''}.pdf`);
    } catch (err) {
      console.error('PDF error:', err);
      alert('No se pudo generar el PDF.');
    }
  }, [chofer, camion, kmSalida, kmLlegada, kmTotal, data?.day, data?.monthName, data?.year]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.titleBar}>
          <h2>PARTE DIARIO</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className={styles.metaGrid}>
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
            <span className={styles.metaValue}>
              {(data?.day ?? '—') + ' ' + (data?.monthName ?? '') + ' ' + (data?.year ?? '')}
            </span>
          </div>
        </div>

        <div className={styles.itinBlock}>
          <div className={styles.itinTitle}>ITINERARIO</div>
          <div className={styles.itinList}>
            {Array.isArray(data?.curse) && data.curse.length ? (
              data.curse.map((c, i) => (
                <div key={i} className={styles.itinRow}>
                  <span className={styles.itinTxt}>{c?.start || 'N/A'}</span>
                  <span className={styles.arrow}>→</span>
                  <span className={styles.itinTxt}>{c?.end || 'N/A'}</span>
                </div>
              ))
            ) : (
              <div className={styles.itinEmpty}>— sin carreras registradas —</div>
            )}
          </div>
        </div>

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

        <div className={styles.actions}>
          <button className={styles.pdfBtn} onClick={handleGeneratePDF}>
            📄 Generar PDF
          </button>
        </div>
      </div>
    </div>
  );
}
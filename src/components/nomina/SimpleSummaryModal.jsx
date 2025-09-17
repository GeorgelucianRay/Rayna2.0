// src/components/nomina/SimpleSummaryModal.jsx
import React, { useMemo } from 'react';
import jsPDF from 'jspdf';
import { useAuth } from '../../AuthContext';
import styles from './SummaryModal.module.css';

export default function SimpleSummaryModal({ data, onClose }) {
  const { profile } = useAuth();
  if (!data) return null;

  // CHOFER & CAMIÓN din profil (fallback dacă lipsesc)
  const chofer = useMemo(
    () => profile?.full_name || profile?.username || profile?.name || '—',
    [profile]
  );
  const camion = useMemo(
    () =>
      profile?.camion ||
      profile?.truck_number ||
      profile?.numero_camion ||
      profile?.matricula_camion ||
      profile?.plate ||
      profile?.matricula ||
      '—',
    [profile]
  );

  // KM semanal (dacă vin), altfel KM pe zi
  const kmLunes   = data.km_iniciar_semana ?? data.km_iniciar ?? 0;
  const kmViernes = data.km_final_semana   ?? data.km_final   ?? 0;
  const kmTotalSemana = Math.max(0, Number(kmViernes || 0) - Number(kmLunes || 0));

  // KM zi (pentru display în tabelul auxiliar)
  const kmInicialDia = Number(data.km_iniciar || 0);
  const kmFinalDia   = Number(data.km_final   || 0);
  const kmTotalDia   = Math.max(0, kmFinalDia - kmInicialDia);

  const markX = (flag) => (flag ? 'X' : '');

  const generatePDF = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const left = 48;
    let y = 56;

    // TITLU
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('PARTE DIARIO', left, y);
    y += 24;

    // META: Chofer, Camión, Fecha
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Chofer: ${chofer}`, left, y); y += 16;
    doc.text(`Camión: ${camion}`, left, y); y += 16;
    doc.text(`Fecha: ${data.day} ${data.monthName} ${data.year}`, left, y);
    y += 28;

    // KM SEMANAL
    doc.setFont('helvetica', 'bold');
    doc.text('Kilómetros (semanal)', left, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.text(`KM inicial (Lunes): ${kmLunes}`, left, y); y += 14;
    doc.text(`KM final (Viernes): ${kmViernes}`, left, y); y += 14;
    doc.text(`KM total semana: ${kmTotalSemana}`, left, y);
    y += 24;

    // DIETAS (tabel)
    doc.setFont('helvetica', 'bold');
    doc.text('Dietas', left, y);
    y += 10;

    const tableLeft = left;
    const colW = [140, 70, 70, 90, 70]; // Nume + 4 coloane
    const headers = ['Concepto', 'Des.', 'Cena', 'Pro-cena', 'Festivo'];
    const row = [
      'Aplicación',
      markX(!!data.desayuno),
      markX(!!data.cena),
      markX(!!data.procena),
      markX(!!data.festivo || !!data.suma_festivo)
    ];

    const drawRow = (texts, rowY, isHeader = false) => {
      let x = tableLeft;
      doc.setFont('helvetica', isHeader ? 'bold' : 'normal');
      doc.setFontSize(11);
      texts.forEach((t, i) => {
        // celulă
        doc.rect(x, rowY - 12, colW[i], 22);
        // text centrat pentru coloanele mici, left pentru prima
        if (i === 0) {
          doc.text(String(t), x + 8, rowY + 4);
        } else {
          const textW = doc.getTextWidth(String(t));
          doc.text(String(t), x + colW[i] / 2 - textW / 2, rowY + 4);
        }
        x += colW[i];
      });
    };

    drawRow(headers, y, true);
    y += 26;
    drawRow(row, y, false);
    y += 36;

    // ITINERARIO (centru)
    doc.setFont('helvetica', 'bold');
    doc.text('Itinerario', left, y);
    y += 14;
    doc.setFont('helvetica', 'normal');

    if (Array.isArray(data.curse) && data.curse.length > 0) {
      data.curse.forEach((cursa, i) => {
        const linea = `${cursa.start || 'N/A'}  →  ${cursa.end || 'N/A'}`;
        // centru pe pagină (margini 48...pt width 595pt)
        const pageWidth = doc.internal.pageSize.getWidth();
        const textW = doc.getTextWidth(linea);
        const centerX = pageWidth / 2 - textW / 2;
        doc.text(linea, Math.max(centerX, left), y);
        y += 16;
      });
    } else {
      const linea = '— sin carreras registradas —';
      const pageWidth = doc.internal.pageSize.getWidth();
      const textW = doc.getTextWidth(linea);
      const centerX = pageWidth / 2 - textW / 2;
      doc.text(linea, Math.max(centerX, left), y);
      y += 16;
    }
    y += 20;

    // TABLA AUXILIAR (presencia física): Hora salida, Hora llegada, Referencia, Observaciones
    doc.setFont('helvetica', 'bold');
    doc.text('Datos adicionales (opcionales)', left, y);
    y += 12;

    const auxColW = [120, 120, 140, 180];
    const auxHeaders = ['Hora salida', 'Hora llegada', 'Referencia', 'Observaciones'];
    const auxTop = y + 6;

    // antet
    let x = left;
    doc.setFont('helvetica', 'bold');
    auxHeaders.forEach((h, i) => {
      doc.rect(x, y, auxColW[i], 24);
      const tW = doc.getTextWidth(h);
      doc.text(h, x + auxColW[i] / 2 - tW / 2, y + 16);
      x += auxColW[i];
    });
    // rând gol
    y += 24;
    x = left;
    doc.setFont('helvetica', 'normal');
    auxColW.forEach((w) => {
      doc.rect(x, y, w, 28);
      x += w;
    });

    // FOOTER mic cu KM zi (informativ)
    y += 48;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.text(`KM del día — inicio: ${kmInicialDia}, fin: ${kmFinalDia}, total: ${kmTotalDia}`, left, y);

    doc.save(`parte-diario-${data.day}-${data.monthName}.pdf`);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.summarySheet} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h1>PARTE DIARIO</h1>
          <button className={styles.pdfButton} onClick={generatePDF}>📄 Generar PDF</button>
        </div>

        {/* Meta */}
        <div className={styles.metaInfo}>
          <div><span>CHOFER:</span> {chofer}</div>
          <div><span>CAMIÓN:</span> {camion}</div>
          <div><span>FECHA:</span> {`${data.day} ${data.monthName} ${data.year}`}</div>
        </div>

        {/* Kilometri săptămânali */}
        <div className={styles.kmWeekly}>
          <div className={styles.kmBox}>
            <span>KM INICIAL (LUNES)</span>
            <p>{kmLunes}</p>
          </div>
          <div className={styles.kmBox}>
            <span>KM FINAL (VIERNES)</span>
            <p>{kmViernes}</p>
          </div>
          <div className={styles.kmBox}>
            <span>KM TOTAL SEMANA</span>
            <p>{kmTotalSemana}</p>
          </div>
        </div>

        {/* Dietas (X) */}
        <div className={styles.dietasCard}>
          <div className={styles.dietasHeader}>DIETAS</div>
          <table className={styles.dietasTable}>
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Des.</th>
                <th>Cena</th>
                <th>Pro-cena</th>
                <th>Festivo</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Aplicación</td>
                <td>{markX(!!data.desayuno)}</td>
                <td>{markX(!!data.cena)}</td>
                <td>{markX(!!data.procena)}</td>
                <td>{markX(!!data.festivo || !!data.suma_festivo)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Itinerario centrat */}
        <div className={styles.itinerary}>
          <div className={styles.itineraryHeader}>ITINERARIO</div>
          <div className={styles.itineraryBody}>
            {Array.isArray(data.curse) && data.curse.length > 0 ? (
              data.curse.map((c, i) => (
                <div key={i} className={styles.itineraryRow}>
                  <span>{c.start || 'N/A'}</span>
                  <span>→</span>
                  <span>{c.end || 'N/A'}</span>
                </div>
              ))
            ) : (
              <div className={styles.itineraryRowMuted}>— sin carreras registradas —</div>
            )}
          </div>
        </div>

        {/* Tabel auxiliar – doar prezent fizic */}
        <div className={styles.auxTableWrap}>
          <table className={styles.auxTable}>
            <thead>
              <tr>
                <th>Hora salida</th>
                <th>Hora llegada</th>
                <th>Referencia</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="1"></td>
                <td colSpan="1"></td>
                <td colSpan="1"></td>
                <td colSpan="1"></td>
              </tr>
            </tbody>
          </table>
          <p className={styles.kmDiaNote}>
            KM del día — inicio: <b>{kmInicialDia}</b>, fin: <b>{kmFinalDia}</b>, total: <b>{kmTotalDia}</b>
          </p>
        </div>
      </div>
    </div>
  );
}
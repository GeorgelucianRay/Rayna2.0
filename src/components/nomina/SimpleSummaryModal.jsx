// src/components/nomina/SimpleSummaryModal.jsx
import React, { useMemo } from 'react';
import jsPDF from 'jspdf';
import { useAuth } from '../../AuthContext';
import styles from './SummaryModal.module.css';

export default function SimpleSummaryModal({ data, onClose }) {
  const { profile } = useAuth();
  if (!data) return null;

  // CHOFER & CAMIÓN din profil (fallback)
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

  // KM săptămânali (dacă vin), altfel KM pe zi
  const kmLunes   = data.km_iniciar_semana ?? data.km_iniciar ?? 0;
  const kmViernes = data.km_final_semana   ?? data.km_final   ?? 0;
  const kmTotalSemana = Math.max(0, Number(kmViernes || 0) - Number(kmLunes || 0));

  // KM zi (nota informativă)
  const kmInicialDia = Number(data.km_iniciar || 0);
  const kmFinalDia   = Number(data.km_final   || 0);
  const kmTotalDia   = Math.max(0, kmFinalDia - kmInicialDia);

  const markX = (flag) => (flag ? 'X' : '');

  const generatePDF = () => {
    // Folosim mm pentru poziționare exactă
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = margin;

    // Antet
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    const title = 'PARTE DIARIO';
    doc.text(title, margin, y);
    y += 8;

    doc.setDrawColor(34, 197, 94);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    // Meta
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Chofer: ${chofer}`, margin, y); y += 6;
    doc.text(`Camión: ${camion}`, margin, y); y += 6;
    doc.text(`Fecha: ${data.day} ${data.monthName} ${data.year}`, margin, y);
    y += 10;

    // Kilómetros (semanal)
    doc.setFont('helvetica', 'bold');
    doc.text('Kilómetros (semanal)', margin, y);
    y += 6;

    const boxH = 10;
    const cW = (pageW - margin * 2 - 8) / 3; // 3 coloane + 2 spații de 4mm
    const kmBlocks = [
      { label: 'KM inicial (Lunes)', value: String(kmLunes) },
      { label: 'KM final (Viernes)', value: String(kmViernes) },
      { label: 'KM total semana', value: String(kmTotalSemana) },
    ];
    kmBlocks.forEach((b, i) => {
      const x = margin + i * (cW + 4);
      doc.setFont('helvetica', 'normal');
      doc.setDrawColor(200, 200, 200);
      doc.rect(x, y, cW, boxH);
      doc.text(b.label, x + 2, y + 4.3);
      doc.setFont('helvetica', 'bold');
      doc.text(b.value, x + cW - 2, y + 8, { align: 'right' });
    });
    y += boxH + 8;

    // Dietas (tabel)
    doc.setFont('helvetica', 'bold');
    doc.text('Dietas', margin, y);
    y += 4;

    const headers = ['Concepto', 'Des.', 'Cena', 'Pro-cena', 'Festivo'];
    const colW = [60, 20, 20, 28, 22]; // total 150mm dacă pagina ~180mm util
    const tableW = colW.reduce((s, v) => s + v, 0);
    const startX = margin;

    const drawRow = (vals, yRow, isHeader = false) => {
      let x = startX;
      vals.forEach((txt, idx) => {
        doc.setDrawColor(190, 190, 190);
        doc.rect(x, yRow, colW[idx], 8);
        doc.setFont('helvetica', isHeader ? 'bold' : 'normal');
        doc.setFontSize(11);
        if (idx === 0) {
          doc.text(String(txt), x + 2, yRow + 5.3);
        } else {
          const t = String(txt);
          const tw = doc.getTextWidth(t);
          doc.text(t, x + colW[idx] / 2, yRow + 5.3, { align: 'center' });
        }
        x += colW[idx];
      });
    };

    drawRow(headers, y, true);
    y += 8;
    const dietaRow = [
      'Aplicación',
      markX(!!data.desayuno),
      markX(!!data.cena),
      markX(!!data.procena),
      markX(!!data.festivo || !!data.suma_festivo),
    ];
    drawRow(dietaRow, y, false);
    y += 12;

    // Itinerario (centrat)
    doc.setFont('helvetica', 'bold');
    doc.text('Itinerario', margin, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    const itinerarios = Array.isArray(data.curse) && data.curse.length > 0
      ? data.curse.map(c => `${c.start || 'N/A'}  →  ${c.end || 'N/A'}`)
      : ['— sin carreras registradas —'];

    itinerarios.forEach(line => {
      const tw = doc.getTextWidth(line);
      const cx = pageW / 2;
      doc.text(line, cx, y, { align: 'center' });
      y += 6;
    });
    y += 6;

    // Tabla „Datos adicionales” – prezență fizică
    doc.setFont('helvetica', 'bold');
    doc.text('Datos adicionales (opcionales)', margin, y);
    y += 4;

    const auxCols = ['Hora salida', 'Hora llegada', 'Referencia', 'Observaciones'];
    const auxW = [30, 30, 45, tableW - 30 - 30 - 45]; // se încadrează în lățimea tabelului dietas
    let ax = startX;
    // antet
    auxCols.forEach((h, i) => {
      doc.setDrawColor(190, 190, 190);
      doc.rect(ax, y, auxW[i], 8);
      doc.text(h, ax + auxW[i] / 2, y + 5.3, { align: 'center' });
      ax += auxW[i];
    });
    // rând gol
    y += 8;
    ax = startX;
    auxW.forEach(w => {
      doc.rect(ax, y, w, 12);
      ax += w;
    });
    y += 16;

    // Notă km zi (informativ)
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.text(
      `KM del día — inicio: ${kmInicialDia}, fin: ${kmFinalDia}, total: ${kmTotalDia}`,
      margin, y
    );

    doc.save(`parte-diario-${data.day}-${data.monthName}.pdf`);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      {/* IMPORTANT: containerul sheet e scrollabil, overlay-ul NU închide la scroll */}
      <div className={styles.summarySheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h1>PARTE DIARIO</h1>
          <button className={styles.pdfButton} onClick={generatePDF}>📄 Generar PDF</button>
        </div>

        <div className={styles.metaInfo}>
          <div><span>CHOFER:</span> {chofer}</div>
          <div><span>CAMIÓN:</span> {camion}</div>
          <div><span>FECHA:</span> {`${data.day} ${data.monthName} ${data.year}`}</div>
        </div>

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
                <td></td><td></td><td></td><td></td>
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
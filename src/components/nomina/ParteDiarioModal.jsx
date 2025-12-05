import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import styles from './Nominas.module.css';
import SearchableInput from './SearchableInput';

// -------- ICONOS ----------
const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"
       viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" x2="6" y1="6" y2="18"/>
    <line x1="6" x2="18" y1="6" y2="18"/>
  </svg>
);

const GpsFixedIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
       viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <line x1="12" y1="2" x2="12" y2="6" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="22" y1="12" x2="18" y2="12" />
    <line x1="6" y1="12" x2="2" y2="12" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
       viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4
              a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

// ---------- DISTANȚĂ ----------
function haversineDistance(a, b) {
  const toRad = (x) => x * Math.PI / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const s = Math.sin;

  const term = s(dLat/2)**2 +
               Math.cos(toRad(a.lat)) *
               Math.cos(toRad(b.lat)) *
               s(dLon/2)**2;

  return 2 * R * Math.atan2(Math.sqrt(term), Math.sqrt(1 - term));
}


// ======================= MODAL GPS =============================
const GpsSelectionModal = ({ locations, onSelect, onClose, isLoading }) => (
  <div className={styles.modalOverlay} onClick={onClose}>
    <div className={styles.modal} style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
      <div className={styles.modalHeader}>
        <h3 className={styles.modalTitle}>Selecciona una ubicación</h3>
        <button className={styles.closeIcon} onClick={onClose}><CloseIcon /></button>
      </div>

      <div className={styles.gpsResultsList}>
        {isLoading && <p>Buscando ubicaciones cercanas…</p>}
        {!isLoading && locations.length === 0 && (
          <p>No se han encontrado ubicaciones cercanas.</p>
        )}

        {locations.map((loc, idx) => (
          <div key={idx} className={styles.gpsResultItem}
               onClick={() => onSelect(loc.name)}>
            <strong>{loc.name}</strong>
            <span>~ {Math.round(loc.distance * 1000)} m</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);


// ====================================================================
//                      PARTE DIARIO MODAL
// ====================================================================

export default function ParteDiarioModal({
  isOpen,
  onClose,
  data,
  onDataChange,
  onToggleChange,
  onCurseChange,
  day,
  monthName,
  year
}) {

  const safeData = data || {};
  const [isGpsModalOpen, setIsGpsModalOpen] = useState(false);
  const [gpsResults, setGpsResults] = useState([]);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [activeGpsSearch, setActiveGpsSearch] = useState(null);
  const [coordsIndex, setCoordsIndex] = useState({});
  const [trucks, setTrucks] = useState([]);

  const mainCamion = safeData.camion_matricula || '';

  // ---------------- LOAD COORDINATE -----------------
  useEffect(() => {
    if (!isOpen) return;

    (async () => {
      const tables = [
        'gps_clientes',
        'gps_parkings',
        'gps_servicios',
        'gps_terminale'
      ];

      try {
        const res = await Promise.all(
          tables.map(t => supabase.from(t).select('nombre, coordenadas'))
        );

        const idx = {};
        res.forEach(({ data }) => {
          (data || []).forEach(row => {
            if (!row.coordenadas) return;
            const [lat, lon] = row.coordenadas
              .replace(/[()]/g, '')
              .split(',')
              .map(n => parseFloat(n.trim()));

            if (!isNaN(lat) && !isNaN(lon)) {
              idx[row.nombre] = { lat, lon };
            }
          });
        });

        setCoordsIndex(idx);
      } catch (e) {
        console.error('coord load error', e);
      }
    })();
  }, [isOpen]);

  // ------------- LOAD TRUCKS -----------------
  useEffect(() => {
    if (!isOpen) return;

    (async () => {
      try {
        const { data } = await supabase
          .from('camioane')
          .select('id, matricula')
          .order('matricula', { ascending: true });

        setTrucks(data || []);
      } catch (e) {
        console.error('truck load error', e);
      }
    })();
  }, [isOpen]);

  // ⚠️ TOATE HOOK-URILE trebuie declarate înainte de orice return
  const kmIniciar = safeData.km_iniciar ?? '';
  const kmFinal   = safeData.km_final ?? '';
  const kmShow = Math.max(0, Number(kmFinal) - Number(kmIniciar));

  const autoKmFor = (start, end) => {
    const A = coordsIndex[start];
    const B = coordsIndex[end];
    if (!A || !B) return null;
    return Math.round(haversineDistance(A, B) * 10) / 10;
  };

  // useMemo este acum declarat ÎNAINTE de return
  const curse = useMemo(
    () => (Array.isArray(safeData.curse) ? safeData.curse : []),
    [safeData.curse]
  );

  // Abia acum putem face early-return
  if (!isOpen) return null;

  const onNum = (e) => {
    const name = e.target.name;
    const val = e.target.value === '' ? '' : Number(e.target.value);
    onDataChange(name, val);
  };

  const handleCursaChange = (index, field, value) => {
    const newCurse = [...curse];
    const prev = newCurse[index] || {
      start: '',
      end: '',
      camion_matricula: mainCamion || ''
    };

    const updated = { ...prev, [field]: value };

    const kmAuto = autoKmFor(updated.start, updated.end);
    if (kmAuto != null) updated.km_auto = kmAuto;

    newCurse[index] = updated;
    onCurseChange(newCurse);
  };

  const addCursa = () => {
    onCurseChange([
      ...curse,
      { start: '', end: '', camion_matricula: mainCamion || '' }
    ]);
  };

  const removeCursa = (index) => {
    onCurseChange(curse.filter((_, i) => i !== index));
  };


  return (
    <>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>

          {/* HEADER */}
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>
              Parte diario — {day} {monthName} {year}
            </h3>
            <button className={styles.closeIcon} onClick={onClose}>
              <CloseIcon />
            </button>
          </div>


          {/* BODY */}
          <div className={styles.modalBody}>

            {/* -------- VEHICULO -------- */}
            <div className={styles.parteDiarioSection}>
              <h4>Vehículo</h4>
              <div className={styles.inputGroup}>
                <label>Camión del día</label>

                <select
                  className={styles.select}
                  value={mainCamion}
                  onChange={(e) => onDataChange('camion_matricula', e.target.value)}
                >
                  <option value="">(Por defecto)</option>
                  {trucks.map(t => (
                    <option key={t.id} value={t.matricula}>
                      {t.matricula}
                    </option>
                  ))}
                </select>

                <p className={styles.smallHint}>
                  Puedes cambiar el camión por carrera si ese día trabajaste con más de uno.
                </p>
              </div>
            </div>


            {/* --------- DIETAS ----------- */}
            <div className={styles.parteDiarioSection}>
              <h4>Dietas</h4>

              <div className={styles.checkboxGroupModal}>
                <label>
                  <input
                    type="checkbox"
                    checked={!!safeData.desayuno}
                    onChange={() => onToggleChange('desayuno')}
                  /> Desayuno
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={!!safeData.cena}
                    onChange={() => onToggleChange('cena')}
                  /> Cena
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={!!safeData.procena}
                    onChange={() => onToggleChange('procena')}
                  /> Pro-cena
                </label>
              </div>
            </div>


            {/* --------- KILOMETROS ----------- */}
            <div className={styles.parteDiarioSection}>
              <h4>Kilómetros</h4>

              <div className={styles.inputGrid}>
                <div className={styles.inputGroup}>
                  <label>KM inicio</label>
                  <input
                    type="number"
                    name="km_iniciar"
                    value={kmIniciar}
                    onChange={onNum}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label>KM fin</label>
                  <input
                    type="number"
                    name="km_final"
                    value={kmFinal}
                    onChange={onNum}
                  />
                </div>
              </div>

              <p className={styles.kmPreview}>
                KM del día: <b>{kmShow}</b>
              </p>
            </div>


            {/* --------- CARRERAS ----------- */}
            <div className={styles.parteDiarioSection}>
              <h4>Carreras del día</h4>

              <div className={styles.curseList}>
                {curse.map((cursa, i) => {
                  const kmAuto = autoKmFor(cursa.start, cursa.end);
                  const cursaCamion = cursa.camion_matricula || mainCamion || '';

                  return (
                    <div key={i} className={styles.cursaItem}>
                      <div className={styles.cursaInputs}>

                        {/* SALIDA */}
                        <div className={styles.inputGroup}>
                          <label>Salida</label>
                          <div className={styles.inputWithButton}>

                            <SearchableInput
                              value={cursa.start || ''}
                              onChange={(v) => handleCursaChange(i, 'start', v)}
                              onLocationSelect={(name) => handleCursaChange(i, 'start', name)}
                              placeholder="Ej.: Parking"
                              closeOnSelect
                            />

                            <button
                              type="button"
                              onClick={() => {
                                setActiveGpsSearch({ index: i, field: 'start' });
                                setIsGpsModalOpen(true);
                              }}
                            >
                              <GpsFixedIcon />
                            </button>

                          </div>
                        </div>

                        {/* LLEGADA */}
                        <div className={styles.inputGroup}>
                          <label>Llegada</label>
                          <div className={styles.inputWithButton}>

                            <SearchableInput
                              value={cursa.end || ''}
                              onChange={(v) => handleCursaChange(i, 'end', v)}
                              onLocationSelect={(name) => handleCursaChange(i, 'end', name)}
                              placeholder="Ej.: TCB"
                              closeOnSelect
                            />

                            <button
                              type="button"
                              onClick={() => {
                                setActiveGpsSearch({ index: i, field: 'end' });
                                setIsGpsModalOpen(true);
                              }}
                            >
                              <GpsFixedIcon />
                            </button>

                          </div>
                        </div>

                        {/* CAMION CURSA */}
                        <div className={styles.inputGroup}>
                          <label>Camión</label>

                          <select
                            className={styles.select}
                            value={cursaCamion}
                            onChange={(e) =>
                              handleCursaChange(i, 'camion_matricula', e.target.value || null)
                            }
                          >
                            <option value="">(Día)</option>
                            {trucks.map(t => (
                              <option key={t.id} value={t.matricula}>
                                {t.matricula}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* KM AUTO */}
                        <div className={styles.inputGroup}>
                          <label>KM aprox.</label>
                          <input disabled value={kmAuto ?? '—'} />
                        </div>

                      </div>

                      <button className={styles.removeCursaButton}
                              onClick={() => removeCursa(i)}>
                        <TrashIcon />
                      </button>

                    </div>
                  );
                })}
              </div>

              <button className={styles.addCursaButton} onClick={addCursa}>
                + Añadir carrera
              </button>
            </div>


            {/* --------- ACTIVIDADES ----------- */}
            <div className={styles.parteDiarioSection}>
              <h4>Actividades especiales</h4>

              <div className={styles.inputGrid}>
                <div className={styles.inputGroup}>
                  <label>Contenedores barridos</label>
                  <input
                    type="number"
                    name="contenedores"
                    value={safeData.contenedores ?? ''}
                    onChange={onNum}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label>Plus festivo (€)</label>
                  <input
                    type="number"
                    name="suma_festivo"
                    value={safeData.suma_festivo ?? ''}
                    onChange={onNum}
                  />
                </div>
              </div>
            </div>

          </div>


          {/* FOOTER */}
          <div className={styles.modalFooter}>
            <button className={styles.actionMini} type="button" onClick={onClose}>
              Cerrar
            </button>
          </div>

        </div>
      </div>

      {isGpsModalOpen && (
        <GpsSelectionModal
          locations={gpsResults}
          onSelect={(locName) => {
            if (activeGpsSearch) {
              handleCursaChange(activeGpsSearch.index, activeGpsSearch.field, locName);
            }
            setIsGpsModalOpen(false);
          }}
          onClose={() => setIsGpsModalOpen(false)}
          isLoading={gpsLoading}
        />
      )}

    </>
  );
}
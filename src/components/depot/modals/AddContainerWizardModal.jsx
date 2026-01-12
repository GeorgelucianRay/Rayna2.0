// src/components/depot/modals/AddContainerWizardModal.jsx
import React, { useMemo, useState } from 'react';
import Modal from '../../ui/Modal';
import shell from '../../ui/Modal.module.css';
import styles from './AddContainerModal.module.css';

/* ===== Helpers poziție (identic ca în AddContainerModal) ===== */
function parsePos(s) {
  const t = String(s || '').trim().toUpperCase();
  if (!t) return null;
  if (t === 'PENDIENTE') return { pending: true };
  const m = /^([A-F])(10|[1-9])([A-E])$/.exec(t);
  if (!m) return null;
  const fila = m[1];
  const num = Number(m[2]);
  const nivel = m[3];
  const max = ['A', 'B', 'C'].includes(fila) ? 10 : 7;
  if (num < 1 || num > max) return null;
  return { fila, num, nivel };
}
const composePos = ({ fila, num, nivel, pending }) =>
  pending ? 'PENDIENTE' : `${fila}${num}${nivel}`;
/* ============================================================ */

function StepTitle({ current, total, title, subtitle }) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div style={{ fontWeight: 900, fontSize: 13, opacity: 0.85 }}>
        Paso {current}/{total}
      </div>
      <div style={{ fontWeight: 900, fontSize: 18 }}>{title}</div>
      {subtitle && <div style={{ opacity: 0.85, fontSize: 13 }}>{subtitle}</div>}
    </div>
  );
}

export default function AddContainerWizardModal({
  isOpen,
  onClose,
  onAdd,
  validatePosition,
  slotMap, // (nefolosit acum)
}) {
  const TOTAL_STEPS = 7;

  const [step, setStep] = useState(1);

  // === FORM STATE (identic ca în AddContainerModal) ===
  const [matricula, setMatricula] = useState('');
  const [naviera, setNaviera] = useState('');
  const [tipo, setTipo] = useState('20');
  const [estado, setEstado] = useState('Lleno');
  const [detalles, setDetalles] = useState('');
  const [matCamion, setMatCamion] = useState('');
  const [isBroken, setIsBroken] = useState(false);

  // === POSIȚIE ===
  const [pending, setPending] = useState(false);
  const [fila, setFila] = useState('A');
  const [num, setNum] = useState(1);
  const [nivel, setNivel] = useState('A');
  const [freeInput, setFreeInput] = useState('');
  const [mode, setMode] = useState('picker'); // 'picker' | 'manual'

  const filas = ['A', 'B', 'C', 'D', 'E', 'F'];
  const niveles = ['A', 'B', 'C', 'D', 'E'];

  const numerosDisponibles = useMemo(() => {
    const max = ['A', 'B', 'C'].includes(fila) ? 10 : 7;
    return Array.from({ length: max }, (_, i) => i + 1);
  }, [fila]);

  const composed = useMemo(() => {
    if (mode === 'manual') return (freeInput || '').toUpperCase();
    return composePos({ fila, num, nivel, pending });
  }, [fila, num, nivel, pending, mode, freeInput]);

  const validPos = useMemo(() => {
    const p = parsePos(composed);
    return p || composed === 'PENDIENTE';
  }, [composed]);

  const resetAll = () => {
    setStep(1);

    setMatricula('');
    setNaviera('');
    setTipo('20');
    setEstado('Lleno');
    setDetalles('');
    setMatCamion('');
    setIsBroken(false);

    setPending(false);
    setFila('A');
    setNum(1);
    setNivel('A');
    setFreeInput('');
    setMode('picker');
  };

  const close = () => {
    resetAll();
    onClose?.();
  };

  // === Validări pe pași ===
  const stepOk = useMemo(() => {
    const matOk = (matricula || '').trim().length >= 4;

    if (step === 1) return matOk;
    if (step === 2) return true; // naviera optional
    if (step === 3) return true; // tipo
    if (step === 4) return true; // estado/roto
    if (step === 5) {
      if (isBroken) return (detalles || '').trim().length >= 3; // dacă e rupt cere detalii minime
      return true;
    }
    if (step === 6) return !!validPos; // poziție validă
    if (step === 7) return true; // camion optional

    return false;
  }, [step, matricula, validPos, isBroken, detalles]);

  const next = () => {
    if (!stepOk) return;
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  };

  const back = () => setStep((s) => Math.max(1, s - 1));

  // === SUBMIT FINAL ===
  const handleFinish = async () => {
    // validare minimă finală
    const matOk = (matricula || '').trim().length >= 4;
    if (!matOk) return alert('Introduce la matrícula del contenedor.');
    if (!validPos) return alert('Introduce una posición válida.');

    const pos = (composed || '').toUpperCase();

    // coliziune
    if (validatePosition && pos !== 'PENDIENTE') {
      const res = await validatePosition(pos, tipo, null);
      if (!res.ok) {
        const { matricula_contenedor, posicion } = res.conflict;
        alert(`Lo siento, la posición está ocupada por: ${matricula_contenedor} (${posicion})`);
        return;
      }
    }

    const base = {
      matricula_contenedor: matricula.toUpperCase(),
      naviera: naviera || null,
      tipo,
      posicion: pos,
      matricula_camion: matCamion.toUpperCase() || null,
    };

    const payload = isBroken
      ? { ...base, detalles: detalles || null }
      : { ...base, estado, detalles: null };

    try {
      await onAdd?.(payload, isBroken);
      close();
    } catch (err) {
      console.error(err);
      alert('Error al añadir contenedor.');
    }
  };

  // === UI pentru fiecare pas ===
  const StepBody = () => {
    if (step === 1) {
      return (
        <>
          <StepTitle
            current={1}
            total={TOTAL_STEPS}
            title="Matrícula del contenedor"
            subtitle="Escribe la matrícula y pulsa Siguiente."
          />
          <div className={styles.block} style={{ marginTop: 14 }}>
            <span className={styles.label}>Matrícula Contenedor</span>
            <input
              className={styles.input}
              value={matricula}
              onChange={(e) => setMatricula(e.target.value.toUpperCase())}
              style={{ textTransform: 'uppercase' }}
              placeholder="Ej: MSCU1234567"
              autoFocus
            />
          </div>
        </>
      );
    }

    if (step === 2) {
      return (
        <>
          <StepTitle
            current={2}
            total={TOTAL_STEPS}
            title="Naviera (opcional)"
            subtitle="Si no sabes, lo puedes dejar vacío."
          />
          <div className={styles.block} style={{ marginTop: 14 }}>
            <span className={styles.label}>Naviera</span>
            <input
              className={styles.input}
              value={naviera}
              onChange={(e) => setNaviera(e.target.value)}
              placeholder="Ej: MAERSK"
            />
          </div>
        </>
      );
    }

    if (step === 3) {
      return (
        <>
          <StepTitle
            current={3}
            total={TOTAL_STEPS}
            title="Tipo"
            subtitle="Selecciona el tamaño del contenedor."
          />
          <div className={styles.block} style={{ marginTop: 14 }}>
            <span className={styles.label}>Tipo</span>
            <select className={styles.select} value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option>20</option>
              <option>40</option>
              <option>45</option>
            </select>
          </div>
        </>
      );
    }

    if (step === 4) {
      return (
        <>
          <StepTitle
            current={4}
            total={TOTAL_STEPS}
            title="Estado / Roto"
            subtitle="Marca si está roto. Si no, elige lleno o vacío."
          />

          <label className={styles.switchRow} style={{ marginTop: 14 }}>
            <span className={styles.label}>Marcar como roto</span>
            <label className={styles.switch}>
              <input type="checkbox" checked={isBroken} onChange={(e) => setIsBroken(e.target.checked)} />
              <span className={styles.switchTrack}></span>
              <span className={styles.switchThumb}></span>
            </label>
          </label>

          {!isBroken && (
            <div className={styles.block} style={{ marginTop: 12 }}>
              <span className={styles.label}>Estado</span>
              <select className={styles.select} value={estado} onChange={(e) => setEstado(e.target.value)}>
                <option>Lleno</option>
                <option>Vacío</option>
              </select>
            </div>
          )}
        </>
      );
    }

    if (step === 5) {
      return (
        <>
          <StepTitle
            current={5}
            total={TOTAL_STEPS}
            title={isBroken ? 'Detalles del defecto' : 'Confirmación rápida'}
            subtitle={isBroken ? 'Describe el defecto y pulsa Siguiente.' : 'Todo OK. Pulsa Siguiente.'}
          />

          {isBroken ? (
            <div className={styles.block} style={{ marginTop: 14 }}>
              <span className={styles.label}>Detalles (defecto)</span>
              <textarea
                className={styles.area}
                rows={4}
                value={detalles}
                onChange={(e) => setDetalles(e.target.value)}
                placeholder="Ej: puerta doblada, golpes laterales…"
              />
            </div>
          ) : (
            <div style={{ marginTop: 14, opacity: 0.85 }}>
              ✅ Contenedor no marcado como roto.
            </div>
          )}
        </>
      );
    }

    if (step === 6) {
      return (
        <>
          <StepTitle
            current={6}
            total={TOTAL_STEPS}
            title="Posición"
            subtitle="Elige con selector o escribe manualmente."
          />

          <div className={styles.segment} style={{ marginTop: 14 }}>
            <button
              type="button"
              className={`${styles.segmentBtn} ${mode === 'picker' ? styles.active : ''}`}
              onClick={() => setMode('picker')}
            >
              Selector
            </button>

            <button
              type="button"
              className={`${styles.segmentBtn} ${mode === 'manual' ? styles.active : ''}`}
              onClick={() => setMode('manual')}
            >
              Manual
            </button>
          </div>

          {mode === 'picker' ? (
            <>
              <label className={styles.switchRow} style={{ marginTop: 12 }}>
                <span className={styles.label}>Pendiente</span>
                <label className={styles.switch}>
                  <input type="checkbox" checked={pending} onChange={(e) => setPending(e.target.checked)} />
                  <span className={styles.switchTrack}></span>
                  <span className={styles.switchThumb}></span>
                </label>
              </label>

              {!pending && (
                <>
                  <div className={styles.block} style={{ marginTop: 10 }}>
                    <span className={styles.label}>Fila</span>
                    <div className={styles.pills}>
                      {filas.map((f) => (
                        <button
                          key={f}
                          type="button"
                          className={`${styles.pill} ${fila === f ? styles.pillActive : ''}`}
                          onClick={() => setFila(f)}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={styles.grid2} style={{ marginTop: 10 }}>
                    <div className={styles.block}>
                      <span className={styles.label}>Número</span>
                      <select
                        className={styles.select}
                        value={num}
                        onChange={(e) => setNum(Number(e.target.value))}
                      >
                        {numerosDisponibles.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.block}>
                      <span className={styles.label}>Nivel</span>
                      <select className={styles.select} value={nivel} onChange={(e) => setNivel(e.target.value)}>
                        {niveles.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div className={styles.preview} style={{ marginTop: 10 }}>
                Posición: <strong>{composed || '—'}</strong>
              </div>

              {!validPos && (
                <div style={{ marginTop: 8, color: '#ffb4b4', fontWeight: 800 }}>
                  Posición inválida.
                </div>
              )}
            </>
          ) : (
            <>
              <div className={styles.block} style={{ marginTop: 12 }}>
                <span className={styles.label}>Posición (manual)</span>
                <input
                  className={styles.input}
                  value={freeInput}
                  onChange={(e) => setFreeInput(e.target.value.toUpperCase())}
                  placeholder="Ej: A1A o PENDIENTE"
                  style={{ textTransform: 'uppercase' }}
                />
              </div>

              {!validPos && (
                <div style={{ marginTop: 8, color: '#ffb4b4', fontWeight: 800 }}>
                  Posición inválida.
                </div>
              )}
            </>
          )}
        </>
      );
    }

    // step 7
    return (
      <>
        <StepTitle
          current={7}
          total={TOTAL_STEPS}
          title="Matrícula del camión (opcional)"
          subtitle="Si no aplica, lo puedes dejar vacío."
        />
        <div className={styles.block} style={{ marginTop: 14 }}>
          <span className={styles.label}>Matrícula Camión (opcional)</span>
          <input
            className={styles.input}
            value={matCamion}
            onChange={(e) => setMatCamion(e.target.value.toUpperCase())}
            style={{ textTransform: 'uppercase' }}
            placeholder="Ej: 1234ABC"
          />
        </div>

        <div style={{ marginTop: 14, opacity: 0.85 }}>
          ✅ Listo. Pulsa <strong>Guardar</strong> para registrar.
        </div>
      </>
    );
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={close} ariaLabel="Añadir Contenedor (Wizard)" fillOnMobile>
      <div className={shell.slotHeader}>
        <h3 className={styles.title}>Añadir Contenedor</h3>
      </div>

      <div className={shell.slotContent}>
        <div className={styles.ios}>
          <StepBody />
        </div>
      </div>

      <div className={shell.slotFooter}>
        <div className={styles.actions}>
          <button type="button" className={styles.btn} onClick={close}>
            Cancelar
          </button>

          <button
            type="button"
            className={styles.btn}
            onClick={back}
            disabled={step === 1}
            style={{ opacity: step === 1 ? 0.6 : 1 }}
          >
            Atrás
          </button>

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              className={`${styles.btn} ${styles.primary}`}
              onClick={next}
              disabled={!stepOk}
            >
              Siguiente
            </button>
          ) : (
            <button
              type="button"
              className={`${styles.btn} ${styles.primary}`}
              onClick={handleFinish}
            >
              Guardar
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
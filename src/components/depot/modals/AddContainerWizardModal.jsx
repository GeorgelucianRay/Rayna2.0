import React, { useEffect, useMemo, useRef, useState } from "react";
import Modal from "../../ui/Modal";
import shell from "../../ui/Modal.module.css";

// ✅ HUD shared (Stich style)
import hud from "./WizardHud.module.css";

// ✅ păstrăm controalele existente (switch/segment/pills) din AddContainerModal.module.css
import styles from "./AddContainerModal.module.css";

/* ===== Helpers poziție (identic ca în AddContainerModal) ===== */
function parsePos(s) {
  const t = String(s || "").trim().toUpperCase();
  if (!t) return null;
  if (t === "PENDIENTE") return { pending: true };
  const m = /^([A-F])(10|[1-9])([A-E])$/.exec(t);
  if (!m) return null;
  const fila = m[1];
  const num = Number(m[2]);
  const nivel = m[3];
  const max = ["A", "B", "C"].includes(fila) ? 10 : 7;
  if (num < 1 || num > max) return null;
  return { fila, num, nivel };
}
const composePos = ({ fila, num, nivel, pending }) =>
  pending ? "PENDIENTE" : `${fila}${num}${nivel}`;
/* ============================================================ */

export default function AddContainerWizardModal({
  isOpen,
  onClose,
  onAdd,
  validatePosition,
  slotMap, // (nefolosit acum)
}) {
  const TOTAL = 7;

  const [step, setStep] = useState(1);

  // === FORM STATE ===
  const [matricula, setMatricula] = useState("");
  const [naviera, setNaviera] = useState("");
  const [tipo, setTipo] = useState("20");
  const [estado, setEstado] = useState("Lleno");
  const [detalles, setDetalles] = useState("");
  const [matCamion, setMatCamion] = useState("");
  const [isBroken, setIsBroken] = useState(false);

  // === POSIȚIE ===
  const [pending, setPending] = useState(false);
  const [fila, setFila] = useState("A");
  const [num, setNum] = useState(1);
  const [nivel, setNivel] = useState("A");
  const [freeInput, setFreeInput] = useState("");
  const [mode, setMode] = useState("picker"); // 'picker' | 'manual'

  const filas = ["A", "B", "C", "D", "E", "F"];
  const niveles = ["A", "B", "C", "D", "E"];

  const numerosDisponibles = useMemo(() => {
    const max = ["A", "B", "C"].includes(fila) ? 10 : 7;
    return Array.from({ length: max }, (_, i) => i + 1);
  }, [fila]);

  const composed = useMemo(() => {
    if (mode === "manual") return (freeInput || "").toUpperCase();
    return composePos({ fila, num, nivel, pending });
  }, [fila, num, nivel, pending, mode, freeInput]);

  const validPos = useMemo(() => {
    const p = parsePos(composed);
    return p || composed === "PENDIENTE";
  }, [composed]);

  // ====== refs pt focus (iOS-friendly) ======
  const inMatRef = useRef(null);
  const inNavRef = useRef(null);
  const inDetRef = useRef(null);
  const inPosRef = useRef(null);   // manual
  const inTruckRef = useRef(null);

  const resetAll = () => {
    setStep(1);

    setMatricula("");
    setNaviera("");
    setTipo("20");
    setEstado("Lleno");
    setDetalles("");
    setMatCamion("");
    setIsBroken(false);

    setPending(false);
    setFila("A");
    setNum(1);
    setNivel("A");
    setFreeInput("");
    setMode("picker");
  };

  const close = () => {
    resetAll();
    onClose?.();
  };

  // când se deschide modalul
  useEffect(() => {
    if (!isOpen) return;
    resetAll();
    setTimeout(() => inMatRef.current?.focus?.(), 80);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // focus la schimbarea step-ului (mic delay pt iOS)
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => {
      if (step === 1) inMatRef.current?.focus?.();
      if (step === 2) inNavRef.current?.focus?.();
      if (step === 5 && isBroken) inDetRef.current?.focus?.();
      if (step === 6 && mode === "manual") inPosRef.current?.focus?.();
      if (step === 7) inTruckRef.current?.focus?.();
    }, 80);
    return () => clearTimeout(t);
  }, [step, isOpen, isBroken, mode]);

  // ===== Validări pe pași =====
  const stepOk = useMemo(() => {
    const matOk = (matricula || "").trim().length >= 4;

    if (step === 1) return matOk;
    if (step === 2) return true; // naviera optional
    if (step === 3) return true; // tipo
    if (step === 4) return true; // estado/roto
    if (step === 5) {
      if (isBroken) return (detalles || "").trim().length >= 3;
      return true;
    }
    if (step === 6) return !!validPos;
    if (step === 7) return true;

    return false;
  }, [step, matricula, validPos, isBroken, detalles]);

  const back = () => setStep((s) => Math.max(1, s - 1));
  const next = () => {
    if (!stepOk) return;
    setStep((s) => Math.min(TOTAL, s + 1));
  };

  // ===== SUBMIT FINAL =====
  const handleFinish = async () => {
    const matOk = (matricula || "").trim().length >= 4;
    if (!matOk) return alert("Introduce la matrícula del contenedor.");
    if (!validPos) return alert("Introduce una posición válida.");

    const pos = (composed || "").toUpperCase();

    // coliziune
    if (validatePosition && pos !== "PENDIENTE") {
      const res = await validatePosition(pos, tipo, null);
      if (!res.ok) {
        const { matricula_contenedor, posicion } = res.conflict;
        alert(
          `Lo siento, la posición está ocupada por: ${matricula_contenedor} (${posicion})`
        );
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
      alert("Error al añadir contenedor.");
    }
  };

  if (!isOpen) return null;

  // header title
  const headerTitle = "Entrada • Añadir Contenedor";

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      ariaLabel="Añadir Contenedor (Wizard)"
      fillOnMobile
    >
      <div className={shell.slotHeader}>
        <h3
          style={{
            margin: 0,
            fontWeight: 900,
            color: "#00e5ff",
            textTransform: "uppercase",
            letterSpacing: ".05em",
          }}
        >
          {headerTitle}
        </h3>
      </div>

      <div className={shell.slotContent}>
        <div className={hud.ios}>
          {/* progress */}
          <div className={hud.progressBar}>
            <div
              className={hud.progressFill}
              style={{ width: `${(step / TOTAL) * 100}%` }}
            />
          </div>

          {/* STEP 1 */}
          <div style={{ display: step === 1 ? "block" : "none" }}>
            <h4 className={hud.stepTitle}>1) Matrícula del contenedor</h4>
            <div className={hud.stepHint}>Scrie matrícula și apasă Siguiente.</div>

            <span className={hud.label}>Matrícula</span>
            <input
              ref={inMatRef}
              className={`${hud.input} ${hud.mono}`}
              value={matricula}
              onChange={(e) => setMatricula(e.target.value.toUpperCase())}
              placeholder="Ej: MSCU1234567"
              autoCapitalize="characters"
              spellCheck={false}
            />
          </div>

          {/* STEP 2 */}
          <div style={{ display: step === 2 ? "block" : "none" }}>
            <h4 className={hud.stepTitle}>2) Naviera (opcional)</h4>
            <div className={hud.stepHint}>Dacă nu știi, poți lăsa gol.</div>

            <span className={hud.label}>Naviera</span>
            <input
              ref={inNavRef}
              className={hud.input}
              value={naviera}
              onChange={(e) => setNaviera(e.target.value)}
              placeholder="Ej: MAERSK"
              spellCheck={false}
            />
          </div>

          {/* STEP 3 */}
          <div style={{ display: step === 3 ? "block" : "none" }}>
            <h4 className={hud.stepTitle}>3) Tipo</h4>
            <div className={hud.stepHint}>Alege dimensiunea containerului.</div>

            <span className={hud.label}>Tipo</span>
            <select
              className={hud.select}
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            >
              <option>20</option>
              <option>40</option>
              <option>45</option>
            </select>
          </div>

          {/* STEP 4 */}
          <div style={{ display: step === 4 ? "block" : "none" }}>
            <h4 className={hud.stepTitle}>4) Estado / Roto</h4>
            <div className={hud.stepHint}>
              Marchează dacă e roto. Dacă nu, alege Lleno / Vacío.
            </div>

            {/* păstrăm switch-ul tău (UI existent) */}
            <label className={styles.switchRow} style={{ marginTop: 12 }}>
              <span className={hud.label} style={{ marginBottom: 0 }}>
                Marcar como roto
              </span>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={isBroken}
                  onChange={(e) => setIsBroken(e.target.checked)}
                />
                <span className={styles.switchTrack} />
                <span className={styles.switchThumb} />
              </label>
            </label>

            {!isBroken && (
              <div style={{ marginTop: 12 }}>
                <span className={hud.label}>Estado</span>
                <select
                  className={hud.select}
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                >
                  <option>Lleno</option>
                  <option>Vacío</option>
                </select>
              </div>
            )}

            {isBroken && (
              <div className={hud.card} style={{ marginTop: 12 }}>
                <b>ℹ️</b> Dacă e roto, la pasul următor trebuie detalii (minim 3 caractere).
              </div>
            )}
          </div>

          {/* STEP 5 */}
          <div style={{ display: step === 5 ? "block" : "none" }}>
            <h4 className={hud.stepTitle}>
              {isBroken ? "5) Detalles del defecto" : "5) Confirmación rápida"}
            </h4>
            <div className={hud.stepHint}>
              {isBroken ? "Descrie defectul și apasă Siguiente." : "Totul OK. Mergem mai departe."}
            </div>

            {isBroken ? (
              <>
                <span className={hud.label}>Detalles</span>
                <textarea
                  ref={inDetRef}
                  className={hud.area}
                  rows={4}
                  value={detalles}
                  onChange={(e) => setDetalles(e.target.value)}
                  placeholder="Ej: puerta doblada, golpes laterales…"
                />
              </>
            ) : (
              <div className={`${hud.card} ${hud.cardGlow}`}>
                ✅ Contenedor no marcado como roto.
              </div>
            )}
          </div>

          {/* STEP 6 */}
          <div style={{ display: step === 6 ? "block" : "none" }}>
            <h4 className={hud.stepTitle}>6) Posición</h4>
            <div className={hud.stepHint}>Selector sau Manual.</div>

            {/* păstrăm segment-ul tău (UI existent) */}
            <div className={styles.segment} style={{ marginTop: 12 }}>
              <button
                type="button"
                className={`${styles.segmentBtn} ${mode === "picker" ? styles.active : ""}`}
                onClick={() => setMode("picker")}
              >
                Selector
              </button>
              <button
                type="button"
                className={`${styles.segmentBtn} ${mode === "manual" ? styles.active : ""}`}
                onClick={() => setMode("manual")}
              >
                Manual
              </button>
            </div>

            {mode === "picker" ? (
              <>
                <label className={styles.switchRow} style={{ marginTop: 12 }}>
                  <span className={hud.label} style={{ marginBottom: 0 }}>
                    Pendiente
                  </span>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={pending}
                      onChange={(e) => setPending(e.target.checked)}
                    />
                    <span className={styles.switchTrack} />
                    <span className={styles.switchThumb} />
                  </label>
                </label>

                {!pending && (
                  <>
                    <div style={{ marginTop: 10 }}>
                      <span className={hud.label}>Fila</span>
                      <div className={styles.pills}>
                        {filas.map((f) => (
                          <button
                            key={f}
                            type="button"
                            className={`${styles.pill} ${fila === f ? styles.pillActive : ""}`}
                            onClick={() => setFila(f)}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={styles.grid2} style={{ marginTop: 10 }}>
                      <div>
                        <span className={hud.label}>Número</span>
                        <select
                          className={hud.select}
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

                      <div>
                        <span className={hud.label}>Nivel</span>
                        <select
                          className={hud.select}
                          value={nivel}
                          onChange={(e) => setNivel(e.target.value)}
                        >
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

                <div className={`${hud.card} ${validPos ? hud.cardGlow : ""}`} style={{ marginTop: 12 }}>
                  <div className={hud.stepHint} style={{ margin: 0 }}>
                    Posición:
                  </div>
                  <div className={`${hud.mono}`} style={{ fontWeight: 900 }}>
                    {composed || "—"}
                  </div>
                  {!validPos && (
                    <div style={{ marginTop: 6, color: "#ffb4b4", fontWeight: 800 }}>
                      Posición inválida.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <span className={hud.label} style={{ marginTop: 12 }}>
                  Posición (manual)
                </span>
                <input
                  ref={inPosRef}
                  className={`${hud.input} ${hud.mono}`}
                  value={freeInput}
                  onChange={(e) => setFreeInput(e.target.value.toUpperCase())}
                  placeholder="Ej: A1A o PENDIENTE"
                  autoCapitalize="characters"
                  spellCheck={false}
                />

                {!validPos && (
                  <div style={{ marginTop: 8, color: "#ffb4b4", fontWeight: 800 }}>
                    Posición inválida.
                  </div>
                )}
              </>
            )}
          </div>

          {/* STEP 7 */}
          <div style={{ display: step === 7 ? "block" : "none" }}>
            <h4 className={hud.stepTitle}>7) Matrícula Camión (opcional)</h4>
            <div className={hud.stepHint}>Dacă nu e cazul, poți lăsa gol.</div>

            <span className={hud.label}>Camión</span>
            <input
              ref={inTruckRef}
              className={`${hud.input} ${hud.mono}`}
              value={matCamion}
              onChange={(e) => setMatCamion(e.target.value.toUpperCase())}
              placeholder="Ej: 1234ABC"
              autoCapitalize="characters"
              spellCheck={false}
            />

            <div className={hud.card} style={{ marginTop: 12 }}>
              ✅ Listo. Pulsa <b>Guardar</b> para registrar.
            </div>
          </div>
        </div>
      </div>

      {/* Footer: 2 butoane (HUD) */}
      <div className={shell.slotFooter}>
        <div className={hud.actions}>
          <button
            type="button"
            className={hud.btn}
            onClick={step === 1 ? close : back}
          >
            {step === 1 ? "Cancelar" : "← Atrás"}
          </button>

          {step < TOTAL ? (
            <button
              type="button"
              className={`${hud.btn} ${hud.primary}`}
              onClick={next}
              disabled={!stepOk}
            >
              Siguiente →
            </button>
          ) : (
            <button
              type="button"
              className={`${hud.btn} ${hud.primary}`}
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
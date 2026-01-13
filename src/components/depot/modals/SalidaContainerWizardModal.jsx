import React, { useEffect, useMemo, useRef, useState } from "react";
import Modal from "../../ui/Modal";
import shell from "../../ui/Modal.module.css";
import hud from "./WizardHud.module.css";

function norm(s = "") {
  return String(s || "").trim().toUpperCase();
}

function tipoKey(t) {
  const x = String(t || "").trim().toLowerCase();
  if (!x) return "";
  if (x.includes("20opentop")) return "20opentop";
  if (x === "20") return "20";
  if (x.includes("40")) return "40";
  if (x.includes("45")) return "45";
  return x;
}

function isTipo20(t) {
  const k = tipoKey(t);
  return k === "20" || k === "20opentop";
}

function getId(c) {
  return c?.id ?? c?.uuid ?? c?.matricula_contenedor ?? c?.matricula ?? null;
}

function getTable(c) {
  // IMPORTANT: tu trebuie să pui __table când combini tabelele
  // ex: { ...row, __table: "contenedores" } / { ...row, __table: "contenedores_rotos" }
  return c?.__table || c?.source_table || c?.tabla || null;
}

function getMat(c) {
  return norm(c?.matricula_contenedor || c?.matricula || "");
}
function getPos(c) {
  return norm(c?.posicion || c?.pos || "");
}

function buildSearchIndex(c) {
  return [
    c?.matricula_contenedor,
    c?.matricula,
    c?.posicion,
    c?.pos,
    c?.naviera,
    c?.tipo,
  ]
    .filter(Boolean)
    .map((x) => String(x).toUpperCase())
    .join(" • ");
}

function useAutocomplete(containers, query, { limit = 10, excludeIds = [] } = {}) {
  const q = norm(query);
  return useMemo(() => {
    if (!q) return [];
    const ex = new Set(excludeIds.filter(Boolean));
    const scored = [];

    for (const c of containers || []) {
      const id = getId(c);
      if (id && ex.has(id)) continue;

      const idx = c.__searchIndex || buildSearchIndex(c);
      const pos = idx.indexOf(q);
      if (pos === -1) continue;

      scored.push({ c, score: pos === 0 ? 0 : pos });
    }

    scored.sort((a, b) => a.score - b.score);
    return scored.slice(0, limit).map((x) => x.c);
  }, [containers, query, limit, excludeIds]);
}

function SuggestList({ items, onPick }) {
  if (!items?.length) return null;
  return (
    <div className={hud.suggest}>
      {items.map((c) => {
        const key = getId(c) || `${getMat(c)}-${getPos(c)}`;
        return (
          <button
            key={key}
            type="button"
            className={hud.suggestBtn}
            onMouseDown={(e) => e.preventDefault()} // iOS: nu pierde focus înainte de click
            onClick={() => onPick(c)}
          >
            <div className={`${hud.mono}`} style={{ fontWeight: 900, fontSize: 13 }}>
              {getMat(c) || "—"}
            </div>
            <div style={{ opacity: 0.85, fontSize: 12 }}>
              {getPos(c) || "—"} • {tipoKey(c?.tipo) || "—"} {c?.naviera ? `• ${c.naviera}` : ""}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function SalidaContainerWizardModal({
  isOpen,
  onClose,
  containers = [],
  onExit, // async (payload) => ...
}) {
  const TOTAL = 4;

  const [step, setStep] = useState(1);

  const [q1, setQ1] = useState("");
  const [c1, setC1] = useState(null);

  const [q2, setQ2] = useState("");
  const [c2, setC2] = useState(null);

  const [truck, setTruck] = useState("");

  const in1Ref = useRef(null);
  const in2Ref = useRef(null);
  const truckRef = useRef(null);

  const indexed = useMemo(
    () => (containers || []).map((c) => ({ ...c, __searchIndex: buildSearchIndex(c) })),
    [containers]
  );

  const allowSecond = useMemo(() => isTipo20(c1?.tipo), [c1]);

  const suggestions1 = useAutocomplete(indexed, q1, { limit: 10 });
  const suggestions2 = useAutocomplete(indexed, q2, {
    limit: 10,
    excludeIds: [getId(c1)],
  });

  const resetAll = () => {
    setStep(1);
    setQ1(""); setC1(null);
    setQ2(""); setC2(null);
    setTruck("");
  };

  useEffect(() => {
    if (!isOpen) return;
    resetAll();
    setTimeout(() => in1Ref.current?.focus?.(), 80);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!allowSecond) {
      setC2(null);
      setQ2("");
    }
  }, [allowSecond]);

  const nextFrom1 = () => {
    if (!c1) return alert("Selectează un container (din listă).");
    if (allowSecond) {
      setStep(2);
      setTimeout(() => in2Ref.current?.focus?.(), 80);
    } else {
      setStep(3);
      setTimeout(() => truckRef.current?.focus?.(), 80);
    }
  };

  const nextFrom2 = () => {
    // slot 2 e optional
    setStep(3);
    setTimeout(() => truckRef.current?.focus?.(), 80);
  };

  const nextFrom3 = () => {
    const t = norm(truck);
    if (t.length < 4) return alert("Introduce matrícula camion válida.");
    setStep(4);
  };

  const submit = async () => {
    const t = norm(truck);

    if (!c1) return alert("Lipsește containerul 1.");
    if (c2 && !isTipo20(c2?.tipo)) return alert("Slot 2 doar 20 / 20opentop.");

    // trebuie să știm din ce tabelă provine fiecare (contenedores / contenedores_rotos)
    const table1 = getTable(c1);
    const table2 = c2 ? getTable(c2) : null;
    if (!table1) return alert("Container 1 nu are __table (contenedores / contenedores_rotos).");
    if (c2 && !table2) return alert("Container 2 nu are __table (contenedores / contenedores_rotos).");

    const payload = {
      camion: t,
      containers: [
        {
          id: getId(c1),
          matricula_contenedor: getMat(c1),
          tipo: tipoKey(c1?.tipo),
          posicion: getPos(c1),
          source_table: table1,
        },
        ...(c2
          ? [{
              id: getId(c2),
              matricula_contenedor: getMat(c2),
              tipo: tipoKey(c2?.tipo),
              posicion: getPos(c2),
              source_table: table2,
            }]
          : []),
      ],
      multi: !!c2,
    };

    try {
      await onExit?.(payload);
      onClose?.();
      resetAll();
    } catch (e) {
      console.error(e);
      alert("Eroare la SALIDA.");
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { onClose?.(); resetAll(); }}
      ariaLabel="Salida Container"
      fillOnMobile
    >
      <div className={shell.slotHeader}>
        <h3 style={{ margin: 0, fontWeight: 900, color: "#00e5ff", textTransform: "uppercase", letterSpacing: ".05em" }}>
          Salida • Container
        </h3>
      </div>

      <div className={shell.slotContent}>
        <div className={hud.ios}>
          {/* progress */}
          <div className={hud.progressBar}>
            <div className={hud.progressFill} style={{ width: `${(step / TOTAL) * 100}%` }} />
          </div>

          {/* STEP 1 */}
          <div style={{ display: step === 1 ? "block" : "none" }}>
            <h4 className={hud.stepTitle}>1) Caută container (primul)</h4>

            <span className={hud.label}>Matrícula / Posición / Naviera</span>
            <input
              ref={in1Ref}
              className={`${hud.input} ${hud.mono}`}
              value={q1}
              onChange={(e) => { setQ1(e.target.value); setC1(null); }}
              placeholder="Scrie…"
              autoCapitalize="characters"
              spellCheck={false}
            />

            {c1 ? (
              <div className={`${hud.card} ${hud.cardGlow}`}>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Selectat</div>
                <div className={hud.mono} style={{ opacity: 0.92 }}>
                  {getMat(c1)}{getPos(c1) ? ` • ${getPos(c1)}` : ""}{tipoKey(c1?.tipo) ? ` • ${tipoKey(c1?.tipo)}` : ""}
                </div>
                <div className={hud.stepHint}>
                  {allowSecond ? "✅ Tip 20 → poți adăuga al 2-lea (opțional)." : "🚚 Tip 40/45 → camionul ia doar unul."}
                </div>
              </div>
            ) : (
              <SuggestList
                items={suggestions1}
                onPick={(c) => { setC1(c); setQ1(getMat(c)); }}
              />
            )}

            <div className={hud.actions}>
              <button className={hud.btn} type="button" onClick={() => { onClose?.(); resetAll(); }}>
                Cancelar
              </button>
              <button className={`${hud.btn} ${hud.danger}`} type="button" onClick={nextFrom1}>
                Siguiente →
              </button>
            </div>
          </div>

          {/* STEP 2 */}
          <div style={{ display: step === 2 ? "block" : "none" }}>
            <h4 className={hud.stepTitle}>2) Al doilea container (opțional)</h4>
            <div className={hud.stepHint}>Doar pentru tip 20 / 20opentop</div>

            <span className={hud.label}>Slot 2</span>
            <input
              ref={in2Ref}
              className={`${hud.input} ${hud.mono}`}
              value={q2}
              onChange={(e) => { setQ2(e.target.value); setC2(null); }}
              placeholder="Scrie matrícula… (sau lasă gol)"
              autoCapitalize="characters"
              spellCheck={false}
            />

            {c2 ? (
              <div className={`${hud.card} ${hud.cardGlow}`}>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Selectat (slot 2)</div>
                <div className={hud.mono} style={{ opacity: 0.92 }}>
                  {getMat(c2)}{getPos(c2) ? ` • ${getPos(c2)}` : ""}{tipoKey(c2?.tipo) ? ` • ${tipoKey(c2?.tipo)}` : ""}
                </div>
              </div>
            ) : (
              <SuggestList
                items={suggestions2.filter((x) => isTipo20(x?.tipo))}
                onPick={(c) => { setC2(c); setQ2(getMat(c)); }}
              />
            )}

            <div className={hud.actions}>
              <button className={hud.btn} type="button" onClick={() => setStep(1)}>
                ← Înapoi
              </button>
              <button className={`${hud.btn} ${hud.danger}`} type="button" onClick={nextFrom2}>
                Siguiente →
              </button>
            </div>
          </div>

          {/* STEP 3 */}
          <div style={{ display: step === 3 ? "block" : "none" }}>
            <h4 className={hud.stepTitle}>3) Matrícula Camión</h4>

            <span className={hud.label}>Camión</span>
            <input
              ref={truckRef}
              className={`${hud.input} ${hud.mono}`}
              value={truck}
              onChange={(e) => setTruck(e.target.value.toUpperCase())}
              placeholder="Ex: 1710KKY"
              autoCapitalize="characters"
              spellCheck={false}
            />

            <div className={hud.actions}>
              <button className={hud.btn} type="button" onClick={() => setStep(allowSecond ? 2 : 1)}>
                ← Înapoi
              </button>
              <button className={`${hud.btn} ${hud.danger}`} type="button" onClick={nextFrom3}>
                Siguiente →
              </button>
            </div>
          </div>

          {/* STEP 4 */}
          <div style={{ display: step === 4 ? "block" : "none" }}>
            <h4 className={hud.stepTitle}>Confirmar salida</h4>

            <div className={hud.card}>
              <div style={{ fontWeight: 900, marginBottom: 10 }}>Verificare</div>

              <div className={hud.mono} style={{ opacity: 0.92, lineHeight: 1.5 }}>
                <div><b>Camión:</b> {norm(truck)}</div>
                <div><b>Container 1:</b> {getMat(c1)} • {getPos(c1)} • {tipoKey(c1?.tipo)} • {getTable(c1)}</div>
                {c2 && (
                  <div><b>Container 2:</b> {getMat(c2)} • {getPos(c2)} • {tipoKey(c2?.tipo)} • {getTable(c2)}</div>
                )}
              </div>
            </div>

            <div className={hud.actions}>
              <button className={hud.btn} type="button" onClick={() => setStep(3)}>
                ← Înapoi
              </button>
              <button className={`${hud.btn} ${hud.primary}`} type="button" onClick={submit}>
                Confirmar salida
              </button>
            </div>
          </div>

        </div>
      </div>

      <div className={shell.slotFooter} />
    </Modal>
  );
}
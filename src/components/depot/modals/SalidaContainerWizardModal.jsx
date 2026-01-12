import React, { useEffect, useMemo, useRef, useState } from "react";

// ✅ din depot/modals -> components/ui
import Modal from "../../ui/Modal";
import shell from "../../ui/Modal.module.css";

// NOTE:
// - containers vine din Map3DPage (lista actuală din DB)
// - onExit(payload) îl legi la supabase (update/insert “salida”)
// - wizard iOS-safe: inputurile NU sunt demontate, doar ascunse cu display.

function norm(s = "") {
  return String(s || "").trim().toUpperCase();
}

function tipoKey(t) {
  const x = String(t || "").toLowerCase();
  if (x.includes("20opentop")) return "20opentop";
  if (x === "20") return "20";
  if (x.includes("40")) return "40";
  if (x.includes("45")) return "45";
  return x || "";
}

function isTipo20(t) {
  const k = tipoKey(t);
  return k === "20" || k === "20opentop";
}

function displayName(c) {
  if (!c) return "";
  const mat = norm(c.matricula_contenedor || c.matricula || "");
  const pos = norm(c.posicion || c.pos || "");
  const tipo = tipoKey(c.tipo);
  const nav = c.naviera ? String(c.naviera) : "";
  return `${mat}${pos ? ` • ${pos}` : ""}${tipo ? ` • ${tipo}` : ""}${nav ? ` • ${nav}` : ""}`;
}

function buildSearchIndex(c) {
  const parts = [
    c.matricula_contenedor,
    c.matricula,
    c.posicion,
    c.pos,
    c.naviera,
    c.tipo,
  ]
    .filter(Boolean)
    .map((x) => String(x).toUpperCase());
  return parts.join(" • ");
}

function useAutocomplete(containers, query, { limit = 10, excludeIds = [] } = {}) {
  const q = norm(query);
  return useMemo(() => {
    if (!q) return [];
    const ex = new Set(excludeIds.filter(Boolean));
    const scored = [];

    for (const c of containers || []) {
      const id = c.id || c.uuid || c.matricula_contenedor || c.matricula; // fallback
      if (ex.has(id)) continue;

      const idx = c.__searchIndex || buildSearchIndex(c);
      // scoring simplu: match prefix > include
      const pos = idx.indexOf(q);
      if (pos === -1) continue;

      const score = pos === 0 ? 0 : pos; // mai mic = mai bun
      scored.push({ c, score, idx });
    }

    scored.sort((a, b) => a.score - b.score);
    return scored.slice(0, limit).map((x) => x.c);
  }, [containers, query, limit, excludeIds]);
}

function SuggestList({ items, onPick }) {
  if (!items?.length) return null;
  return (
    <div
      style={{
        marginTop: 8,
        border: "1px solid rgba(255,255,255,.12)",
        background: "rgba(10,12,16,.86)",
        borderRadius: 12,
        overflow: "hidden",
        maxHeight: 220,
      }}
    >
      {items.map((c) => {
        const key = c.id || c.uuid || c.matricula_contenedor || c.matricula || Math.random();
        return (
          <button
            key={key}
            type="button"
            // important: mousedown ca să nu pierzi focus înainte de select (iOS/desktop)
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(c)}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "10px 12px",
              background: "transparent",
              border: 0,
              borderBottom: "1px solid rgba(255,255,255,.08)",
              color: "rgba(255,255,255,.92)",
              cursor: "pointer",
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 13 }}>{norm(c.matricula_contenedor || c.matricula || "—")}</div>
            <div style={{ opacity: 0.85, fontSize: 12 }}>
              {norm(c.posicion || c.pos || "—")} • {tipoKey(c.tipo) || "—"} {c.naviera ? `• ${c.naviera}` : ""}
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
  const [step, setStep] = useState(1);

  // selectie
  const [q1, setQ1] = useState("");
  const [c1, setC1] = useState(null);

  const [q2, setQ2] = useState("");
  const [c2, setC2] = useState(null);

  // camion
  const [truck, setTruck] = useState("");

  // focus refs (optional)
  const in1Ref = useRef(null);
  const in2Ref = useRef(null);
  const truckRef = useRef(null);

  // preindex pt performanță
  const indexed = useMemo(() => {
    return (containers || []).map((c) => ({
      ...c,
      __searchIndex: buildSearchIndex(c),
    }));
  }, [containers]);

  const allowSecond = useMemo(() => isTipo20(c1?.tipo), [c1]);

  // sugestii
  const suggestions1 = useAutocomplete(indexed, q1, { limit: 10 });
  const suggestions2 = useAutocomplete(indexed, q2, {
    limit: 10,
    excludeIds: [
      c1?.id || c1?.uuid || c1?.matricula_contenedor || c1?.matricula,
    ],
  });

  const resetAll = () => {
    setStep(1);
    setQ1("");
    setC1(null);
    setQ2("");
    setC2(null);
    setTruck("");
  };

  useEffect(() => {
    if (!isOpen) return;
    // când deschizi modalul, începe cu pasul 1
    resetAll();
    // mic delay pt iOS ca să prindă focus în modal
    setTimeout(() => in1Ref.current?.focus?.(), 80);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // când alegi container1, curățăm container2 dacă nu mai e permis
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
    // Pasul 2 e OPTIONAL: poți merge mai departe fără al doilea
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
    if (allowSecond && c2 && !isTipo20(c2.tipo)) {
      return alert("Al doilea slot e permis doar pentru containere de 20 / 20opentop.");
    }

    // payload: tu îl conectezi la supabase
    const payload = {
      camion: t,
      containers: [
        { id: c1.id, matricula_contenedor: norm(c1.matricula_contenedor || c1.matricula), tipo: tipoKey(c1.tipo), posicion: norm(c1.posicion || c1.pos || "") },
        ...(c2 ? [{ id: c2.id, matricula_contenedor: norm(c2.matricula_contenedor || c2.matricula), tipo: tipoKey(c2.tipo), posicion: norm(c2.posicion || c2.pos || "") }] : []),
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
    <Modal isOpen={isOpen} onClose={() => { onClose?.(); resetAll(); }} ariaLabel="Salida Container" fillOnMobile>
      <div className={shell.slotHeader}>
        <h3 style={{ margin: 0, fontWeight: 900 }}>Salida • Container</h3>
      </div>

      <div className={shell.slotContent}>
        <div style={{ padding: 12 }}>
          {/* STEP INDICATOR */}
          <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 10 }}>
            Pas {step} / 4
          </div>

          {/* PAS 1: container 1 */}
          <div style={{ display: step === 1 ? "block" : "none" }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>1) Caută container (primul)</div>
            <input
              ref={in1Ref}
              value={q1}
              onChange={(e) => { setQ1(e.target.value); setC1(null); }}
              placeholder="Scrie matrícula / poziție / naviera…"
              autoCapitalize="characters"
              style={{
                width: "100%",
                height: 46,
                borderRadius: 12,
                padding: "0 12px",
                color: "#fff",
                background: "rgba(0,0,0,.35)",
                border: "1px solid rgba(255,255,255,.12)",
                outline: "none",
                textTransform: "uppercase",
              }}
            />

            {c1 ? (
              <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.06)" }}>
                <div style={{ fontWeight: 900 }}>Selectat:</div>
                <div style={{ opacity: .9 }}>{displayName(c1)}</div>
                <div style={{ marginTop: 6, opacity: .8, fontSize: 12 }}>
                  {allowSecond ? "✅ Tip 20 → poți adăuga al 2-lea container (opțional)." : "🚚 Tip 40/45 → camionul ia doar unul."}
                </div>
              </div>
            ) : (
              <SuggestList
                items={suggestions1}
                onPick={(c) => {
                  setC1(c);
                  setQ1(norm(c.matricula_contenedor || c.matricula || ""));
                }}
              />
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => { onClose?.(); resetAll(); }}
                style={{ height: 42, padding: "0 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.06)", color: "#fff", fontWeight: 900 }}>
                Cancelar
              </button>
              <button type="button" onClick={nextFrom1}
                style={{ height: 42, padding: "0 14px", borderRadius: 12, border: "1px solid rgba(239,68,68,.35)", background: "rgba(239,68,68,.22)", color: "#fff", fontWeight: 900 }}>
                Siguiente →
              </button>
            </div>
          </div>

          {/* PAS 2: container 2 (doar dacă primul e 20/20opentop) */}
          <div style={{ display: step === 2 ? "block" : "none" }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>
              2) Al doilea container (opțional) • doar pentru tip 20 / 20opentop
            </div>

            <input
              ref={in2Ref}
              value={q2}
              onChange={(e) => { setQ2(e.target.value); setC2(null); }}
              placeholder="Scrie matrícula… (sau lasă gol)"
              autoCapitalize="characters"
              style={{
                width: "100%",
                height: 46,
                borderRadius: 12,
                padding: "0 12px",
                color: "#fff",
                background: "rgba(0,0,0,.35)",
                border: "1px solid rgba(255,255,255,.12)",
                outline: "none",
                textTransform: "uppercase",
              }}
            />

            {c2 ? (
              <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.06)" }}>
                <div style={{ fontWeight: 900 }}>Selectat (slot 2):</div>
                <div style={{ opacity: .9 }}>{displayName(c2)}</div>
              </div>
            ) : (
              <SuggestList
                items={
                  // doar 20/20opentop în slotul 2
                  suggestions2.filter((x) => isTipo20(x.tipo))
                }
                onPick={(c) => {
                  setC2(c);
                  setQ2(norm(c.matricula_contenedor || c.matricula || ""));
                }}
              />
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "space-between" }}>
              <button type="button" onClick={() => setStep(1)}
                style={{ height: 42, padding: "0 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.06)", color: "#fff", fontWeight: 900 }}>
                ← Înapoi
              </button>

              <button type="button" onClick={nextFrom2}
                style={{ height: 42, padding: "0 14px", borderRadius: 12, border: "1px solid rgba(239,68,68,.35)", background: "rgba(239,68,68,.22)", color: "#fff", fontWeight: 900 }}>
                Siguiente →
              </button>
            </div>
          </div>

          {/* PAS 3: matricula camion */}
          <div style={{ display: step === 3 ? "block" : "none" }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>3) Matrícula Camión</div>

            <input
              ref={truckRef}
              value={truck}
              onChange={(e) => setTruck(e.target.value.toUpperCase())}
              placeholder="Ex: 1710KKY"
              autoCapitalize="characters"
              style={{
                width: "100%",
                height: 46,
                borderRadius: 12,
                padding: "0 12px",
                color: "#fff",
                background: "rgba(0,0,0,.35)",
                border: "1px solid rgba(255,255,255,.12)",
                outline: "none",
                textTransform: "uppercase",
              }}
            />

            <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "space-between" }}>
              <button
                type="button"
                onClick={() => setStep(allowSecond ? 2 : 1)}
                style={{ height: 42, padding: "0 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.06)", color: "#fff", fontWeight: 900 }}
              >
                ← Înapoi
              </button>

              <button
                type="button"
                onClick={nextFrom3}
                style={{ height: 42, padding: "0 14px", borderRadius: 12, border: "1px solid rgba(239,68,68,.35)", background: "rgba(239,68,68,.22)", color: "#fff", fontWeight: 900 }}
              >
                Siguiente →
              </button>
            </div>
          </div>

          {/* PAS 4: confirm */}
          <div style={{ display: step === 4 ? "block" : "none" }}>
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Confirmar salida</div>

            <div style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.06)" }}>
              <div style={{ fontWeight: 900 }}>Camión:</div>
              <div style={{ marginBottom: 10 }}>{norm(truck)}</div>

              <div style={{ fontWeight: 900 }}>Container 1:</div>
              <div style={{ marginBottom: 10 }}>{displayName(c1)}</div>

              {c2 && (
                <>
                  <div style={{ fontWeight: 900 }}>Container 2:</div>
                  <div style={{ marginBottom: 10 }}>{displayName(c2)}</div>
                </>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "space-between" }}>
              <button type="button" onClick={() => setStep(3)}
                style={{ height: 42, padding: "0 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.06)", color: "#fff", fontWeight: 900 }}>
                ← Înapoi
              </button>

              <button type="button" onClick={submit}
                style={{ height: 42, padding: "0 14px", borderRadius: 12, border: "1px solid rgba(239,68,68,.40)", background: "rgba(239,68,68,.28)", color: "#fff", fontWeight: 900 }}>
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
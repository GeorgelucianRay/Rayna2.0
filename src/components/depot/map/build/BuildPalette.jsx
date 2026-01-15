// BuildPalette.jsx - UI pentru editarea hărții (ASCII quotes only)
import React, { useEffect, useMemo, useState } from "react";
import { PROP_TYPES } from "../world/propRegistry";
import {
  getProps,
  exportJSON,
  exportCSV,
  subscribe,
  clearAllProps,
  removeProp, // ✅ nou (vezi patch worldStore mai jos)
} from "../world/worldStore";

export default function BuildPalette({
  open,
  onClose,
  buildController,
  buildActive,
  setBuildActive,
  buildMode,
  setBuildMode,

  // ✅ Integrare FP (nu strică FP-ul existent)
  isFP,
  setFPEnabled,
}) {
  const [currentType, setCurrentType] = useState("road.segment");
  const [minimized, setMinimized] = useState(false);
  const [hint, setHint] = useState("");
  const [items, setItems] = useState(getProps());

  // store -> UI
  useEffect(() => {
    const unsub = subscribe((s) => {
      const sorted = s.props.slice().sort((a, b) => (b.ts || 0) - (a.ts || 0));
      setItems(sorted);
    });
    return unsub;
  }, []);

  // controller tip curent
  useEffect(() => {
    if (buildController && currentType) buildController.setType(currentType);
  }, [buildController, currentType]);

  // controller mod curent
  useEffect(() => {
    if (!buildController) return;

    // ✅ dacă vrei un "select" real, controller trebuie să știe "select"
    // dacă nu îl știe, îl mapăm pe "place" dar fără preview (controller decide).
    buildController.setMode(buildMode);
  }, [buildController, buildMode]);

  // montează obiectele deja salvate (o singură dată când controller e disponibil)
  useEffect(() => {
    if (buildController) buildController.mountExistingFromStore?.();
  }, [buildController]);

  // când închizi build, nu lăsa FP pornit din greșeală
  useEffect(() => {
    if (!open) {
      setBuildActive(false);
      // nu forțăm FP OFF global; doar dacă era "walk&place" activ
      // prefer să nu îți stric FP-ul dacă l-ai pornit manual din altă parte.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const selectedId = buildController?.getSelectedId?.() || null;

  const typeLabel = useMemo(() => {
    return PROP_TYPES.find((p) => p.key === currentType)?.label || currentType;
  }, [currentType]);

  const selectedItem = useMemo(() => {
    if (!selectedId) return null;
    return items.find((x) => x.id === selectedId) || null;
  }, [items, selectedId]);

  const selectedTypeLabel = useMemo(() => {
    if (!selectedItem) return "";
    return PROP_TYPES.find((p) => p.key === selectedItem.type)?.label || selectedItem.type;
  }, [selectedItem]);

  const NudgePad = ({ floating = false }) => (
    <div
      data-build-ui="true"
      style={{
        position: floating ? "fixed" : "relative",
        right: floating ? 16 : undefined,
        bottom: floating ? 92 : undefined,
        display: "grid",
        gridTemplateColumns: "48px 48px 48px",
        gridTemplateRows: "48px 48px 48px",
        gap: 8,
        justifyContent: "center",
        alignItems: "center",
        pointerEvents: "auto",
        zIndex: 35,
      }}
    >
      <div />
      <button
        onClick={() => buildController?.nudgeSelected?.(0, -1)}
        style={btnSq}
        title="Sus"
        disabled={!selectedId}
      >
        ↑
      </button>
      <div />

      <button
        onClick={() => buildController?.nudgeSelected?.(-1, 0)}
        style={btnSq}
        title="Stânga"
        disabled={!selectedId}
      >
        ←
      </button>

      <button
        onClick={() => buildController?.rotateStep?.(1)}
        style={{ ...btnSq, background: "#10b981", color: "#06281e" }}
        title="Rotește"
        disabled={!selectedId}
      >
        ↻
      </button>

      <button
        onClick={() => buildController?.nudgeSelected?.(1, 0)}
        style={btnSq}
        title="Dreapta"
        disabled={!selectedId}
      >
        →
      </button>

      <div />
      <button
        onClick={() => buildController?.nudgeSelected?.(0, 1)}
        style={btnSq}
        title="Jos"
        disabled={!selectedId}
      >
        ↓
      </button>
      <div />
    </div>
  );

  const toggleBuild = () => {
    const next = !buildActive;
    setBuildActive(next);

    if (next) {
      setHint('Build ON. Alege "Place / Select / Remove".');
    } else {
      setHint("Build OFF.");
      // dacă eram în FP “walk&place”, îl oprim
      // doar dacă build-ul se oprește (nu afectăm FP-ul folosit din alt flux)
      if (isFP) setFPEnabled?.(false);
    }
  };

  const toggleWalk = () => {
    // Walk & Place are sens doar dacă Build e ON
    if (!buildActive) {
      setBuildActive(true);
      setHint('Build ON. Walk mode ON: mișcă-te pe hartă și plasează mai precis.');
    }

    const next = !isFP;
    setFPEnabled?.(next);

    // recomand: când intri în walk, folosești tool "place" sau "select"
    if (next) {
      if (buildMode !== "place") setBuildMode("place");
      setHint("Walk mode ON. Folosește FP ca să alegi locul; apoi click/tap pentru plasare.");
    } else {
      setHint("Walk mode OFF.");
    }
  };

  const deleteOne = (id) => {
    if (!id) return;
    if (!window.confirm("Ștergi acest obiect?")) return;

    // 1) scoate din store
    removeProp(id);

    // 2) scoate și din scenă (dacă controller are metoda)
    buildController?.removeById?.(id);

    // 3) dacă ai șters item selectat
    if (buildController?.getSelectedId?.() === id) {
      buildController?.setSelectedId?.(null);
    }

    setHint("Obiect șters.");
  };

  const clearAll = () => {
    if (!window.confirm("Ștergi TOATE obiectele din hartă? Operația nu poate fi anulată.")) return;
    clearAllProps();
    buildController?.removeAllFromScene?.();
    buildController?.setSelectedId?.(null);
    setHint("Toate obiectele au fost șterse.");
  };

  // FAB minimizat
  if (minimized) {
    return (
      <>
        {selectedId && <NudgePad floating />}
        <button
          data-build-ui="true"
          onClick={() => setMinimized(false)}
          title="Deschide Build"
          style={{
            position: "fixed",
            right: 16,
            bottom: 16,
            width: 66,
            height: 66,
            borderRadius: 33,
            border: "2px solid " + (buildActive ? "#10b981" : "#ef4444"),
            background: "#0b1220",
            color: "#fff",
            fontSize: 26,
            fontWeight: 800,
            boxShadow: "0 8px 24px rgba(0,0,0,.45)",
            zIndex: 36,
            cursor: "pointer",
          }}
        >
          🧱
        </button>
      </>
    );
  }

  return (
    <div data-build-ui="true" style={backdrop}>
      <div style={panel}>
        {/* Header */}
        <div style={hdr}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: 20 }}>Build</h3>
            <span style={pill(buildActive)}>{buildActive ? "ON" : "OFF"}</span>
            <span style={pill2(isFP)}>{isFP ? "WALK" : "ORBIT"}</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setMinimized(true)} title="Minimizează" style={btnMini}>
              —
            </button>
            <button onClick={onClose} title="Închide" style={btnClose}>
              ✕
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* STÂNGA */}
          <div style={card}>
            <div style={label}>Tip obiect</div>
            <div style={{ display: "grid", gap: 8, maxHeight: 220, overflow: "auto", paddingRight: 6 }}>
              {PROP_TYPES.map((p) => (
                <label key={p.key} style={row(currentType === p.key)}>
                  <input
                    type="radio"
                    name="propType"
                    checked={currentType === p.key}
                    onChange={() => setCurrentType(p.key)}
                  />
                  <span>{p.label}</span>
                </label>
              ))}
            </div>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
              Selectat: <b>{typeLabel}</b>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <button
                onClick={() => {
                  setBuildMode("place");
                  setHint('Tool: Place. Click/tap pe hartă pentru a plasa.');
                }}
                style={btn(buildMode === "place", "#10b981", "#06281e")}
                disabled={!buildActive}
                title={!buildActive ? "Pornește Build ca să folosești tool-urile" : ""}
              >
                🎯 Place
              </button>

              <button
                onClick={() => {
                  setBuildMode("select");
                  setHint('Tool: Select. Click pe obiect sau pe item în listă. Apoi săgeți pentru nudge.');
                }}
                style={btn(buildMode === "select", "#60a5fa", "#06152b")}
                disabled={!buildActive}
                title={!buildActive ? "Pornește Build ca să folosești tool-urile" : ""}
              >
                🖱️ Select
              </button>

              <button
                onClick={() => {
                  setBuildMode("remove");
                  setHint('Tool: Remove. Click/tap pe obiect ca să îl ștergi.');
                }}
                style={btn(buildMode === "remove", "#ef4444", "#fff")}
                disabled={!buildActive}
                title={!buildActive ? "Pornește Build ca să folosești tool-urile" : ""}
              >
                🗑️ Remove
              </button>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              <button onClick={toggleBuild} style={bigBtn(buildActive)}>
                {buildActive ? "⏸️ OPREȘTE BUILD" : "▶️ PORNEȘTE BUILD"}
              </button>

              <button
                onClick={toggleWalk}
                style={bigBtn2(isFP)}
                title="Activează First Person ca să te plimbi și să alegi mai precis locul"
              >
                {isFP ? "🚶 WALK OFF (înapoi Orbit)" : "🚶 WALK ON (First Person)"}
              </button>

              <button
                onClick={() => buildController?.rotateStep?.(1)}
                style={btnWide}
                disabled={!selectedId}
                title={!selectedId ? "Selectează un obiect ca să îl rotești" : "Rotește obiectul selectat"}
              >
                ⟳ Rotește selecția
              </button>
            </div>

            {/* Help fix */}
            <div style={helpBox}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Cum se folosește</div>
              <div>1) Pornește Build.</div>
              <div>2) Alege Tool: Place / Select / Remove.</div>
              <div>3) Walk ON ca să te plimbi pe hartă și să plasezi precis.</div>
              <div>4) Select + săgeți = mutare fină.</div>
            </div>

            {hint && <div style={hintBox}>Tip: {hint}</div>}
          </div>

          {/* DREAPTA */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={label}>Obiecte plasate ({items.length})</div>
              <button
                onClick={clearAll}
                style={{ ...btnSq, background: "#ef4444", color: "#fff", fontSize: 14 }}
                title="Șterge tot"
              >
                🧹 Clear
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  const json = exportJSON();
                  const blob = new Blob([json], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `world-edits-${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                style={btnSq}
              >
                📄 JSON
              </button>

              <button
                onClick={() => {
                  const csv = exportCSV();
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `world-edits-${Date.now()}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                style={btnSq}
              >
                📊 CSV
              </button>
            </div>

            <div style={listBox}>
              {items.length === 0 && (
                <div style={{ opacity: 0.65, fontSize: 13, textAlign: "center", padding: 20 }}>
                  Nimic plasat încă
                </div>
              )}

              {items.map((it) => {
                const lbl = PROP_TYPES.find((p) => p.key === it.type)?.label || it.type;
                const isSel = selectedId === it.id;

                return (
                  <div
                    key={it.id}
                    onClick={() => {
                      buildController?.setSelectedId?.(it.id);
                      setBuildMode("select");
                      setHint("Selectat. Folosește săgețile pentru nudge.");
                    }}
                    style={itemRow(isSel)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 900 }}>{lbl}</div>
                        <div style={{ fontSize: 11, opacity: 0.7 }}>{it.type}</div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteOne(it.id);
                        }}
                        style={{ ...btnSq, background: "#ef4444", color: "#fff", fontSize: 14 }}
                        title="Șterge obiectul"
                      >
                        🗑️
                      </button>
                    </div>

                    <div style={{ opacity: 0.8, fontSize: 11, marginTop: 6 }}>
                      ID: {String(it.id).slice(0, 8)}…
                    </div>
                    <div style={{ opacity: 0.7, fontSize: 11 }}>
                      Pos: [{(it.pos || []).map((n) => Number(n).toFixed(2)).join(", ")}]
                    </div>
                    <div style={{ opacity: 0.7, fontSize: 11 }}>
                      RotY: {Number(it.rotY || 0).toFixed(2)} rad
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedId && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6, textAlign: "center" }}>
                  Mută obiectul selectat: <b>{selectedTypeLabel}</b>
                </div>
                <NudgePad />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Stiluri */
const backdrop = {
  position: "absolute",
  inset: 0,
  background: "rgba(0,0,0,.5)",
  zIndex: 30,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  backdropFilter: "blur(2px)",
};
const panel = {
  width: "min(860px, 96vw)",
  background: "#0b1220",
  color: "#fff",
  borderRadius: 12,
  padding: 16,
  boxShadow: "0 10px 30px rgba(0,0,0,.6)",
  maxHeight: "90vh",
  overflow: "auto",
};
const hdr = { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 };
const card = { border: "1px solid #1f2a44", borderRadius: 10, padding: 12, background: "#111827" };
const label = { fontSize: 13, opacity: 0.85, marginBottom: 8, fontWeight: 700 };
const row = (active) => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: active ? "#1f2937" : "transparent",
  padding: "6px 8px",
  borderRadius: 8,
  cursor: "pointer",
});
const pill = (on) => ({
  padding: "4px 8px",
  borderRadius: 999,
  background: on ? "#10b981" : "#374151",
  color: on ? "#06281e" : "#cbd5e1",
  fontSize: 12,
  fontWeight: 800,
});
const pill2 = (on) => ({
  padding: "4px 8px",
  borderRadius: 999,
  background: on ? "#60a5fa" : "#374151",
  color: on ? "#06152b" : "#cbd5e1",
  fontSize: 12,
  fontWeight: 800,
});
const btn = (on, bgOn, colOn) => ({
  flex: 1,
  height: 36,
  borderRadius: 8,
  border: "1px solid #1f2a44",
  background: on ? bgOn : "#0f172a",
  color: on ? colOn : "#cbd5e1",
  padding: "0 12px",
  fontWeight: 800,
  cursor: "pointer",
});
const bigBtn = (on) => ({
  width: "100%",
  height: 44,
  borderRadius: 8,
  border: "none",
  background: on ? "#ef4444" : "#10b981",
  color: on ? "#fff" : "#06281e",
  fontWeight: 900,
  cursor: "pointer",
});
const bigBtn2 = (on) => ({
  width: "100%",
  height: 44,
  borderRadius: 8,
  border: "1px solid #1f2a44",
  background: on ? "#60a5fa" : "#0f172a",
  color: on ? "#06152b" : "#cbd5e1",
  fontWeight: 900,
  cursor: "pointer",
});
const btnWide = {
  width: "100%",
  height: 40,
  borderRadius: 8,
  border: "1px solid #1f2a44",
  background: "#111827",
  color: "#cbd5e1",
  fontWeight: 900,
  cursor: "pointer",
};
const btnClose = { fontSize: 18, background: "transparent", color: "#fff", border: "none", cursor: "pointer" };
const btnMini = {
  fontSize: 16,
  background: "#0f172a",
  color: "#cbd5e1",
  border: "1px solid #1f2a44",
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer",
};
const listBox = {
  maxHeight: 320,
  overflow: "auto",
  padding: 8,
  background: "#0a1322",
  border: "1px dashed #1f2a44",
  borderRadius: 8,
};
const itemRow = (sel) => ({
  padding: "10px 10px",
  marginBottom: 8,
  borderRadius: 10,
  background: sel ? "#17324b" : "#0f1b2f",
  cursor: "pointer",
  border: sel ? "2px solid #22c55e" : "1px solid transparent",
});
const btnSq = {
  height: 40,
  minWidth: 40,
  borderRadius: 8,
  border: "1px solid #1f2a44",
  background: "#111827",
  color: "#cbd5e1",
  padding: "0 10px",
  fontWeight: 900,
  cursor: "pointer",
  fontSize: 14,
};
const helpBox = {
  marginTop: 12,
  padding: 10,
  borderRadius: 10,
  border: "1px solid #1f2a44",
  background: "#0f172a",
  fontSize: 12,
  opacity: 0.95,
  lineHeight: 1.5,
};
const hintBox = {
  marginTop: 10,
  padding: 10,
  borderRadius: 10,
  border: "1px solid #312e81",
  background: "rgba(99,102,241,0.12)",
  color: "#c7d2fe",
  fontSize: 12,
  fontWeight: 700,
};
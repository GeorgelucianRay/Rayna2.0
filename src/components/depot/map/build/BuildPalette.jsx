// src/components/depot/map/ui/BuildPalette.jsx
// ASCII quotes only
import React, { useEffect, useMemo, useState } from "react";
import { PROP_TYPES } from "../world/propRegistry";
import {
  getProps,
  exportJSON,
  exportCSV,
  subscribe,
  clearAllProps,
  removeProp,
} from "../world/worldStore";

export default function BuildPalette({
  open,
  onClose,

  // controller from useDepotScene.buildApi.controller
  buildController,

  // state from useDepotScene
  buildActive,
  setBuildActive,
  buildMode,
  setBuildMode,

  // FP integration (do NOT break existing FP)
  isFP,
  setFPEnabled,
}) {
  const [currentType, setCurrentType] = useState("road.segment");
  const [minimized, setMinimized] = useState(false);
  const [hint, setHint] = useState("");
  const [items, setItems] = useState(getProps());

  // store -> UI list
  useEffect(() => {
    const unsub = subscribe((s) => {
      const sorted = (s.props || [])
        .slice()
        .sort((a, b) => (b.ts || 0) - (a.ts || 0));
      setItems(sorted);
    });
    return unsub;
  }, []);

  // mount existing once controller exists
  useEffect(() => {
    if (!buildController) return;
    buildController.mountExistingFromStore?.();
  }, [buildController]);

  // keep controller enabled in sync with buildActive
  useEffect(() => {
    if (!buildController) return;
    buildController.setEnabled?.(!!buildActive);
  }, [buildController, buildActive]);

  // keep controller type/mode in sync
  useEffect(() => {
    if (!buildController) return;
    buildController.setType?.(currentType);
  }, [buildController, currentType]);

  useEffect(() => {
    if (!buildController) return;
    buildController.setMode?.(buildMode);
  }, [buildController, buildMode]);

  // when closing palette: DO NOT kill FP/orbit; only disable build if you want
  useEffect(() => {
    if (!open) {
      setMinimized(false);
      setHint("");
      // optional: close = stop build
      setBuildActive(false);
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
    return (
      PROP_TYPES.find((p) => p.key === selectedItem.type)?.label ||
      selectedItem.type
    );
  }, [selectedItem]);

  // ---------------- Actions ----------------
  const toggleBuild = () => {
    const next = !buildActive;
    setBuildActive(next);
    buildController?.setEnabled?.(next);

    if (next) setHint('Build ON. Alege "Place / Select / Remove".');
    else setHint("Build OFF.");
  };

  const setTool = (tool) => {
    if (!buildActive) {
      setBuildActive(true);
      buildController?.setEnabled?.(true);
    }
    setBuildMode(tool);
    setHint(
      tool === "place"
        ? 'Tool: Place. Click/tap pe hartă sau "E/Select" în FP ca să plasezi.'
        : tool === "select"
          ? "Tool: Select. Selectează un obiect, apoi folosește nudge."
          : "Tool: Remove. Click/tap pe obiect ca să îl ștergi."
    );
  };

  const toggleWalk = () => {
    // Walk makes sense with build ON
    if (!buildActive) {
      setBuildActive(true);
      buildController?.setEnabled?.(true);
    }

    const next = !isFP;
    setFPEnabled?.(next);

    if (next) {
      // in walk, default to place (most used)
      if (buildMode !== "place") setBuildMode("place");
      setHint("Walk ON. Folosește FP + E/Select pentru Place/Select/Remove.");
    } else {
      setHint("Walk OFF. Înapoi la Orbit.");
    }
  };

  const deleteOne = (id) => {
    if (!id) return;
    if (!window.confirm("Ștergi acest obiect?")) return;

    // 1) store
    removeProp(id);

    // 2) scene: safest approach is to remount from store OR implement removeFromScene
    // (controller-ul tău curăță scena dacă store se golește; pentru delete one,
    // cel mai curat e să ai removeFromScene. Dacă nu, lăsăm doar store + select reset.)
    // Dacă vrei perfect: îți adaug în controller metoda removeFromScene(id).
    buildController?.setSelectedId?.(null);

    setHint("Obiect șters.");
  };

  const clearAll = () => {
    if (
      !window.confirm(
        "Ștergi TOATE obiectele din hartă? Operația nu poate fi anulată."
      )
    )
      return;

    // store + scene via controller (best)
    buildController?.clearAll?.();
    // fallback safety
    clearAllProps();

    buildController?.setSelectedId?.(null);
    setHint("Toate obiectele au fost șterse.");
  };

  // ---------------- UI blocks ----------------
  const NudgePad = ({ floating = false }) => (
    <div
      data-build-ui="true"
      style={{
        position: floating ? "fixed" : "relative",
        right: floating ? 14 : undefined,
        bottom: floating ? 84 : undefined,
        zIndex: 50,
        pointerEvents: "auto",

        background: "#0b1220",
        border: "1px solid #1f2a44",
        borderRadius: 12,
        padding: 10,
        boxShadow: "0 8px 24px rgba(0,0,0,.45)",

        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 900, textAlign: "center" }}>
        NUDGE
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "48px 48px 48px",
          gridTemplateRows: "48px 48px 48px",
          gap: 8,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div />
        <button
          type="button"
          onClick={() => buildController?.nudgeSelected?.(0, -1, 0)}
          style={btnSq}
          disabled={!selectedId}
          title="Sus"
        >
          ↑
        </button>
        <div />

        <button
          type="button"
          onClick={() => buildController?.nudgeSelected?.(-1, 0, 0)}
          style={btnSq}
          disabled={!selectedId}
          title="Stânga"
        >
          ←
        </button>

        <button
          type="button"
          onClick={() => buildController?.rotateStep?.(1)}
          style={{ ...btnSq, background: "#10b981", color: "#06281e" }}
          disabled={!selectedId}
          title="Rotește"
        >
          ↻
        </button>

        <button
          type="button"
          onClick={() => buildController?.nudgeSelected?.(1, 0, 0)}
          style={btnSq}
          disabled={!selectedId}
          title="Dreapta"
        >
          →
        </button>

        <div />
        <button
          type="button"
          onClick={() => buildController?.nudgeSelected?.(0, 1, 0)}
          style={btnSq}
          disabled={!selectedId}
          title="Jos"
        >
          ↓
        </button>
        <div />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button
          type="button"
          onClick={() => buildController?.nudgeSelected?.(0, 0, +0.1)}
          style={btnSqSmall}
          disabled={!selectedId}
          title="Ridică +Y"
        >
          +Y
        </button>
        <button
          type="button"
          onClick={() => buildController?.nudgeSelected?.(0, 0, -0.1)}
          style={btnSqSmall}
          disabled={!selectedId}
          title="Coboară -Y"
        >
          -Y
        </button>
      </div>
    </div>
  );

  // minimized floating button only (DOES NOT disable build)
  if (minimized) {
    return (
      <>
        {selectedId && <NudgePad floating />}

        <button
          data-build-ui="true"
          type="button"
          onClick={() => setMinimized(false)}
          title="Deschide Build"
          style={{
            position: "fixed",
            right: 14,
            bottom: 14,
            width: 64,
            height: 64,
            borderRadius: 32,
            border: "2px solid " + (buildActive ? "#10b981" : "#ef4444"),
            background: "#0b1220",
            color: "#fff",
            fontSize: 26,
            fontWeight: 900,
            boxShadow: "0 8px 24px rgba(0,0,0,.45)",
            zIndex: 60,
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
      {/* PANEL: single column, scrollable */}
      <div style={panel}>
        {/* HEADER */}
        <div style={hdr}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontSize: 18, fontWeight: 900 }}>Build</div>
            <span style={pill(buildActive)}>{buildActive ? "ON" : "OFF"}</span>
            <span style={pill2(isFP)}>{isFP ? "WALK" : "ORBIT"}</span>
            <span style={pill3(buildMode)}>{String(buildMode).toUpperCase()}</span>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => setMinimized(true)} style={btnMini} title="Minimizează">
              —
            </button>
            <button type="button" onClick={onClose} style={btnClose} title="Închide">
              ✕
            </button>
          </div>
        </div>

        {/* TOP CONTROLS */}
        <div style={section}>
          <button type="button" onClick={toggleBuild} style={bigBtn(buildActive)}>
            {buildActive ? "⏸️ OPREȘTE BUILD" : "▶️ PORNEȘTE BUILD"}
          </button>

          <button type="button" onClick={toggleWalk} style={bigBtn2(isFP)}>
            {isFP ? "🚶 WALK OFF (Orbit)" : "🚶 WALK ON (First Person)"}
          </button>

          <div style={helpBox}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Cum funcționează (Minecraft)</div>
            <div>• Walk ON = te plimbi pe hartă.</div>
            <div>• În FP: apasă <b>E</b> sau butonul <b>Select</b> ca să execuți tool-ul activ.</div>
            <div>• Place = pune obiectul, Select = selectează, Remove = șterge.</div>
            <div>• După Select, folosește Nudge ca să îl ajustezi fin.</div>
          </div>

          {hint ? <div style={hintBox}>Tip: {hint}</div> : null}
        </div>

        {/* TOOL SECTION */}
        <div style={section}>
          <div style={sectionTitle}>Tool</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <button type="button" onClick={() => setTool("place")} style={toolBtn(buildMode === "place", "#10b981", "#06281e")} disabled={!buildActive}>
              🎯 Place
            </button>
            <button type="button" onClick={() => setTool("select")} style={toolBtn(buildMode === "select", "#60a5fa", "#06152b")} disabled={!buildActive}>
              🖱️ Select
            </button>
            <button type="button" onClick={() => setTool("remove")} style={toolBtn(buildMode === "remove", "#ef4444", "#fff")} disabled={!buildActive}>
              🗑️ Remove
            </button>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
            Tip curent: <b>{typeLabel}</b>
          </div>
        </div>

        {/* TYPE SECTION */}
        <div style={section}>
          <div style={sectionTitle}>Tip obiect</div>

          <div style={typeList}>
            {PROP_TYPES.map((p) => (
              <label key={p.key} style={typeRow(currentType === p.key)}>
                <input
                  type="radio"
                  name="propType"
                  checked={currentType === p.key}
                  onChange={() => setCurrentType(p.key)}
                />
                <span style={{ fontWeight: 800 }}>{p.label}</span>
                <span style={{ fontSize: 11, opacity: 0.7 }}>{p.key}</span>
              </label>
            ))}
          </div>
        </div>

        {/* SELECTED + NUDGE */}
        <div style={section}>
          <div style={sectionTitle}>Selecție</div>

          <div style={selectedBox}>
            <div style={{ fontWeight: 900 }}>
              {selectedId ? `Selectat: ${selectedTypeLabel}` : "Nimic selectat"}
            </div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              {selectedId ? `ID: ${String(selectedId).slice(0, 8)}…` : "Folosește Tool Select ca să alegi un obiect."}
            </div>
          </div>

          <NudgePad />
        </div>

        {/* EXPORT + CLEAR */}
        <div style={section}>
          <div style={sectionTitle}>Export / Ștergere</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button
              type="button"
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
              style={btnSqWide}
            >
              📄 Export JSON
            </button>

            <button
              type="button"
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
              style={btnSqWide}
            >
              📊 Export CSV
            </button>
          </div>

          <button type="button" onClick={clearAll} style={dangerBtn}>
            🧹 Șterge TOT (Clear All)
          </button>
        </div>

        {/* LIST */}
        <div style={section}>
          <div style={sectionTitle}>Obiecte plasate ({items.length})</div>

          <div style={listBox}>
            {items.length === 0 ? (
              <div style={{ opacity: 0.7, fontSize: 13, textAlign: "center", padding: 16 }}>
                Nimic plasat încă
              </div>
            ) : (
              items.map((it) => {
                const lbl =
                  PROP_TYPES.find((p) => p.key === it.type)?.label || it.type;
                const isSel = selectedId === it.id;

                return (
                  <div
                    key={it.id}
                    onClick={() => {
                      if (!buildActive) {
                        setBuildActive(true);
                        buildController?.setEnabled?.(true);
                      }
                      buildController?.setSelectedId?.(it.id);
                      setBuildMode("select");
                      setHint("Selectat din listă. Folosește Nudge pentru ajustări.");
                    }}
                    style={itemRow(isSel)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 900 }}>{lbl}</div>
                        <div style={{ fontSize: 11, opacity: 0.7 }}>
                          {it.type} • {String(it.id).slice(0, 8)}…
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteOne(it.id);
                        }}
                        style={trashBtn}
                        title="Șterge obiectul"
                      >
                        🗑️
                      </button>
                    </div>

                    <div style={{ marginTop: 6, fontSize: 11, opacity: 0.75 }}>
                      Pos: [{(it.pos || []).map((n) => Number(n).toFixed(2)).join(", ")}]
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.75 }}>
                      RotY: {Number(it.rotY || 0).toFixed(2)} rad
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div style={{ height: 8 }} />
      </div>
    </div>
  );
}

/* ---------------- Styles ---------------- */
const backdrop = {
  position: "absolute",
  inset: 0,
  background: "rgba(0,0,0,.45)",
  zIndex: 30,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 12,
  backdropFilter: "blur(2px)",
};

const panel = {
  width: "min(520px, 96vw)",
  maxHeight: "92vh",
  overflow: "auto",
  background: "#0b1220",
  color: "#fff",
  borderRadius: 14,
  border: "1px solid #1f2a44",
  boxShadow: "0 10px 30px rgba(0,0,0,.6)",
  padding: 12,
};

const hdr = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  paddingBottom: 10,
  borderBottom: "1px solid #16233d",
  marginBottom: 10,
};

const section = {
  border: "1px solid #1f2a44",
  borderRadius: 12,
  background: "#111827",
  padding: 10,
  marginBottom: 10,
};

const sectionTitle = {
  fontSize: 13,
  fontWeight: 900,
  opacity: 0.9,
  marginBottom: 8,
};

const pill = (on) => ({
  padding: "4px 8px",
  borderRadius: 999,
  background: on ? "#10b981" : "#374151",
  color: on ? "#06281e" : "#cbd5e1",
  fontSize: 12,
  fontWeight: 900,
});

const pill2 = (on) => ({
  padding: "4px 8px",
  borderRadius: 999,
  background: on ? "#60a5fa" : "#374151",
  color: on ? "#06152b" : "#cbd5e1",
  fontSize: 12,
  fontWeight: 900,
});

const pill3 = (mode) => ({
  padding: "4px 8px",
  borderRadius: 999,
  background:
    mode === "place" ? "rgba(16,185,129,0.22)"
    : mode === "select" ? "rgba(96,165,250,0.22)"
    : "rgba(239,68,68,0.22)",
  color: "#e5e7eb",
  fontSize: 12,
  fontWeight: 900,
  border: "1px solid #1f2a44",
});

const btnClose = {
  fontSize: 18,
  background: "transparent",
  color: "#fff",
  border: "none",
  cursor: "pointer",
  padding: "6px 8px",
};

const btnMini = {
  fontSize: 16,
  background: "#0f172a",
  color: "#cbd5e1",
  border: "1px solid #1f2a44",
  borderRadius: 10,
  padding: "6px 10px",
  cursor: "pointer",
};

const bigBtn = (on) => ({
  width: "100%",
  height: 44,
  borderRadius: 10,
  border: "none",
  background: on ? "#ef4444" : "#10b981",
  color: on ? "#fff" : "#06281e",
  fontWeight: 900,
  cursor: "pointer",
});

const bigBtn2 = (on) => ({
  width: "100%",
  height: 44,
  borderRadius: 10,
  border: "1px solid #1f2a44",
  background: on ? "#60a5fa" : "#0f172a",
  color: on ? "#06152b" : "#cbd5e1",
  fontWeight: 900,
  cursor: "pointer",
});

const toolBtn = (on, bgOn, colOn) => ({
  height: 40,
  borderRadius: 10,
  border: "1px solid #1f2a44",
  background: on ? bgOn : "#0f172a",
  color: on ? colOn : "#cbd5e1",
  fontWeight: 900,
  cursor: "pointer",
});

const typeList = {
  display: "grid",
  gap: 8,
  maxHeight: 240,
  overflow: "auto",
  paddingRight: 6,
};

const typeRow = (active) => ({
  display: "grid",
  gridTemplateColumns: "18px 1fr",
  gap: 10,
  alignItems: "center",
  background: active ? "#0f1b2f" : "transparent",
  padding: "8px 10px",
  borderRadius: 10,
  border: active ? "1px solid #22c55e" : "1px solid #1f2a44",
  cursor: "pointer",
});

const helpBox = {
  marginTop: 8,
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
  fontWeight: 800,
};

const selectedBox = {
  padding: 10,
  borderRadius: 10,
  background: "#0a1322",
  border: "1px solid #1f2a44",
};

const listBox = {
  maxHeight: 320,
  overflow: "auto",
  padding: 8,
  background: "#0a1322",
  border: "1px dashed #1f2a44",
  borderRadius: 10,
};

const itemRow = (sel) => ({
  padding: "10px 10px",
  marginBottom: 8,
  borderRadius: 12,
  background: sel ? "#17324b" : "#0f1b2f",
  cursor: "pointer",
  border: sel ? "2px solid #22c55e" : "1px solid #1f2a44",
});

const btnSq = {
  height: 44,
  minWidth: 44,
  borderRadius: 10,
  border: "1px solid #1f2a44",
  background: "#111827",
  color: "#cbd5e1",
  padding: "0 10px",
  fontWeight: 900,
  cursor: "pointer",
};

const btnSqSmall = {
  height: 36,
  borderRadius: 10,
  border: "1px solid #1f2a44",
  background: "#111827",
  color: "#cbd5e1",
  fontWeight: 900,
  cursor: "pointer",
};

const btnSqWide = {
  height: 40,
  borderRadius: 10,
  border: "1px solid #1f2a44",
  background: "#0f172a",
  color: "#cbd5e1",
  fontWeight: 900,
  cursor: "pointer",
};

const dangerBtn = {
  marginTop: 8,
  width: "100%",
  height: 42,
  borderRadius: 10,
  border: "1px solid #1f2a44",
  background: "#ef4444",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
};

const trashBtn = {
  height: 38,
  minWidth: 44,
  borderRadius: 10,
  border: "1px solid #1f2a44",
  background: "#ef4444",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
};
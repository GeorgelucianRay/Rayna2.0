import React, { useEffect, useState, useRef } from "react";

const box = {
  position: "fixed",
  right: 10,
  bottom: 10,
  width: 320,
  maxHeight: "55vh",
  background: "rgba(0,0,0,0.85)",
  color: "#fff",
  borderRadius: 10,
  boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
  overflow: "hidden",
  zIndex: 9999
};
const head = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 10px",
  background: "rgba(255,255,255,0.06)",
  borderBottom: "1px solid rgba(255,255,255,0.12)"
};
const btn = {
  background: "transparent",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.35)",
  borderRadius: 6,
  padding: "2px 8px",
  cursor: "pointer"
};
const list = { padding: 8, overflow: "auto", maxHeight: "46vh", fontSize: 12, lineHeight: 1.35 };

export default function ErrorTray() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState(window.__raynaBus?.logs || []);
  const endRef = useRef(null);

  useEffect(() => {
    const onLog = (ev) => {
      const arr = window.__raynaBus?.logs || [];
      setLogs([...arr]); // clone ca să declanșeze render
    };
    window.addEventListener("rayna-log", onLog);
    return () => window.removeEventListener("rayna-log", onLog);
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs, open]);

  return (
    <div style={{ position: "fixed", right: 10, bottom: 10, zIndex: 9999 }}>
      {!open && (
        <button style={{ ...btn, background: "#111", padding: "8px 10px" }} onClick={() => setOpen(true)}>
          ⚙️ Debug ({logs.length})
        </button>
      )}
      {open && (
        <div style={box}>
          <div style={head}>
            <strong>Rayna • Debug</strong>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                style={btn}
                onClick={() => {
                  window.__raynaBus?.clear();
                  setLogs([]);
                }}
              >
                Clear
              </button>
              <button style={btn} onClick={() => setOpen(false)}>Close</button>
            </div>
          </div>
          <div style={list}>
            {logs.map((l, i) => (
              <div key={i} style={{ marginBottom: 10, borderLeft: `3px solid ${colorFor(l.level)}`, paddingLeft: 6 }}>
                <div style={{ opacity: 0.9 }}>
                  <b>{new Date(l.ts).toLocaleTimeString()}</b> · {badge(l.level)} · {l.title}
                </div>
                {l.data != null && (
                  <pre style={{ whiteSpace: "pre-wrap", margin: "4px 0 0 0" }}>
                    {typeof l.data === "string" ? l.data : JSON.stringify(l.data, null, 2)}
                  </pre>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </div>
        </div>
      )}
    </div>
  );
}

function colorFor(level) {
  if (level === "error") return "#e74c3c";
  if (level === "warn" || level === "warning") return "#f39c12";
  return "#2ecc71";
}
function badge(level) {
  if (level === "error") return "❌ error";
  if (level === "warn" || level === "warning") return "⚠️ warn";
  return "ℹ️ info";
}
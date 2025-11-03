// src/components/chat/ui/ErrorTray.jsx
import React, { useEffect, useState } from "react";
import { onError } from "../errorBus";
import styles from "../Chatbot.module.css";

export default function ErrorTray() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);

  useEffect(() => {
    const off = onError((row) => {
      setItems((prev) => [row, ...prev].slice(0, 20));
      setOpen(true);
    });
    return off;
  }, []);

  if (!items.length) return null;

  return (
    <div style={{
      position: "fixed",
      right: 12,
      bottom: 12,
      zIndex: 9999,
      maxWidth: 420
    }}>
      <div className={styles.card}>
        <div className={styles.cardTitle} style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
          <span>⚠️ Chat errors ({items.length})</span>
          <div style={{display:"flex", gap:8}}>
            <button className={styles.actionBtn} onClick={() => setOpen((v)=>!v)}>
              {open ? "Hide" : "Show"}
            </button>
            <button className={styles.actionBtn} onClick={() => setItems([])}>
              Clear
            </button>
          </div>
        </div>

        {open && (
          <div style={{ maxHeight: 300, overflow: "auto", marginTop: 8 }}>
            {items.map((e) => (
              <div key={e.id} style={{
                border: "1px solid rgba(0,0,0,.1)",
                borderRadius: 8,
                padding: 8,
                marginBottom: 8
              }}>
                <div style={{ fontSize: 12, opacity: .7 }}>{new Date(e.time).toLocaleString()}</div>
                <div style={{ fontWeight: 600, marginTop: 4 }}>{e.message}</div>
                {e.meta && Object.keys(e.meta).length > 0 && (
                  <pre style={{
                    background: "#f7f7f8",
                    padding: 8,
                    borderRadius: 6,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    marginTop: 6
                  }}>{JSON.stringify(e.meta, null, 2)}</pre>
                )}
                {e.stack ? (
                  <details style={{ marginTop: 6 }}>
                    <summary>Stack</summary>
                    <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{e.stack}</pre>
                  </details>
                ) : null}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button
                    className={styles.actionBtn}
                    onClick={() => {
                      const text = JSON.stringify(e, null, 2);
                      navigator.clipboard?.writeText(text);
                    }}
                  >
                    Copy JSON
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
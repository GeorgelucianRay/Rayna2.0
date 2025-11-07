// src/components/debug/DebugConsole.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './DebugConsole.module.css';

const MAX_LOGS = 400;

function now() {
  const d = new Date();
  return d.toLocaleTimeString() + '.' + String(d.getMilliseconds()).padStart(3, '0');
}

export default function DebugConsole({ enabled = true }) {
  const [open, setOpen] = useState(false);
  const [countErr, setCountErr] = useState(0);
  const [pos, setPos] = useState({ x: 16, y: 16 });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const bufferRef = useRef([]);     // [{t:'error|warn|log|info', ts, msg}]
  const [, force] = useState(0);    // manual repaint rar

  // append log fără rerender pe fiecare item
  const append = (t, parts) => {
    const msg = parts.map(p => {
      try { return typeof p === 'string' ? p : JSON.stringify(p); }
      catch { return String(p); }
    }).join(' ');
    bufferRef.current.push({ t, ts: now(), msg });
    if (bufferRef.current.length > MAX_LOGS) {
      bufferRef.current.splice(0, bufferRef.current.length - MAX_LOGS);
    }
    if (t === 'error') setCountErr(c => c + 1);
  };

  // Hook global: console + window errors + unhandledrejection + long tasks
  useEffect(() => {
    if (!enabled) return;

    const orig = {
      log: console.log, warn: console.warn, error: console.error, info: console.info,
    };

    console.log = (...a) => { append('log', a); orig.log(...a); };
    console.warn = (...a) => { append('warn', a); orig.warn(...a); };
    console.info = (...a) => { append('info', a); orig.info(...a); };
    console.error = (...a) => { append('error', a); orig.error(...a); };

    const onErr = (e) => {
      append('error', [`${e.message || 'Error'} @ ${e.filename || ''}:${e.lineno || ''}:${e.colno || ''}`]);
    };
    const onRej = (e) => { append('error', ['UnhandledRejection:', String(e.reason || e)]); };

    window.addEventListener('error', onErr);
    window.addEventListener('unhandledrejection', onRej);

    // Performance Long Tasks (diag blocaje UI)
    let po;
    try {
      if ('PerformanceObserver' in window) {
        po = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            append('warn', [`LongTask ~${Math.round(entry.duration)}ms`]);
          }
        });
        // @ts-ignore types
        po.observe({ entryTypes: ['longtask'] });
      }
    } catch {}

    // repaint rar (la 500ms) ca să nu sufocăm UI
    const int = setInterval(() => force(x => x + 1), 500);

    return () => {
      console.log = orig.log;
      console.warn = orig.warn;
      console.error = orig.error;
      console.info = orig.info;
      window.removeEventListener('error', onErr);
      window.removeEventListener('unhandledrejection', onRej);
      if (po) po.disconnect();
      clearInterval(int);
    };
  }, [enabled]);

  const logs = useMemo(() => bufferRef.current.slice(-MAX_LOGS), [bufferRef.current.length]);

  const copyAll = async () => {
    const text = logs.map(l => `[${l.ts}] ${l.t.toUpperCase()}  ${l.msg}`).join('\n');
    try { await navigator.clipboard.writeText(text); } catch {}
  };
  const clearAll = () => {
    bufferRef.current = [];
    setCountErr(0);
    force(x => x + 1);
  };

  // drag FAB
  const onMouseDown = (e) => {
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  };
  const onMouseMove = (e) => {
    if (!dragging.current) return;
    setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
  };
  const onMouseUp = () => { dragging.current = false; };

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [pos]);

  if (!enabled) return null;

  return (
    <>
      {/* FAB */}
      {!open && (
        <button
          className={styles.fab}
          style={{ left: pos.x, top: pos.y }}
          onMouseDown={onMouseDown}
          onClick={() => setOpen(true)}
          aria-label="Open debug console"
        >
          <span className={styles.dot} />
          <span className={styles.count}>{countErr}</span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className={styles.panel} role="dialog" aria-modal="true">
          <div className={styles.header}>
            <strong>Debug Console</strong>
            <div className={styles.headerActions}>
              <button className={styles.btnGhost} onClick={copyAll}>Copy All</button>
              <button className={styles.btnGhost} onClick={clearAll}>Clear</button>
              <button className={styles.btnClose} onClick={() => setOpen(false)}>×</button>
            </div>
          </div>

          <div className={styles.body}>
            {logs.length === 0 ? (
              <div className={styles.empty}>No logs yet.</div>
            ) : (
              logs.map((l, i) => (
                <div key={i} className={`${styles.row} ${styles[l.t]}`}>
                  <span className={styles.ts}>[{l.ts}]</span>
                  <span className={styles.type}>{l.t.toUpperCase()}</span>
                  <span className={styles.msg}>{l.msg}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
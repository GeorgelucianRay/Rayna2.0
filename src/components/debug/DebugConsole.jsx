// src/components/debug/DebugConsole.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './DebugConsole.module.css';

const MAX_LOGS = 500;
const POS_KEY = 'dbg_fab_pos_v1';
const COUNT_SINCE_OPEN = 'dbg_err_since_open_v1';

/** Util: format timp HH:MM:SS.mmm */
const ts = () => {
  const d = new Date();
  const p = (n, l=2) => String(n).padStart(l, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(),3)}`;
};

export default function DebugConsole({ enabled = false }) {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState([]);              // [{id,level,time,msg,stack,extra}]
  const [unreadErrors, setUnreadErrors] = useState(
    Number(sessionStorage.getItem(COUNT_SINCE_OPEN) || 0)
  );

  // poziția butonului plutitor (salvată)
  const [pos, setPos] = useState(() => {
    try { return JSON.parse(localStorage.getItem(POS_KEY)) || { x: null, y: null }; }
    catch { return { x: null, y: null }; }
  });
  const dragRef = useRef(null);
  const startRef = useRef({ x: 0, y: 0, left: 0, top: 0 });

  // păstrăm referințe la console originale
  const orig = useRef({ log: null, warn: null, error: null });
  const mounted = useRef(false);

  // push log în listă
  const push = (entry) => {
    setLogs((prev) => {
      const next = [...prev, entry].slice(-MAX_LOGS);
      return next;
    });
    if (entry.level === 'error' && !open) {
      setUnreadErrors((n) => {
        const v = n + 1;
        sessionStorage.setItem(COUNT_SINCE_OPEN, String(v));
        return v;
      });
    }
  };

  // helper compatibil cu window.__raynaLog(title, data, level)
  useEffect(() => {
    window.__raynaLog = (title, data, level = 'info') => {
      push({
        id: crypto.randomUUID?.() || String(Date.now() + Math.random()),
        level: level === 'warn' ? 'warn' : level === 'error' ? 'error' : 'info',
        time: ts(),
        msg: String(title ?? ''),
        extra: data,
        stack: null,
      });
    };
    return () => { try { delete window.__raynaLog; } catch {} };
  }, []);

  // hook: patch console + listen la erori globale
  useEffect(() => {
    if (!enabled || mounted.current) return;
    mounted.current = true;

    orig.current.log = console.log;
    orig.current.warn = console.warn;
    orig.current.error = console.error;

    console.log = (...args) => {
      orig.current.log?.(...args);
      push({
        id: crypto.randomUUID?.() || String(Math.random()),
        level: 'info',
        time: ts(),
        msg: args.map(a => formatArg(a)).join(' '),
        extra: args.length > 1 ? args : null,
        stack: getStack(),
      });
    };
    console.warn = (...args) => {
      orig.current.warn?.(...args);
      push({
        id: crypto.randomUUID?.() || String(Math.random()),
        level: 'warn',
        time: ts(),
        msg: args.map(a => formatArg(a)).join(' '),
        extra: args.length > 1 ? args : null,
        stack: getStack(),
      });
    };
    console.error = (...args) => {
      orig.current.error?.(...args);
      push({
        id: crypto.randomUUID?.() || String(Math.random()),
        level: 'error',
        time: ts(),
        msg: args.map(a => formatArg(a)).join(' '),
        extra: args.length > 1 ? args : null,
        stack: getStack(),
      });
    };

    const onError = (e) => {
      push({
        id: crypto.randomUUID?.() || String(Math.random()),
        level: 'error',
        time: ts(),
        msg: e?.message || 'Uncaught error',
        extra: { file: e?.filename, line: e?.lineno, col: e?.colno },
        stack: e?.error?.stack || null,
      });
    };
    const onRej = (e) => {
      push({
        id: crypto.randomUUID?.() || String(Math.random()),
        level: 'error',
        time: ts(),
        msg: 'Unhandled promise rejection',
        extra: { reason: formatArg(e?.reason) },
        stack: e?.reason?.stack || null,
      });
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRej);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRej);
      if (orig.current.log)  console.log  = orig.current.log;
      if (orig.current.warn) console.warn = orig.current.warn;
      if (orig.current.error)console.error= orig.current.error;
    };
  }, [enabled]);

  // când deschizi, resetează contorul de erori necitite
  useEffect(() => {
    if (open) {
      setUnreadErrors(0);
      sessionStorage.removeItem(COUNT_SINCE_OPEN);
    }
  }, [open]);

  const errorCount = useMemo(
    () => logs.filter(l => l.level === 'error').length,
    [logs]
  );

  // drag support
  const startDrag = (e) => {
    const el = dragRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    startRef.current.left = rect.left;
    startRef.current.top = rect.top;

    if (e.touches?.[0]) {
      startRef.current.x = e.touches[0].clientX;
      startRef.current.y = e.touches[0].clientY;
      window.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('touchend', endDrag);
    } else {
      startRef.current.x = e.clientX;
      startRef.current.y = e.clientY;
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', endDrag);
    }
  };
  const onMove = (e) => {
    e.preventDefault?.();
    const x = e.touches?.[0]?.clientX ?? e.clientX;
    const y = e.touches?.[0]?.clientY ?? e.clientY;
    const dx = x - startRef.current.x;
    const dy = y - startRef.current.y;
    setPos({ x: startRef.current.left + dx, y: startRef.current.top + dy });
  };
  const endDrag = () => {
    localStorage.setItem(POS_KEY, JSON.stringify(pos));
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', endDrag);
    window.removeEventListener('touchmove', onMove);
    window.removeEventListener('touchend', endDrag);
  };

  if (!enabled) return null;

  return (
    <>
      {/* FAB plutitor / mutabil */}
      <button
        ref={dragRef}
        className={styles.fab}
        style={{
          left: pos.x == null ? 'auto' : Math.max(8, Math.min(window.innerWidth - 64, pos.x)),
          top:  pos.y == null ? 'auto' : Math.max(8, Math.min(window.innerHeight - 64, pos.y)),
          right: pos.x == null ? 16 : 'auto',
          bottom: pos.y == null ? 16 : 'auto',
        }}
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        onClick={() => setOpen(true)}
        title="Debug"
      >
        <span className={styles.fabDot} />
        <span className={styles.fabCount}>{unreadErrors || errorCount}</span>
      </button>

      {/* MODAL full-screen */}
      {open && (
        <div className={styles.modalOverlay} onClick={() => setOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                Debug • {logs.length} loguri • {errorCount} erori
              </div>
              <div className={styles.actions}>
                <button className={styles.btn} onClick={() => copyAll(logs)}>Copy all</button>
                <button className={styles.btn} onClick={() => setLogs([])}>Clear</button>
                <button className={styles.btnPrimary} onClick={() => setOpen(false)}>Close</button>
              </div>
            </div>

            <div className={styles.list}>
              {logs.map((l) => (
                <LogRow key={l.id} entry={l} />
              ))}
              {logs.length === 0 && (
                <div className={styles.empty}>No logs yet.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function LogRow({ entry }) {
  const color =
    entry.level === 'error' ? styles.lvlError :
    entry.level === 'warn'  ? styles.lvlWarn  :
                              styles.lvlInfo;

  const copyOne = () => {
    const text = serialize([entry]);
    navigator.clipboard?.writeText(text).catch(()=>{});
  };

  const [openStack, setOpenStack] = useState(false);

  return (
    <div className={styles.row}>
      <div className={`${styles.badge} ${color}`}>{entry.level}</div>
      <div className={styles.body}>
        <div className={styles.headline}>
          <span className={styles.time}>{entry.time}</span>
          <span className={styles.msg}>{entry.msg}</span>
        </div>
        {entry.extra && (
          <pre className={styles.extra}>{safeJSON(entry.extra)}</pre>
        )}
        {entry.stack && (
          <details className={styles.stack} open={openStack} onToggle={(e)=>setOpenStack(e.target.open)}>
            <summary>stack trace</summary>
            <pre>{entry.stack}</pre>
          </details>
        )}
      </div>
      <button className={styles.copyOne} onClick={copyOne}>Copy</button>
    </div>
  );
}

/* helpers */
function safeJSON(v) {
  try { return JSON.stringify(v, null, 2); }
  catch { return String(v); }
}
function formatArg(a) {
  if (typeof a === 'string') return a;
  if (a instanceof Error) return `${a.message}`;
  try { return JSON.stringify(a); } catch { return String(a); }
}
function getStack() {
  try { throw new Error(); }
  catch (e) { return e?.stack || null; }
}
function serialize(list) {
  return list.map(l =>
    `[${l.time}] ${l.level.toUpperCase()}: ${l.msg}` +
    (l.extra ? `\n  extra: ${safeJSON(l.extra)}` : '') +
    (l.stack ? `\n  stack: ${l.stack}` : '')
  ).join('\n\n');
}
function copyAll(list) {
  const text = serialize(list);
  navigator.clipboard?.writeText(text).catch(()=>{});
}
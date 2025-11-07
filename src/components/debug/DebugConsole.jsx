import React, { useEffect, useRef, useState, useCallback } from 'react';

const LS_KEY_POS = 'debug.fab.pos';   // { x, y } în px (față de colțul stânga-sus)
const LS_KEY_OPEN = 'debug.panel.open';

function usePersistedState(key, def) {
  const [val, setVal] = useState(() => {
    try { const v = JSON.parse(localStorage.getItem(key)); return (v ?? def); }
    catch { return def; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }, [key, val]);
  return [val, setVal];
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

export default function DebugConsole({ enabled = true, initialOpen = false }) {
  const [open, setOpen] = usePersistedState(LS_KEY_OPEN, !!initialOpen);
  const [logs, setLogs] = useState([]);
  const panelRef = useRef(null);

  // poziția butonului flotant (default: dreapta-jos)
  const [pos, setPos] = usePersistedState(LS_KEY_POS, null);
  const btnRef = useRef(null);

  // === Capturăm erorile consolei (error + warn) ===
  useEffect(() => {
    if (!enabled) return;
    const origError = console.error;
    const origWarn = console.warn;
    const push = (type, args) => {
      setLogs(prev => [
        { id: Date.now() + Math.random(), type, when: new Date().toISOString(), text: args.map(a => {
          try { return typeof a === 'string' ? a : JSON.stringify(a); }
          catch { return String(a); }
        }).join(' ') },
        ...prev
      ]);
    };
    console.error = (...a) => { push('error', a); origError(...a); };
    console.warn  = (...a) => { push('warn',  a); origWarn(...a); };

    window.addEventListener('error', (e) => push('error', [e.message || 'WindowError']));
    window.addEventListener('unhandledrejection', (e) => push('error', [String(e.reason || 'PromiseRejection')]));

    return () => {
      console.error = origError;
      console.warn  = origWarn;
    };
  }, [enabled]);

  // === Drag & drop pentru buton ===
  useEffect(() => {
    const btn = btnRef.current;
    if (!btn || !enabled) return;

    let startX = 0, startY = 0;      // poziție cursor la start
    let originX = 0, originY = 0;    // poziția butonului la start
    let dragging = false;
    let moved = false;

    // dacă nu avem poziție salvată, pune-l în dreapta-jos
    if (!pos) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setPos({ x: vw - 72, y: vh - 120 }); // 72px de la dreapta, 120px de la jos
    }

    const onPointerDown = (e) => {
      // permite click normal daca nu vrei sa muți
      e.preventDefault();
      const ptX = (e.touches ? e.touches[0].clientX : e.clientX);
      const ptY = (e.touches ? e.touches[0].clientY : e.clientY);
      startX = ptX; startY = ptY;
      originX = (pos?.x ?? 20);
      originY = (pos?.y ?? 20);
      dragging = true; moved = false;
      window.addEventListener('pointermove', onPointerMove, { passive: false });
      window.addEventListener('pointerup', onPointerUp, { passive: false });
      window.addEventListener('touchmove', onPointerMove, { passive: false });
      window.addEventListener('touchend', onPointerUp, { passive: false });
    };

    const onPointerMove = (e) => {
      if (!dragging) return;
      const ptX = (e.touches ? e.touches[0].clientX : e.clientX);
      const ptY = (e.touches ? e.touches[0].clientY : e.clientY);
      const dx = ptX - startX;
      const dy = ptY - startY;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const btnW = btn.offsetWidth  || 56;
      const btnH = btn.offsetHeight || 56;
      const nextX = clamp(originX + dx, 6, vw - btnW - 6);
      const nextY = clamp(originY + dy, 6, vh - btnH - 6);
      setPos({ x: nextX, y: nextY });
      e.preventDefault();
    };

    const onPointerUp = (e) => {
      dragging = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);

      // Snap la margini dacă e aproape
      const vw = window.innerWidth;
      const btnW = btn.offsetWidth || 56;
      if (pos) {
        const margin = 12;
        const snapLeft  = pos.x <= margin ? margin : pos.x;
        const snapRight = (vw - (pos.x + btnW)) <= margin ? vw - btnW - margin : snapLeft;
        setPos(p => ({ ...p, x: snapRight }));
      }

      // Dacă nu s-a mișcat aproape deloc => tratează ca „click”
      if (!moved) {
        setOpen(o => !o);
      }
    };

    btn.addEventListener('pointerdown', onPointerDown);
    btn.addEventListener('touchstart', onPointerDown, { passive: false });

    return () => {
      btn.removeEventListener('pointerdown', onPointerDown);
      btn.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
    };
  }, [enabled, pos, setPos, setOpen]);

  const clearLogs = useCallback(() => setLogs([]), []);

  if (!enabled) return null;

  // stiluri inline mici (evităm CSS extra)
  const fabStyle = {
    position: 'fixed',
    left: (pos?.x ?? 20) + 'px',
    top:  (pos?.y ?? 20) + 'px',
    width: 56, height: 56, borderRadius: '50%',
    display: 'grid', placeItems: 'center',
    background: 'linear-gradient(180deg, rgba(34,197,94,.95), rgba(34,197,94,.82))',
    color: '#062012',
    boxShadow: '0 10px 30px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.35)',
    border: '1px solid rgba(255,255,255,.7)',
    cursor: 'grab',
    userSelect: 'none',
    zIndex: 5000
  };

  const panelStyle = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,.55)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    zIndex: 5001,
    display: open ? 'grid' : 'none',
    placeItems: 'center',
    padding: 16
  };

  const cardStyle = {
    width: 'min(920px, 96vw)',
    height: 'min(82vh, 720px)',
    background: 'linear-gradient(180deg, rgba(255,255,255,.16), rgba(255,255,255,.06))',
    border: '1px solid rgba(255,255,255,.2)',
    borderRadius: 16,
    color: '#f3f6fb',
    boxShadow: '0 30px 80px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.25)',
    display: 'grid',
    gridTemplateRows: 'auto 1fr auto',
    overflow: 'hidden'
  };

  const headerStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,.15)'
  };

  const listStyle = {
    overflow: 'auto',
    padding: 12,
    display: 'grid',
    gap: 8
  };

  const rowStyle = (type) => ({
    padding: '10px 12px',
    borderRadius: 10,
    background: type === 'error'
      ? 'linear-gradient(180deg, rgba(239,68,68,.25), rgba(239,68,68,.12))'
      : 'linear-gradient(180deg, rgba(234,179,8,.22), rgba(234,179,8,.10))',
    border: '1px solid rgba(255,255,255,.15)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word'
  });

  const footerStyle = {
    display: 'flex', gap: 8, justifyContent: 'flex-end',
    padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,.15)'
  };

  const badgeStyle = {
    position: 'absolute',
    top: -6, right: -6,
    background: '#ef4444',
    color: '#fff',
    borderRadius: 12,
    fontSize: 12,
    padding: '0 6px',
    border: '1px solid rgba(255,255,255,.9)',
    boxShadow: '0 4px 10px rgba(0,0,0,.35)'
  };

  const copyAll = async () => {
    const txt = logs.map(l => `[${l.when}] ${l.type.toUpperCase()} :: ${l.text}`).join('\n');
    try {
      await navigator.clipboard.writeText(txt);
      alert('Copiat în clipboard.');
    } catch {
      // fallback textarea
      const ta = document.createElement('textarea');
      ta.value = txt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      alert('Copiat în clipboard.');
    }
  };

  return (
    <>
      {/* FAB – drag & drop + număr erori */}
      <button ref={btnRef} type="button" style={fabStyle} aria-label="Debug console">
        <span style={{ fontWeight: 900 }}>DBG</span>
        {logs.length > 0 && <span style={badgeStyle}>{logs.length}</span>}
      </button>

      {/* PANOU */}
      <div style={panelStyle}>
        <div ref={panelRef} style={cardStyle}>
          <div style={headerStyle}>
            <strong>Rayna – Debug Console</strong>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={clearLogs}
                style={{
                  padding: '8px 12px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,.25)',
                  background: 'linear-gradient(180deg, rgba(255,255,255,.18), rgba(255,255,255,.08))',
                  color: '#fff', cursor: 'pointer'
                }}
              >
                Clear
              </button>
              <button
                onClick={() => setOpen(false)}
                style={{
                  padding: '8px 12px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,.25)',
                  background: 'linear-gradient(180deg, rgba(255,255,255,.18), rgba(255,255,255,.08))',
                  color: '#fff', cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>

          <div style={listStyle}>
            {logs.length === 0 && (
              <div style={{ opacity: .6, padding: 12 }}>Nicio eroare/avertisment înregistrat încă.</div>
            )}
            {logs.map(l => (
              <div key={l.id} style={rowStyle(l.type)}>
                <div style={{ fontSize: 12, opacity: .75, marginBottom: 4 }}>
                  [{new Date(l.when).toLocaleString()}] {l.type.toUpperCase()}
                </div>
                <div>{l.text}</div>
              </div>
            ))}
          </div>

          <div style={footerStyle}>
            <button
              onClick={copyAll}
              style={{
                padding: '10px 14px', borderRadius: 12, fontWeight: 800,
                border: '1px solid rgba(255,255,255,.25)',
                background: 'linear-gradient(180deg, rgba(59,130,246,.85), rgba(59,130,246,.70))',
                color: '#0b1220', cursor: 'pointer'
              }}
            >
              Copy all
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
// src/components/depot/map/ui/FPControls.jsx
import React, { useRef, useState } from 'react';
import * as THREE from 'three';

export default function FPControls({ ensureFP, setForwardPressed, setJoystick }) {
  return (
    <>
      <VirtualJoystick ensureFP={ensureFP} onChange={setJoystick} />
      <ForwardButton ensureFP={ensureFP} setForwardPressed={setForwardPressed} />
    </>
  );
}

function VirtualJoystick({ onChange, ensureFP, size = 120 }) {
  const ref = useRef(null);
  const [active, setActive] = useState(false);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  function setVec(clientX, clientY) {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width/2, cy = r.top + r.height/2;
    const dx = clientX - cx, dy = clientY - cy;
    const rad = r.width / 2;
    const nx = THREE.MathUtils.clamp(dx / rad, -1, 1);
    const ny = THREE.MathUtils.clamp(dy / rad, -1, 1);
    setKnob({ x: nx, y: ny });
    onChange?.({ x: nx, y: ny, active: true });
  }
  const stop = () => { setKnob({x:0,y:0}); setActive(false); onChange?.({x:0,y:0,active:false}); };
  return (
    <div
      ref={ref}
      style={{
        position:'absolute', left:12, bottom:12, zIndex:5,
        width:size, height:size, borderRadius:size/2,
        background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,.2)',
        touchAction:'none', userSelect:'none'
      }}
      onMouseDown={e => { ensureFP?.(); setActive(true); setVec(e.clientX, e.clientY); }}
      onMouseMove={e => active && setVec(e.clientX, e.clientY)}
      onMouseUp={stop} onMouseLeave={stop}
      onTouchStart={e => { ensureFP?.(); setActive(true); const t=e.touches[0]; setVec(t.clientX,t.clientY); }}
      onTouchMove={e => { const t=e.touches[0]; setVec(t.clientX,t.clientY); }}
      onTouchEnd={stop}
    >
      <div style={{
        position:'absolute',
        left:`calc(50% + ${knob.x * (size*0.35)}px)`,
        top:`calc(50% + ${knob.y * (size*0.35)}px)`,
        transform:'translate(-50%,-50%)',
        width:size*0.35, height:size*0.35, borderRadius:'50%',
        background:'rgba(255,255,255,.25)', backdropFilter:'blur(2px)'
      }}/>
    </div>
  );
}

function ForwardButton({ ensureFP, setForwardPressed }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onMouseDown={() => { ensureFP?.(); setPressed(true); setForwardPressed(true); }}
      onMouseUp={() => { setPressed(false); setForwardPressed(false); }}
      onMouseLeave={() => { setPressed(false); setForwardPressed(false); }}
      onTouchStart={() => { ensureFP?.(); setPressed(true); setForwardPressed(true); }}
      onTouchEnd={() => { setPressed(false); setForwardPressed(false); }}
      title="Mergi înainte"
      style={{
        position:'absolute', right:12, bottom:14, zIndex:5,
        width:64, height:64, borderRadius:32, border:'none',
        background: pressed ? '#10b981' : '#1f2937', color:'#fff',
        fontSize:30, lineHeight:'64px', boxShadow:'0 2px 10px rgba(0,0,0,.25)'
      }}
    >↑</button>
  );
}
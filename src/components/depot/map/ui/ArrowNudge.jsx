// src/components/depot/map/ui/ArrowNudge.jsx
import React from 'react';

export default function ArrowNudge({ controller }) {
  if (!controller) return null;

  const move = (dx, dz) => controller.nudgeSelected?.(dx, dz);
  const rot = () => controller.rotateSelected?.(1);

  const btnStyle = {
    width: 50,
    height: 50,
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,.15)',
    background: 'rgba(0,0,0,0.7)',
    color: '#fff',
    fontSize: 22,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    userSelect: 'none',
  };

  return (
    <div
      style={{
        position: 'absolute',
        right: 20,
        bottom: 80,
        zIndex: 50,
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 50px)',
        gridTemplateRows: 'repeat(3, 50px)',
        gap: 6,
        justifyItems: 'center',
        alignItems: 'center',
      }}
    >
      <div />
      <button style={btnStyle} onClick={() => move(0, -1)}>↑</button>
      <div />
      <button style={btnStyle} onClick={() => move(-1, 0)}>←</button>
      <button style={{ ...btnStyle, background: '#22c55e' }} onClick={rot}>↻</button>
      <button style={btnStyle} onClick={() => move(1, 0)}>→</button>
      <div />
      <button style={btnStyle} onClick={() => move(0, 1)}>↓</button>
      <div />
    </div>
  );
}
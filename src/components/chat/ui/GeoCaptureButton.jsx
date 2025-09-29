import React, { useState } from "react";

export default function GeoCaptureButton({ className, label = "Usar mi ubicación", onCoords }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className={className}
      onClick={() => {
        if (!navigator.geolocation) return alert("La geolocalización no es compatible con este navegador.");
        setBusy(true);
        navigator.geolocation.getCurrentPosition(
          ({ coords: { latitude, longitude } }) => {
            setBusy(false);
            const s = `${latitude},${longitude}`;
            onCoords?.(s);
          },
          (err) => {
            setBusy(false);
            alert(`Error al obtener la ubicación: ${err.message}`);
          }
        );
      }}
    >
      {busy ? "Obteniendo…" : label}
    </button>
  );
}
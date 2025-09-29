import React, { useState } from "react";

export default function GeoCaptureButton({ onCoords }) {
  const [busy, setBusy] = useState(false);

  const get = () => {
    if (!navigator.geolocation) {
      alert("La geolocalización no es compatible.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude, longitude } }) => {
        setBusy(false);
        onCoords?.(`${latitude},${longitude}`);
      },
      (err) => {
        setBusy(false);
        alert(err.message || "No se pudo obtener la ubicación.");
      }
    );
  };

  return (
    <button type="button" onClick={get} disabled={busy}>
      {busy ? "…" : "Usar mi ubicación"}
    </button>
  );
}
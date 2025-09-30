import React, { useState } from "react";
import styles from "../Chatbot.module.css"; // dacă îți dă 404, schimbă în: "../../Chatbot.module.css"

export default function GeoCaptureButton({
  onGotCoords,          // (lat,lon) ca string "41.12,2.33"
  onError,              // mesaj de eroare
  label = "Usar mi ubicación",
  highAccuracy = true,  // poți forța precizie mare
  timeoutMs = 12000,    // timeout pentru geo
  className = "",       // ca să poți adăuga clase suplimentare
  disabled = false,
}) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (!navigator.geolocation) {
      onError?.("La geolocalización no es compatible en este navegador.");
      return;
    }
    try {
      setBusy(true);
      navigator.geolocation.getCurrentPosition(
        ({ coords: { latitude, longitude } }) => {
          setBusy(false);
          onGotCoords?.(`${latitude},${longitude}`);
        },
        (err) => {
          setBusy(false);
          onError?.(err?.message || "No se pudo obtener la ubicación.");
        },
        {
          enableHighAccuracy: !!highAccuracy,
          timeout: timeoutMs,
          maximumAge: 0,
        }
      );
    } catch (e) {
      setBusy(false);
      onError?.(e?.message || String(e));
    }
  }

  return (
    <button
      type="button"
      className={`${styles.actionBtn} ${className}`.trim()}
      onClick={handleClick}
      disabled={busy || disabled}
      aria-busy={busy ? "true" : "false"}
      data-variant="secondary"
      title={label}
    >
      {busy ? "Obteniendo…" : label}
    </button>
  );
}
// src/components/chat/geo.js
export function makeGeoHelpers({ styles, setMessages, setAwaiting, setParkingCtx }) {
  async function tryGetUserPos() {
    if (!("geolocation" in navigator)) return null;
    try {
      const pos = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => resolve({ lat: coords.latitude, lon: coords.longitude }),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );
      });
      return pos;
    } catch {
      return null;
    }
  }

  async function askUserLocationInteractive() {
    setMessages(m => [
      ...m,
      {
        from: "bot",
        reply_text: "",
        render: () => (
          <div className={styles.card}>
            <div className={styles.cardTitle}>Necesito tu ubicación</div>
            <div className={styles.cardSubtitle}>
              Para calcular si llegas a otro parking, necesito saber dónde estás.
            </div>
            <div className={styles.cardActions}>
              <button
                className={styles.actionBtn}
                data-variant="primary"
                onClick={() => {
                  if (!("geolocation" in navigator)) {
                    alert("La geolocalización no está disponible en este dispositivo.");
                    return;
                  }
                  navigator.geolocation.getCurrentPosition(
                    ({ coords }) => {
                      const pos = { lat: coords.latitude, lon: coords.longitude };
                      setParkingCtx((ctx) => ({ ...(ctx || {}), userPos: pos }));
                      setMessages(mm => [
                        ...mm,
                        { from: "bot", reply_text: "¡Listo! Ya tengo tu ubicación. ¿Cuánto disco te queda? (ej.: 1:25 o 45 min)" }
                      ]);
                      setAwaiting("parking_time_left");
                    },
                    (err) => {
                      alert(`No he podido obtener la ubicación: ${err?.message || "desconocido"}`);
                    },
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                  );
                }}
              >
                Usar mi ubicación
              </button>
            </div>
          </div>
        ),
      },
    ]);
  }

  return { tryGetUserPos, askUserLocationInteractive };
}

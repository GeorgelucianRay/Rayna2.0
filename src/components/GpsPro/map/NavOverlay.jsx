// src/components/GpsPro/map/NavOverlay.jsx

// MODIFICAT: Adaugă 'mode' în lista de props. Îi dăm valoarea implicită 'navigation'.
export default function NavOverlay({ title = 'Navigație', geojson, onClose, mode = 'navigation' }) {
  const mapEl = useRef(null);
  // ... restul de refs și state

  // ... useEffect-ul de inițializare a hărții rămâne la fel ...

  // === pornește/ oprește geolocation watch ===
  useEffect(() => {
    // MODIFICAT: Adăugăm o condiție la început.
    // Dacă suntem în modul 'preview', nu pornim deloc logica de GPS.
    if (mode !== 'navigation') return;

    if (!mapRef.current) return;

    if (!running) {
      // ... restul logicii de oprire a GPS-ului
      return;
    }
    // ... restul logicii de pornire a GPS-ului (watchPosition)
    
  }, [running, followMe, zoomPreset, mode]); // MODIFICAT: Adaugă 'mode' la dependențe

  // ... restul funcțiilor (fitRoute, fitMe, etc.) rămân la fel ...

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.title} title={title}>{title}</div>
        <div className={styles.controls}>

          {/* MODIFICAT: Afișăm aceste butoane DOAR dacă suntem în modul navigație */}
          {mode === 'navigation' && (
            <>
              <button
                className={`${styles.btn} ${running ? styles.btnDanger : styles.btnPrimary}`}
                onClick={() => setRunning((v) => !v)}
              >
                {running ? 'Stop' : 'Start'}
              </button>

              <button
                className={`${styles.btn} ${followMe ? styles.btnActive : ''}`}
                onClick={() => setFollowMe((v) => !v)}
                title="Camera follow"
              >
                {followMe ? 'Follow ON' : 'Follow OFF'}
              </button>

              <button
                className={styles.btn}
                onClick={toggleZoomPreset}
                title="Comută 80m / 1km"
              >
                {zoomPreset === 'close' ? '≈80 m' : '≈1 km'}
              </button>
              
              <button className={styles.btn} onClick={fitMe} title="Zoom la mine">Eu</button>
            </>
          )}

          {/* Aceste butoane sunt afișate mereu */}
          <button className={styles.btn} onClick={fitRoute} title="Zoom la rută">Rută</button>
          <button className={styles.btnClose} onClick={handleClose} title="Închide">×</button>
        </div>
      </div>

      <div ref={mapEl} className={styles.map}/>
    </div>
  );
}

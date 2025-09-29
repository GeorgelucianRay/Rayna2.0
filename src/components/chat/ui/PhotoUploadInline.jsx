import React, { useRef, useState } from "react";

export default function PhotoUploadInline({ onUploaded, onSkip }) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  return (
    <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop: 8 }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display:"none" }}
        onChange={async (e) => {
          try {
            const f = e.target.files?.[0];
            if (!f) return;
            setBusy(true);
            // delegăm upload-ul către părinte (RaynaHub) – acesta a importat uploadToImgbb
            // ca să fie simplu, pasăm direct fișierul în `onUploaded(file)` și părinte face upload
            // dacă preferi, mută logica de upload aici.
            onUploaded && onUploaded(f);
          } finally {
            setBusy(false);
            e.target.value = "";
          }
        }}
      />
      <button
        className="btn"
        style={{ padding:"8px 12px", borderRadius:10, border:0, cursor:"pointer" }}
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        {busy ? "Subiendo…" : "Subir foto / Hacer foto"}
      </button>
      <button
        className="btn"
        style={{ padding:"8px 12px", borderRadius:10, border:0, cursor:"pointer", background:"#cbd5e1" }}
        onClick={onSkip}
        disabled={busy}
      >
        Saltar
      </button>
    </div>
  );
}
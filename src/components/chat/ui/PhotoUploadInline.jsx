import React, { useState } from "react";

const IMGBB_KEY = import.meta.env.VITE_IMGBB_API_KEY;

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onerror = () => rej(new Error("No se pudo leer el archivo."));
    r.onload = () => {
      const s = String(r.result || "");
      res(s.includes("base64,") ? s.split("base64,")[1] : s);
    };
    r.readAsDataURL(file);
  });
}

export default function PhotoUploadInline({ onUploaded, disabled }) {
  const [uploading, setUploading] = useState(false);

  async function handleChange(e) {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!IMGBB_KEY) throw new Error("Falta VITE_IMGBB_API_KEY");
      setUploading(true);

      const base64 = await fileToBase64(file);
      const form = new FormData();
      form.append("key", IMGBB_KEY);
      form.append("image", base64);

      const resp = await fetch("https://api.imgbb.com/1/upload", { method: "POST", body: form });
      const json = await resp.json();
      if (!resp.ok || !json?.success) throw new Error(json?.error?.message || "Upload falló");

      const url = json?.data?.display_url || json?.data?.image?.url || json?.data?.url;
      onUploaded?.(url);
    } catch (err) {
      alert(err.message || String(err));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input type="file" accept="image/*" capture="environment" onChange={handleChange} disabled={disabled || uploading} />
      {uploading && <span style={{ fontSize: 12, opacity: 0.8 }}>Subiendo…</span>}
    </div>
  );
}
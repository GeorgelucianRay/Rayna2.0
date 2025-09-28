// src/components/chat/ChatMiniMap.jsx
import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ✅ Fix pentru iconițele markerului (Vite/Webpack nu servesc automat PNG-urile Leaflet)
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/**
 * Mini hartă pentru chat.
 * Props:
 * - geojson?: object|string  — rută/zonă (Feature/FeatureCollection/Geometry sau string JSON)
 * - center?: [lat, lon]      — fallback dacă nu există geojson
 * - zoom?: number            — zoom inițial (default 11)
 * - mapsLink?: string        — link către Google Maps; click pe hartă îl deschide
 * - title?: string           — pentru aria-label și marker title
 * - onClick?: () => void     — handler personalizat la click (override peste mapsLink)
 */
export default function ChatMiniMap({ geojson, center, zoom = 11, mapsLink, title, onClick }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // creează harta o singură dată
    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;
    let bounds;

    // curăță layerele non-tile înainte să adaugi altele
    map.eachLayer((l) => {
      if (l instanceof L.TileLayer) return; // păstrează tile layer-ul
      map.removeLayer(l);
    });

    // parsează geojson dacă e string
    let gj = geojson;
    if (typeof gj === "string") {
      try { gj = JSON.parse(gj); } catch { gj = null; }
    }

    if (gj) {
      const layer = L.geoJSON(gj).addTo(map);
      bounds = layer.getBounds();
    }

    if (!bounds || !bounds.isValid()) {
      // fallback pe center sau Barcelona
      const hasCenter =
        Array.isArray(center) && center.length === 2 &&
        isFinite(Number(center[0])) && isFinite(Number(center[1]));
      const c = hasCenter ? [Number(center[0]), Number(center[1])] : [41.385, 2.17];
      map.setView(c, zoom);
      // pune un marker ca să se vadă punctul
      L.marker(c, { title: title || "" }).addTo(map);
    } else {
      map.fitBounds(bounds.pad(0.2));
    }

    // click => deschide Google Maps sau handler custom
    const handler = () => {
      if (typeof onClick === "function") return onClick();
      if (mapsLink) window.open(mapsLink, "_blank", "noopener");
    };
    const el = containerRef.current;
    el?.addEventListener("click", handler);

    return () => {
      el?.removeEventListener("click", handler);
      // menținem instanța hărții (nu o distrugem) pentru performanță
      // dacă vrei teardown complet la demontare, poți folosi: map.remove();
    };
  }, [geojson, center, zoom, mapsLink, title, onClick]);

  return (
    <div style={{ borderRadius: 12, overflow: "hidden", cursor: mapsLink || onClick ? "pointer" : "default" }}>
      <div
        ref={containerRef}
        style={{ width: "100%", height: 180 }}
        aria-label={title ? `Mapa: ${title}` : "Mapa"}
      />
    </div>
  );
}
import React from "react";
import GeoCaptureButton from "./GeoCaptureButton";

export default function GeoCaptureCard({ onGotCoords }) {
  return (
    <div className="card" style={{ marginTop: 8 }}>
      <div className="cardActions">
        <GeoCaptureButton
          onGotCoords={onGotCoords}
          onError={(msg) => alert("Error al obtener ubicación: " + msg)}
        />
      </div>
    </div>
  );
}
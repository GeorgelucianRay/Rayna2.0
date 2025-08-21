/* ============ MODAL (DETALII PROGRAMARE) ============ */
.modalOverlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.6);
  backdrop-filter: blur(6px);
  display: grid; place-items: center;
  z-index: 3000;
  padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right))
           max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
}

.modal {
  background: rgba(17,24,39,.95);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,.15);
  border-radius: 16px;
  width: min(560px, calc(100vw - 32px));
  max-height: min(90vh, 720px);
  padding: 16px;
  color: #fff;
  box-shadow: 0 18px 50px rgba(0,0,0,.35);
  overflow: auto;
  animation: modalFadeIn .22s ease-out;
  box-sizing: border-box;
}

@keyframes modalFadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to   { opacity: 1; transform: translateY(0); }
}

.modalHeader {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid rgba(255,255,255,.15);
  padding-bottom: 10px; margin-bottom: 12px;
}

.modalTitle {
  margin: 0;
  font-size: clamp(1.05rem, 1rem + 0.5vw, 1.25rem);
  line-height: 1.2;
  white-space: normal;
}

.closeIcon {
  appearance: none; border: none; background: transparent; color: #cbd5e1;
  cursor: pointer; font-size: 18px; line-height: 1;
}
.closeIcon:hover { color: #fff; }

.modalBody {
  display: grid; gap: 12px;
  word-break: break-word;
}

.inputGroup { display: flex; flex-direction: column; gap: 6px; }
.inputGroup label {
  font-weight: 800; color: #e5e7eb; font-size: .95rem;
  white-space: normal;
}

.inputGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
@media (max-width: 768px) {
  .inputGrid { grid-template-columns: 1fr; }
}

.modalBody input {
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.15);
  color: #fff;
  padding: 10px 12px;
  border-radius: 10px;
  min-width: 0;
}
.modalBody input::placeholder { color: #9ca3af; }

/* Footer + butoane */
.modalFooter {
  position: sticky;
  bottom: 0;
  margin-top: 10px;
  padding-top: 10px;
  background: linear-gradient(180deg, transparent, rgba(17,24,39,0.85) 30%);
  backdrop-filter: blur(2px);
  border-top: 1px solid rgba(255,255,255,.15);
  display: flex; justify-content: flex-end; gap: 10px;
}

/* Refolosim stilurile tale de acțiuni, le completăm aici ca să existe în modul */
.actionMini,
.actionGhost,
.actionOk {
  padding: 10px 14px;
  border-radius: 10px;
  font-weight: 800;
  border: none;
  cursor: pointer;
  transition: transform .15s ease, box-shadow .15s ease, opacity .15s;
  white-space: nowrap;
}

.actionMini { background: linear-gradient(90deg, #fb923c, #f97316); color: #111827; }
.actionMini:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(249,115,22,.35); }

.actionGhost { background: rgba(255,255,255,.08); color: #e5e7eb; border: 1px solid rgba(255,255,255,.18); }
.actionGhost:hover { opacity: .95; }

.actionOk { background: linear-gradient(90deg, #16a34a, #22c55e); color: #fff; }
.actionOk:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(34,197,94,.35); }
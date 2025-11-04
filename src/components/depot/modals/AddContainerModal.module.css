/* ===== iOS 26 scoped theme ===== */
.ios {
  /* tokens */
  --accent: #3be476;
  --text-strong:#eaf3ff;
  --text-soft:#b7c7e6;
  --glass: rgba(255,255,255,.06);
  --glass-strong: rgba(255,255,255,.10);
  --stroke: rgba(255,255,255,.18);
  --stroke-2: rgba(255,255,255,.28);
  --r-xl: 22px; --r-lg: 16px; --r-md: 12px;
  --inset: inset 0 1px 0 rgba(255,255,255,.14), inset 0 -1px 0 rgba(0,0,0,.25);
  --shadow: 0 16px 40px rgba(0,0,0,.28);
  font-family: ui-rounded, SF Pro Rounded, SF Pro Text, -apple-system, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
  color: var(--text-strong);
}

/* titlu sheet */
.title {
  margin: 6px 6px 14px;
  font-size: 21px;
  font-weight: 800;
  letter-spacing: .2px;
}

/* formular */
.form { display: grid; gap: 12px; }

/* label + control block */
.block { display: grid; gap: 6px; }

.label {
  font-size: 14px;
  color: var(--text-soft);
}

/* câmp standard */
.input, .select, .area {
  width: 100%;
  padding: 12px 14px;
  border-radius: var(--r-md);
  border: 1px solid var(--stroke);
  background: var(--glass);
  color: var(--text-strong);
  box-shadow: var(--inset);
  outline: none;
  appearance: none;
}

.select {
  padding-right: 36px; /* loc pentru indicator */
  background-image: linear-gradient(45deg, transparent 50%, var(--text-soft) 50%),
                    linear-gradient(135deg, var(--text-soft) 50%, transparent 50%),
                    linear-gradient(to right, transparent, transparent);
  background-position: calc(100% - 18px) calc(50% - 2px), calc(100% - 10px) calc(50% - 2px), 100% 0;
  background-size: 6px 6px, 6px 6px, 2.5em 2.5em;
  background-repeat: no-repeat;
}

/* focus iOS accent */
.input:focus, .select:focus, .area:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in oklab, var(--accent) 30%, transparent), var(--inset);
}

/* rând mixt */
.row { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 12px 16px; }

/* switch (checkbox iOS) */
.switch {
  --w: 48px; --h: 28px;
  position: relative; width: var(--w); height: var(--h);
}
.switch input { position: absolute; inset: 0; opacity: 0; }
.switchTrack {
  width: 100%; height: 100%;
  background: rgba(255,255,255,.18);
  border: 1px solid var(--stroke);
  border-radius: 999px;
  box-shadow: inset 0 -2px 6px rgba(0,0,0,.2);
  transition: background .18s ease, border-color .18s ease;
}
.switchThumb {
  position: absolute; top: 2px; left: 2px;
  width: 24px; height: 24px; border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 10px rgba(0,0,0,.35), inset 0 0 0 1px rgba(0,0,0,.06);
  transition: transform .18s ease;
}
.switch input:checked ~ .switchTrack { background: color-mix(in oklab, var(--accent) 72%, #000 8%); border-color: color-mix(in oklab, var(--accent) 65%, #000 10%); }
.switch input:checked ~ .switchThumb { transform: translateX(20px); }

/* butoane */
.actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 6px; }

.btn {
  padding: 12px 16px;
  border-radius: 999px;
  font-weight: 800;
  letter-spacing: .2px;
  cursor: pointer;
  border: 1px solid var(--stroke);
  box-shadow: var(--inset), 0 6px 16px rgba(0,0,0,.25);
  background: var(--glass);
  color: var(--text-strong);
}

.primary {
  background: linear-gradient(180deg, color-mix(in oklab, var(--accent) 96%, #fff 0%) 0%, color-mix(in oklab, var(--accent) 82%, #000 0%) 100%);
  color: #071d11;
  border: 1px solid rgba(255,255,255,.75);
  box-shadow: 0 12px 26px color-mix(in oklab, var(--accent) 35%, black 0%), var(--inset);
}
.primary:active { transform: translateY(1px); opacity: .95; }

/* responsive */
@media (max-width: 720px) {
  .row { grid-template-columns: 1fr; }
}
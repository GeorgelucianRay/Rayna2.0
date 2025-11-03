// src/components/chat/errorBus.js
import { supabase } from "../../supabaseClient";

// Mic event-bus pentru erori
const listeners = new Set();

export function onError(fn)  { listeners.add(fn); return () => listeners.delete(fn); }
export function offError(fn) { listeners.delete(fn); }

function emit(payload) {
  for (const fn of listeners) {
    try { fn(payload); } catch {}
  }
}

// Normalizează orice într-un obiect de eroare coerent
function normalizeError(err, meta = {}) {
  if (!err) err = new Error("Unknown error");
  let message = "";
  let stack   = "";

  if (err instanceof Error) { message = err.message; stack = err.stack || ""; }
  else if (typeof err === "string") { message = err; }
  else {
    try { message = JSON.stringify(err); }
    catch { message = String(err); }
  }

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    time: new Date().toISOString(),
    message,
    stack,
    meta: meta || {},
  };
}

// Trimite în Supabase, „best-effort” (nu spamează UI în caz de fail)
async function sendToSupabase(row) {
  try {
    // Creează tabela dacă nu există:
    // create table if not exists public.chat_errors (
    //   id bigserial primary key,
    //   time timestamptz not null,
    //   message text,
    //   stack text,
    //   meta jsonb
    // );
    await supabase.from("chat_errors").insert([{
      time: row.time,
      message: row.message,
      stack: row.stack,
      meta: row.meta || null,
    }]);
  } catch (e) {
    // Ultima linie de apărare – NU aruncăm, doar logăm
    // eslint-disable-next-line no-console
    console.warn("[chat_errors] insert failed:", e?.message || e);
  }
}

// API public: raportează o eroare (UI + logs + supabase)
export function reportError(err, meta = {}) {
  const row = normalizeError(err, meta);
  // Console pentru dev
  // eslint-disable-next-line no-console
  console.error("❌ [RaynaChatError]", row.message, row);
  emit(row);
  // Fire-and-forget către Supabase
  sendToSupabase(row);
  return row.id;
}
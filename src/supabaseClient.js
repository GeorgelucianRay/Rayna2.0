// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// (opțional) mic sanity check — ajută la debug dacă variabilele lipsesc
if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn('[supabase] Missing env vars VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,      // păstrează sesiunea în storage
    autoRefreshToken: true,    // reîmprospătare JWT în fundal
    detectSessionInUrl: true,  // util la magic link / OAuth (nu dăunează)
    // NU setăm `storage` manual; default e localStorage în browser
    storageKey: 'rayna.supabase' // prefix stabil ca să nu colizionezi cu alte app-uri
  },
  global: {
    headers: { 'x-client-info': 'rayna-frontend' },
  },
});
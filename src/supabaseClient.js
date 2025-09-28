// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const url  = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,        // păstrează JWT în storage
    autoRefreshToken: true,      // reîmprospătare automată
    detectSessionInUrl: true,    // util după redirect (magic link / OAuth)
    storage: localStorage,       // explicit (Safari/iOS)
    storageKey: 'rayna.auth'     // cheie unică, să nu se calce cu alte app-uri
  },
  global: {
    headers: { 'x-client-info': 'rayna-frontend' }
  }
});
// src/supabaseClient.js

import { createClient } from '@supabase/supabase-js'

// Citește variabilele din .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
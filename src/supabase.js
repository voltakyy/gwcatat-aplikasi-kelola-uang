// src/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Supabase environment variables tidak ditemukan!')
  console.error('Pastikan Vercel Integration sudah terpasang atau .env.local sudah diisi.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

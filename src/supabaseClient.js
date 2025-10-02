import { createClient } from '@supabase/supabase-js';

// TODO: Trage hier deine Supabase-URL und den Public-API-Key ein
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

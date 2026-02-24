/// <reference types="vite/client" />
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

let _supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
    try {
        _supabase = createClient(supabaseUrl, supabaseAnonKey);
    } catch (err) {
        console.warn('VYRE: Failed to create Supabase client:', err);
    }
} else {
    console.warn('VYRE: Missing Supabase credentials. Auth and feed will run in offline/beta-only mode.');
}

export const supabase = _supabase;

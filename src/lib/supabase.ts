import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && key);

/** Only the publishable key is ever used in the browser. */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, key as string, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

export const VIDEO_BUCKET: string = (import.meta.env.VITE_VIDEO_BUCKET as string | undefined) || 'videos';
export const BUCKET_IS_PUBLIC: boolean = import.meta.env.VITE_BUCKET_IS_PUBLIC === 'true';

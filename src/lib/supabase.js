import { createClient } from '@supabase/supabase-js';

// Public values (safe in the browser). Set them in Vercel > Settings > Environment Variables
// and in .env.local for local development. Data is protected by Row Level Security.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// When the variables are missing the app keeps working offline-only (no sign-in UI).
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          // PKCE puts ?code=... in the query string, so it never collides with the #/ routes.
          flowType: 'pkce',
          detectSessionInUrl: true,
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null;

export const authEnabled = !!supabase;

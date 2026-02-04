import { createClient } from "@supabase/supabase-js";

// Prefer environment variables, but fall back to the known project values
// provided for this prototype so the app works even if .env.local is missing
// or not picked up by the dev server.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://xjyemgqilmerpwlwvhzr.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqeWVtZ3FpbG1lcnB3bHd2aHpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NjIxNzUsImV4cCI6MjA4NTMzODE3NX0.x1Ojhc75cAqi9LGK-5GtFYUYZ6YxaHY4wGDUw2lM0I8";

if (!supabaseUrl || !supabaseAnonKey) {
  // In development this will help surface misconfiguration quickly.
  // In production we assume env vars are set correctly.
  console.warn(
    "Supabase environment variables are not set and no fallback is available."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

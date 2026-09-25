import { createClient, SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

function env(name: string) {
  return process.env[name]?.trim() || "";
}

/** Server secret: new `sb_secret_…` or legacy JWT `service_role`. */
export function getSupabaseSecretKey() {
  return env("SUPABASE_SECRET_KEY") || env("SUPABASE_SERVICE_ROLE_KEY");
}

function looksLikeSecretKey(key: string) {
  return key.startsWith("sb_secret_") || key.startsWith("eyJ");
}

export function isSupabaseConfigured() {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const key = getSupabaseSecretKey();
  return Boolean(url && key && looksLikeSecretKey(key));
}

/** True on Vercel / other hosts where the local demo filesystem is not writable. */
export function isServerlessHost() {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

export function requireSupabaseInProduction() {
  if (!isSupabaseConfigured() && isServerlessHost()) {
    throw new Error(
      "Supabase is not configured. In Vercel → Environment Variables, set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SECRET_KEY (sb_secret_… from Project Settings → API Keys). Do not use the project ref as the secret.",
    );
  }
}

/** Server-only client that bypasses RLS (staff mutations + private uploads). */
export function getServiceSupabase() {
  const url = env("NEXT_PUBLIC_SUPABASE_URL") || env("SUPABASE_URL");
  const key = getSupabaseSecretKey();

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  if (!looksLikeSecretKey(key)) {
    throw new Error(
      "SUPABASE_SECRET_KEY looks invalid. Use the secret key from Supabase → Project Settings → API Keys (starts with sb_secret_… or the legacy JWT starting with eyJ…). Do not paste the project ref from the URL.",
    );
  }

  if (!adminClient) {
    adminClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return adminClient;
}

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

function env(name: string) {
  return process.env[name]?.trim() || "";
}

export function isSupabaseConfigured() {
  return Boolean(
    env("NEXT_PUBLIC_SUPABASE_URL") && env("SUPABASE_SERVICE_ROLE_KEY"),
  );
}

/** True on Vercel / other hosts where the local demo filesystem is not writable. */
export function isServerlessHost() {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

export function requireSupabaseInProduction() {
  if (!isSupabaseConfigured() && isServerlessHost()) {
    throw new Error(
      "Supabase is not configured on this deployment. In Vercel → Project Settings → Environment Variables, add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then redeploy.",
    );
  }
}

/** Server-only client that bypasses RLS (webhooks + staff mutations). */
export function getServiceSupabase() {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  if (!adminClient) {
    adminClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return adminClient;
}

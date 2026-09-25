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
  if (key.startsWith("sb_publishable_")) return false;
  return key.startsWith("sb_secret_") || key.startsWith("eyJ");
}

export function getSupabaseConfigStatus() {
  const url = env("NEXT_PUBLIC_SUPABASE_URL") || env("SUPABASE_URL");
  const publishable =
    env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ||
    env("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const secret = getSupabaseSecretKey();

  let secretStatus: "missing" | "invalid_publishable" | "invalid" | "ok" =
    "missing";
  if (secret) {
    if (secret.startsWith("sb_publishable_")) {
      secretStatus = "invalid_publishable";
    } else if (looksLikeSecretKey(secret)) {
      secretStatus = "ok";
    } else {
      secretStatus = "invalid";
    }
  }

  return {
    urlConfigured: Boolean(url),
    publishableConfigured: Boolean(publishable),
    secretStatus,
    configured: Boolean(url && secretStatus === "ok"),
    usingDemoFallback: !(url && secretStatus === "ok"),
  };
}

export function isSupabaseConfigured() {
  return getSupabaseConfigStatus().configured;
}

/** True when a Supabase URL is set — demo fallback must not silently swallow writes. */
export function isSupabaseExpected() {
  return Boolean(env("NEXT_PUBLIC_SUPABASE_URL") || env("SUPABASE_URL"));
}

/** True on Vercel / other hosts where the local demo filesystem is not durable. */
export function isServerlessHost() {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

export function supabaseMisconfigError() {
  const status = getSupabaseConfigStatus();
  if (status.secretStatus === "invalid_publishable") {
    return "SUPABASE_SECRET_KEY is set to the publishable key. Use the Secret key from Supabase → Project Settings → API Keys (starts with sb_secret_…), or the legacy service_role JWT (starts with eyJ…).";
  }
  if (status.secretStatus === "invalid") {
    return "SUPABASE_SECRET_KEY looks invalid. It must start with sb_secret_… or eyJ…. Do not use the project ref from the URL.";
  }
  if (!status.urlConfigured) {
    return "Missing NEXT_PUBLIC_SUPABASE_URL.";
  }
  return "Missing SUPABASE_SECRET_KEY. Add the Secret key (sb_secret_…) from Supabase → Project Settings → API Keys.";
}

export function requireSupabaseWhenExpected() {
  if (!isSupabaseExpected()) return;
  if (!isSupabaseConfigured()) {
    throw new Error(supabaseMisconfigError());
  }
}

export function requireSupabaseInProduction() {
  if (!isSupabaseConfigured() && (isServerlessHost() || isSupabaseExpected())) {
    throw new Error(supabaseMisconfigError());
  }
}

/** Server-only client that bypasses RLS (staff mutations + private uploads). */
export function getServiceSupabase() {
  requireSupabaseWhenExpected();

  const url = env("NEXT_PUBLIC_SUPABASE_URL") || env("SUPABASE_URL");
  const key = getSupabaseSecretKey();

  if (!url || !key || !looksLikeSecretKey(key)) {
    throw new Error(supabaseMisconfigError());
  }

  if (!adminClient) {
    adminClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return adminClient;
}

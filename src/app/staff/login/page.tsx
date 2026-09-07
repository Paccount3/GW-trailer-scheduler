"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/staff/manage";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Invalid password");
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="panel p-6 md:p-8 space-y-4">
      <div>
        <label className="block text-sm font-semibold mb-1.5" htmlFor="password">
          Staff password
        </label>
        <input
          id="password"
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          required
        />
      </div>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <button type="submit" className="btn btn-primary w-full" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-xs text-muted">
        Default local password is <code>goodwill</code> unless{" "}
        <code>STAFF_PASSWORD</code> is set.
      </p>
    </form>
  );
}

export default function StaffLoginPage() {
  return (
    <div className="max-w-md mx-auto py-10">
      <h1 className="text-3xl font-bold text-ink">Staff sign in</h1>
      <p className="text-muted mt-2 mb-6">
        Access Manage Donations, Trailer Reports, Reports, and Settings.
      </p>
      <Suspense fallback={<div className="panel p-8 text-muted">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

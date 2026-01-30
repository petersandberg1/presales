"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, ErrorText, Input, Label } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message ?? "Inloggningen misslyckades.");
        return;
      }

      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-md px-6 py-20">
        <div className="mb-6 flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-brand-500 shadow-[0_0_0_6px_rgba(47,107,255,0.18)]" />
          <div>
            <div className="text-lg font-semibold tracking-tight">Mining Pre-Sales</div>
            <div className="text-sm text-slate-400">Sign in to continue</div>
          </div>
        </div>

        <Card>
          <div className="p-6">
            <h1 className="text-xl font-semibold">Logga in</h1>
            <p className="mt-1 text-sm text-slate-400">
              Använd ditt konto för att komma åt kalkylatorn.
            </p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4" aria-label="login-form">
              <div className="space-y-1.5">
                <Label>User</Label>
                <Input
                  aria-label="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input
                  aria-label="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              {error && <ErrorText><span data-testid="login-error">{error}</span></ErrorText>}

              <Button aria-label="login-button" disabled={loading} className="w-full">
                {loading ? "Loggar in..." : "Logga in"}
              </Button>

              <div className="text-xs text-slate-500">
                Demo: user <span className="text-slate-300">demo</span> / password{" "}
                <span className="text-slate-300">demo123</span>
              </div>
            </form>
          </div>
        </Card>
      </div>
    </main>
  );
}
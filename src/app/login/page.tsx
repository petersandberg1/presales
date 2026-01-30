"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("demo");
  const [password, setPassword] = useState("demo123");
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
    <main style={{ maxWidth: 420, margin: "80px auto", padding: 16 }}>
      <h1>Logga in</h1>

      <form onSubmit={onSubmit} aria-label="login-form">
        <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
          <label>
            Användarnamn
            <input
              aria-label="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 4 }}
            />
          </label>

          <label>
            Lösenord
            <input
              aria-label="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 4 }}
            />
          </label>
          {error && (
            <p data-testid="login-error" style={{ color: "crimson", margin: 0 }}>
              {error}
            </p>
           )}   

          <button aria-label="login-button" disabled={loading} style={{ padding: 10 }}>
            {loading ? "Loggar in..." : "Logga in"}
          </button>
        </div>
      </form>
    </main>
  );
}
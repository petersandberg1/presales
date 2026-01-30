"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      aria-label="logout-button"
      onClick={logout}
      className="rounded-xl border border-white/10 bg-slate-900/50 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-900 transition"
    >
      Logga ut
    </button>
  );
}
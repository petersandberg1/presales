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
    <button aria-label="logout-button" onClick={logout} style={{ padding: 10 }}>
      Logga ut
    </button>
  );
}
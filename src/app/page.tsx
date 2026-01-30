import { getSessionUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import LogoutButton from "./logout-button";
import CalculatorClient from "./CalculatorClient";

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-slate-950">
      <header className="sticky top-0 border-b border-white/10 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-baseline gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-brand-500 shadow-[0_0_0_6px_rgba(47,107,255,0.18)]" />
            <div className="font-semibold tracking-tight">
              Mining Pre-Sales Kalkylator
            </div>
            <div className="text-sm text-slate-400">
              Välkommen, {user.displayName}
            </div>
          </div>
          <LogoutButton />
        </div>
      </header>

      <CalculatorClient />
    </main>
  );
}
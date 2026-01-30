import { getSessionUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import LogoutButton from "./logout-button";

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <main className="min-h-screen bg-slate-950">
      <header className="sticky top-0 border-b border-white/10 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-baseline gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-brand-500 shadow-[0_0_0_6px_rgba(47,107,255,0.18)]" />
            <div className="font-semibold tracking-tight">Start</div>
            <div className="text-sm text-slate-400">Välkommen, {user.displayName}</div>
          </div>
          <LogoutButton />
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl">
          <h2 className="text-lg font-semibold">Kalkylator</h2>
          <p className="mt-1 text-sm text-slate-400">
            Nästa steg: scenarion (spara/ladda) + första beräkningsflödet.
          </p>
        </div>
      </div>
    </main>
  );
}
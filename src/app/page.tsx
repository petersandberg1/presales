import { getSessionUser } from "@/lib/auth/session";
import LogoutButton from "./logout-button";

export default async function HomePage() {
  const user = await getSessionUser(); // 👈 await

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Start</h1>
        <LogoutButton />
      </div>

      <p>Välkommen{user ? `, ${user.displayName}` : ""}!</p>
    </main>
  );
}
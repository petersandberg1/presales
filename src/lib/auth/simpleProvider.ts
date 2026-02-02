import type { AuthProvider, AuthResult } from "./types";

const USERS: Array<{ id: string; username: string; password: string; displayName: string }> = [
  { id: "u1", username: "demo", password: "demo123", displayName: "Demo User" },
];

export class SimpleUserPassProvider implements AuthProvider {
  async authenticate(username: string, password: string): Promise<AuthResult> {
    const u = USERS.find((x) => x.username === username);
    if (!u || u.password !== password) {
      return { ok: false, message: "Invalid username or password." };
    }
    return { ok: true, user: { id: u.id, username: u.username, displayName: u.displayName } };
  }
}
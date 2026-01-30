import { cookies } from "next/headers";
import type { AuthUser } from "./types";

const COOKIE_NAME = "session";

export async function setSession(user: AuthUser) {
  const c = await cookies();
  c.set(COOKIE_NAME, JSON.stringify(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function clearSession() {
  const c = await cookies();
  c.set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function getSessionUser(): Promise<AuthUser | null> {
  const c = await cookies();
  const raw = c.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}
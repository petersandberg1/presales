import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthProvider } from "@/lib/auth";
import { setSession } from "@/lib/auth/session";

const BodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Ogiltig input." }, { status: 400 });
  }

  const { username, password } = parsed.data;
  const provider = getAuthProvider();
  const result = await provider.authenticate(username, password);

  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: 401 });
  }

  await setSession(result.user); // 👈 VIKTIGT
  return NextResponse.json({ ok: true });
}
import { NextResponse } from "next/server";
import { IMPERSONATION_COOKIE, SESSION_COOKIE } from "@/lib/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(IMPERSONATION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}

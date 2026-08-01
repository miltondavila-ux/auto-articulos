import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({
    email: user.email,
    role: user.role,
    maxTitlesPerBatch: user.maxTitlesPerBatch,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/current-user";
import { getAiSocialImagePrompt, setAiSocialImagePrompt } from "@/lib/ai-image-prompt";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const prompt = await getAiSocialImagePrompt();
  return NextResponse.json({ prompt: prompt ?? "" });
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { prompt } = await request.json();
  if (typeof prompt !== "string") {
    return NextResponse.json({ error: "prompt debe ser texto" }, { status: 400 });
  }

  await setAiSocialImagePrompt(prompt.trim());
  return NextResponse.json({ prompt: prompt.trim() });
}

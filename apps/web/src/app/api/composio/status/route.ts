import { NextResponse } from "next/server";
import { listUserConnections } from "@/lib/composio-connections";
import { NO_STORE, forbidden, getComposioStatusUser } from "../_access";

export const dynamic = "force-dynamic";

/** Estado de las 4 apps para la persona. No llama a Composio. */
export async function GET() {
  const user = await getComposioStatusUser();
  if (!user) return forbidden();
  return NextResponse.json({ connections: await listUserConnections(user) }, { headers: NO_STORE });
}

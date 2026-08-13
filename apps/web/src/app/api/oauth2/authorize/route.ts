import { NextRequest, NextResponse } from "next/server";
import { validateAuthorizeRequest, OAuthError } from "@/lib/oauth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Valida la solicitud de Alexa y la entrega a la pantalla de consentimiento. */
export async function GET(request: NextRequest) {
  try {
    validateAuthorizeRequest(request.nextUrl.searchParams, request.nextUrl.origin);
    const consentUrl = new URL("/oauth/autorizar", request.nextUrl.origin);
    consentUrl.search = request.nextUrl.search;
    return NextResponse.redirect(consentUrl);
  } catch (error) {
    const message = error instanceof OAuthError ? error.message : "Solicitud OAuth inválida.";
    return NextResponse.json({ error: "invalid_request", error_description: message }, { status: 400 });
  }
}

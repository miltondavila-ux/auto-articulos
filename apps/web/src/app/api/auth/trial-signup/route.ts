import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { encryptSecret } from "@auto-articulos/shared";
import {
  normalizeCountryCode,
  platformDomainForCountry,
} from "@/lib/countries";
import { createSessionToken, SESSION_COOKIE } from "@/lib/session";
import { TRIAL_DAYS } from "@/lib/trial";

// Registro público desde el botón "Solicitar prueba" en Login — pedido
// explícito del usuario, 13/8/2026. A diferencia de POST /api/admin/users
// (que crea usuarios normales, con acceso permanente), esta ruta es pública
// (sin requireAdmin) y crea la cuenta ya marcada como prueba: isTrialSignup
// true, trialStartedAt ahora, trialUnlocked false (el admin decide más
// adelante si la deja permanente). Auto-loguea a la persona al terminar,
// igual que hace /api/auth/login, para que entre directo al dashboard.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const { firstName, lastName, email, phone, password, country } =
    await request.json();

  const normalizedFirstName =
    typeof firstName === "string" ? firstName.trim() : "";
  const normalizedLastName =
    typeof lastName === "string" ? lastName.trim() : "";
  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  const normalizedPhone = typeof phone === "string" ? phone.trim() : "";

  if (!normalizedFirstName) {
    return NextResponse.json(
      { error: "El nombre es requerido." },
      { status: 400 },
    );
  }
  if (!normalizedLastName) {
    return NextResponse.json(
      { error: "El apellido es requerido." },
      { status: 400 },
    );
  }
  if (!normalizedEmail || !EMAIL_PATTERN.test(normalizedEmail)) {
    return NextResponse.json(
      { error: "El correo no tiene un formato válido." },
      { status: 400 },
    );
  }
  if (!normalizedPhone) {
    return NextResponse.json(
      { error: "El teléfono es requerido." },
      { status: 400 },
    );
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 8 caracteres." },
      { status: 400 },
    );
  }

  // El país se pide solo aquí y en el alta de Administración (cuentas nuevas);
  // de él se deduce el servidor de 10minutesWebsite, así que no se acepta un
  // valor libre ni vacío.
  const normalizedCountry = normalizeCountryCode(country);
  if (!normalizedCountry) {
    return NextResponse.json(
      { error: "Selecciona el país desde el que usarás la plataforma." },
      { status: 400 },
    );
  }
  // Europa -> 10minuteswebsite.site; resto del mundo -> 10minuteswebsite.net.
  const platformDomain = platformDomainForCountry(normalizedCountry);

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    return NextResponse.json(
      {
        error:
          "Ya existe una cuenta con ese correo. Si es tuya, inicia sesión normalmente.",
      },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const initialPasswordEncrypted = encryptSecret(password);
  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      name: `${normalizedFirstName} ${normalizedLastName}`,
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      phone: normalizedPhone,
      passwordHash,
      initialPasswordEncrypted,
      country: normalizedCountry,
      platformDomain,
      isTrialSignup: true,
      trialStartedAt: new Date(),
      trialUnlocked: false,
    },
  });

  const token = await createSessionToken(user.id);
  const response = NextResponse.json({ ok: true, trialDays: TRIAL_DAYS });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}

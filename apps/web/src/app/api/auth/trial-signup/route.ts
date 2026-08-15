import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { encryptSecret } from "@auto-articulos/shared";
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
  const { firstName, lastName, email, phone, password, region } =
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

  // Pedido de Milton (15/8/2026): "no hemos debido preguntar por país sino
  // por continente" — el país nunca importó por sí mismo, solo servía para
  // decidir el servidor (Europa -> .site, resto del mundo -> .net). Se
  // simplifica a la pregunta real en vez de un selector de ~50 países.
  // User.country queda sin usar por esta ruta a partir de ahora (sigue
  // existiendo en el esquema, nullable, sin romper cuentas viejas).
  if (region !== "europe" && region !== "other") {
    return NextResponse.json(
      { error: "Selecciona la región desde la que usarás la plataforma." },
      { status: 400 },
    );
  }
  const platformDomain = region === "europe" ? "site" : "net";

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

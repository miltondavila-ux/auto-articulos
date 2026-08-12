import { NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { requireAdmin } from "@/lib/current-user";
import { decryptSecret } from "@auto-articulos/shared";
import bcrypt from "bcryptjs";

/**
 * Endpoint temporal para diagnosticar problemas de login.
 * GET /api/admin/debug/passwords
 * Verifica que el hash de contraseña de cada usuario coincida con su
 * contraseña inicial guardada (initialPasswordEncrypted).
 */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      passwordHash: true,
      initialPasswordEncrypted: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const results = [];
  for (const user of users) {
    if (!user.initialPasswordEncrypted) {
      results.push({
        email: user.email,
        name: user.name,
        status: "sin_initial_password",
        coincide: null,
      });
      continue;
    }

    try {
      const plainPassword = decryptSecret(user.initialPasswordEncrypted);
      const matches = await bcrypt.compare(plainPassword, user.passwordHash);
      results.push({
        email: user.email,
        name: user.name,
        status: matches ? "ok" : "NO_COINCIDE",
        coincide: matches,
        passwordLength: plainPassword.length,
      });
    } catch (err) {
      results.push({
        email: user.email,
        name: user.name,
        status: "error_decrypt",
        error: err instanceof Error ? err.message : String(err),
        coincide: false,
      });
    }
  }

  const total = results.length;
  const ok = results.filter((r) => r.status === "ok").length;
  const noCoinciden = results.filter((r) => r.status === "NO_COINCIDE");
  const errores = results.filter((r) => r.status === "error_decrypt");
  const sinInitial = results.filter((r) => r.status === "sin_initial_password");

  return NextResponse.json({
    resumen: { total, ok, noCoinciden: noCoinciden.length, errores: errores.length, sinInitial: sinInitial.length },
    noCoinciden: noCoinciden.map((r) => ({ email: r.email, name: r.name, passwordLength: r.passwordLength })),
    errores: errores.map((r) => ({ email: r.email, error: r.error })),
    sinInitialPassword: sinInitial.map((r) => ({ email: r.email, name: r.name })),
  });
}

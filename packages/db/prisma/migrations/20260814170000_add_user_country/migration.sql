-- País declarado al crear la cuenta (ISO 3166-1 alpha-2). Nullable a
-- propósito: las cuentas que ya existen se quedan sin país y no cambian de
-- servidor. Europa -> platformDomain "site"; resto del mundo -> "net".
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "country" TEXT;

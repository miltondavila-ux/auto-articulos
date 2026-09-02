import Link from "next/link";
import {
  platformForgotPasswordUrl,
  normalizePlatformDomain,
} from "@auto-articulos/shared";

type Props = { searchParams: Promise<{ server?: string }> };

export default async function ResolucionConexionPage({ searchParams }: Props) {
  const params = await searchParams;
  const server = normalizePlatformDomain(params.server);
  const resetUrl = platformForgotPasswordUrl(server);

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "64px 24px", color: "#1d1d1f", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}>
      <p style={{ color: "#6e6e73", fontSize: 13, letterSpacing: 0.4 }}>AYUDA DE CONEXIÓN</p>
      <h1 style={{ fontSize: 36, lineHeight: 1.12, margin: "12px 0 18px" }}>No se pudo conectar con tu página web</h1>
      <p style={{ fontSize: 18, lineHeight: 1.55 }}>
        Tus credenciales de acceso pueden haber dejado de ser válidas. Sigue estos pasos para recuperar la conexión.
      </p>

      <section style={{ marginTop: 36, padding: 28, borderRadius: 18, background: "#f5f5f7" }}>
        <h2 style={{ fontSize: 21, marginTop: 0 }}>1. Restablece tu clave</h2>
        <p style={{ lineHeight: 1.55 }}>
          Puedes hacerlo por tu cuenta usando el enlace de recuperación de tu servidor o pedir al servicio de atención al cliente que haga el restablecimiento y te entregue la nueva clave.
        </p>
        <a href={resetUrl} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 8, padding: "12px 18px", borderRadius: 12, background: "#007aff", color: "white", textDecoration: "none", fontWeight: 600 }}>
          Restablecer mi clave
        </a>
      </section>

      <section style={{ marginTop: 18, padding: 28, borderRadius: 18, border: "1px solid #e5e5ea" }}>
        <h2 style={{ fontSize: 21, marginTop: 0 }}>2. Sincroniza la nueva clave</h2>
        <p style={{ lineHeight: 1.55 }}>
          Regresa a la configuración de tu cuenta, actualiza el usuario y la nueva clave, y guarda los cambios. Después podrás volver a publicar.
        </p>
        <Link href="/dashboard/configuracion/cuenta" style={{ color: "#007aff", fontWeight: 600 }}>Ir a Configuración de cuenta →</Link>
      </section>

      <p style={{ marginTop: 32, color: "#6e6e73", lineHeight: 1.55, fontSize: 14 }}>
        Si el problema continúa después de sincronizar las credenciales, contacta al servicio de atención al cliente de tu servidor. No compartas tu contraseña con nadie.
      </p>
    </main>
  );
}

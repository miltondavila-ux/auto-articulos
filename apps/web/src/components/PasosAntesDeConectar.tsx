import type { ReactNode } from "react";

/**
 * Pasos previos a una conexión OAuth.
 *
 * Orden de Milton (19/8/2026): el paso que más falla es el que nadie dice —
 * si no tienes la sesión de esa red abierta antes de pulsar, el botón te lleva
 * a una pantalla de acceso y la conexión se queda a medias. Va ARRIBA del
 * bloque, antes que cualquier botón, para que no haya forma de saltárselo.
 */
export default function PasosAntesDeConectar({
  red,
  extra,
}: {
  red: string;
  extra?: ReactNode;
}) {
  const isMeta = red.includes("Instagram") || red.includes("Facebook") || red.includes("Threads");
  const accountUrl = red.includes("LinkedIn")
    ? "https://www.linkedin.com/signup"
    : red.includes("X")
      ? "https://x.com/i/flow/signup"
      : red.includes("Pinterest")
        ? "https://www.pinterest.com/business/create/"
        : red.includes("Tumblr")
          ? "https://www.tumblr.com/register"
          : isMeta
            ? "https://www.facebook.com/r.php"
            : null;
  const recoveryUrl = red.includes("LinkedIn")
    ? "https://www.linkedin.com/uas/request-password-reset"
    : red.includes("X")
      ? "https://twitter.com/account/begin_password_reset"
      : red.includes("Pinterest")
        ? "https://www.pinterest.com/password/reset/"
        : red.includes("Tumblr")
          ? "https://www.tumblr.com/forgot_password"
          : isMeta
            ? "https://www.facebook.com/login/identify/"
            : null;
  return (
    <div
      style={{
        padding: 16,
        margin: "14px 0",
        fontSize: 13,
        border: "1px solid #d2d2d7",
        borderRadius: 14,
        background: "#ffffff",
      }}
    >
      <strong style={{ color: "#1d1d1f", fontSize: 14 }}>
        Antes de pulsar el botón, haz esto
      </strong>
      <ol
        style={{
          margin: "10px 0 0",
          paddingLeft: 20,
          color: "#1d1d1f",
          lineHeight: 1.6,
        }}
      >
        <li style={{ marginBottom: 8 }}>
          <strong>Primero que todo: abre {red} en otra pestaña</strong> de este
          mismo navegador, o en la app de tu teléfono si estás desde el móvil, y
          deja la sesión iniciada. Es el paso que más falla: sin sesión abierta,
          el botón te lleva a una pantalla de acceso y la conexión no se
          completa.
        </li>
        <li style={{ marginBottom: 8 }}>
          <strong>Si todavía no tienes cuenta, créala primero.</strong>{" "}
          {accountUrl ? <a href={accountUrl} target="_blank" rel="noreferrer">Pulsa aquí para abrir la página oficial de registro</a> : "Busca el botón Crear cuenta dentro de la red."}
          {recoveryUrl && <>. Si olvidaste la contraseña, <a href={recoveryUrl} target="_blank" rel="noreferrer">abre aquí la recuperación oficial</a>.</>}
        </li>
        <li style={{ marginBottom: 8 }}>
          <strong>Comprueba que es la cuenta correcta.</strong> Si manejas
          varias, cierra las demás o usa una ventana privada: se conectará la
          que esté abierta en ese momento.
        </li>
        {extra}
        <li>
          <strong>Vuelve aquí y pulsa el botón.</strong> Se abrirá {red} para
          que autorices. Acepta y te devolverá solo a esta página.
        </li>
      </ol>
    </div>
  );
}

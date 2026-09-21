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
        Proceso estándar de conexión
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
          <strong>Prepara la cuenta.</strong> Abre {red} en una pestaña nueva del mismo navegador y deja iniciada la sesión. Mantén abierta esta pestaña del sistema.
        </li>
        <li style={{ marginBottom: 8 }}>
          <strong>Comprueba el acceso.</strong> Si todavía no tienes cuenta, créala primero. {" "}
          {accountUrl ? <a href={accountUrl} target="_blank" rel="noreferrer">Pulsa aquí para abrir la página oficial de registro</a> : "Busca el botón Crear cuenta dentro de la red."}
          {recoveryUrl && <>. Si olvidaste la contraseña, <a href={recoveryUrl} target="_blank" rel="noreferrer">abre aquí la recuperación oficial</a>.</>}
        </li>
        <li style={{ marginBottom: 8 }}>
          <strong>Confirma la identidad.</strong> Comprueba que es la cuenta correcta; si manejas varias, no cambies de usuario durante el proceso.
        </li>
        {extra}
        <li>
          <strong>Autoriza y confirma.</strong> Vuelve a esta pestaña, pulsa el botón, acepta los permisos de {red} y regresa para comprobar el resultado.
        </li>
      </ol>
    </div>
  );
}

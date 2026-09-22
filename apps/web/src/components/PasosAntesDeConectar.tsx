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
  const contenido = (
    <>
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
    </>
  );

  return (
    <>
      <div className="connection-steps-desktop" style={{ padding: "10px 0", margin: "12px 0", fontSize: 13, borderTop: "1px solid #e5e5ea", background: "transparent" }}>
        {contenido}
      </div>
      <details className="connection-steps-mobile">
        <summary>Ver proceso de conexión</summary>
        <div style={{ marginTop: 12 }}>{contenido}</div>
      </details>
      <style>{`
        .connection-steps-mobile { display: none; }
        @media (max-width: 700px) {
          .connection-steps-desktop { display: none; }
          .connection-steps-mobile { display: block; padding: 12px 14px; margin: 12px 0; border: 1px solid #e5e5ea; border-radius: 12px; background: #fff; font-size: 13px; }
          .connection-steps-mobile summary { cursor: pointer; list-style: none; color: #1d1d1f; font-size: 12px; font-weight: 600; }
          .connection-steps-mobile summary::-webkit-details-marker { display: none; }
          .connection-steps-mobile summary::after { content: "＋"; float: right; font-size: 16px; }
          .connection-steps-mobile[open] summary::after { content: "−"; }
        }
      `}</style>
    </>
  );
}

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
  return (
    <div
      className="row"
      style={{ padding: 16, margin: "14px 0", fontSize: 13, display: "block" }}
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
          <strong>Abre {red} y deja la sesión iniciada</strong>, en otra pestaña
          de este mismo navegador — o en tu teléfono, si estás haciéndolo desde
          el móvil. Es el paso que más falla: si no has iniciado sesión, el
          botón te llevará a una pantalla de acceso y la conexión no se
          completará.
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

import type { ReactNode } from "react";
import { sectionStyle } from "./dashboard-ui";

/**
 * Explicación de qué sucede en un módulo, al principio de su pantalla.
 *
 * Orden de Milton (18/8/2026): cada módulo debe explicar qué pasa allí. Mucha
 * gente llegaba a una pantalla sin saber a qué venía ni qué iba a conseguir.
 * El texto va primero, antes de cualquier control.
 */
export default function ModuleIntro({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <section style={{ ...sectionStyle, marginTop: 0, padding: "clamp(18px, 3vw, 28px)" }}>
      <p
        style={{
          margin: 0,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#86868b",
        }}
      >
        Antes de avanzar, lee esto
      </p>
      <h1
        style={{
          margin: "8px 0 0",
          fontSize: "clamp(22px, 3vw, 28px)",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: "#1d1d1f",
        }}
      >
        {titulo}
      </h1>
      <div style={{ marginTop: 10 }}>{children}</div>
    </section>
  );
}

/** Párrafo del texto explicativo, para no repetir estilos en cada módulo. */
export function IntroP({ children }: { children: ReactNode }) {
  return (
    <p style={{ margin: "10px 0 0", fontSize: 16, lineHeight: 1.55, color: "#1d1d1f" }}>
      {children}
    </p>
  );
}

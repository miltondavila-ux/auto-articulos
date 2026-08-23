"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Botón de arranque en la cabecera de "Cómo funciona". Pedido explícito de
 * Milton (23/8/2026): quien ya dejó todo configurado no debería tener que
 * leer las tres secciones para saber que puede ir directo a Oportunidades;
 * quien todavía no, debería verlo de inmediato en vez de descubrirlo más
 * abajo.
 *
 * Reutiliza exactamente el mismo criterio de "listo" que ya usa
 * dashboard/page.tsx (checkWizardStatus) para decidir si mostrar el asistente
 * o el panel de rendimiento: credenciales, categorías, idioma y Google
 * Search Console conectado. No se inventa un criterio nuevo — si cambiara
 * acá y no allá, un usuario podría ver "Comienza aquí" en esta pantalla y
 * el asistente de configuración en Inicio al mismo tiempo.
 */
export default function ComoFuncionaCTA() {
  const [listo, setListo] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const [credRes, catRes, meRes, googleRes] = await Promise.all([
          fetch("/api/credentials", { cache: "no-store" }),
          fetch("/api/categories", { cache: "no-store" }),
          fetch("/api/me", { cache: "no-store" }),
          fetch("/api/search-integrations/google", { cache: "no-store" }),
        ]);
        const credData = credRes.ok ? await credRes.json() : {};
        const catData = catRes.ok ? await catRes.json() : {};
        const meData = meRes.ok ? await meRes.json() : {};
        const googleData = googleRes.ok ? await googleRes.json() : {};

        const step1 = Boolean(credData.configured);
        const step2 =
          Array.isArray(catData.categories) && catData.categories.length > 0;
        const step3 =
          typeof meData.contentLanguage === "string" &&
          meData.contentLanguage.trim().length > 0;
        const step4 = Boolean(googleData.connected && googleData.siteUrl);

        if (!cancelled) setListo(step1 && step2 && step3 && step4);
      } catch {
        if (!cancelled) setListo(false);
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  // Mientras se sabe, no se muestra nada: mejor un instante en blanco que un
  // botón equivocado que cambia de texto o de destino frente a la persona.
  if (listo === null) return null;

  // Grafito (#1d1d1f), no azul: el proyecto reserva el azul para enlaces de
  // texto (ver ENLACE en esta misma página, y el comentario de pillPrimary
  // en dashboard/oportunidades/page.tsx) y usa grafito para botones de
  // acción rellenos — es el mismo lenguaje visual de Apple.com/Apple
  // Support, donde el color no carga la jerarquía, la tipografía sí. Por lo
  // mismo, sin mayúsculas: Apple casi nunca usa texto en versalitas en
  // botones, así que el texto queda en frase normal, tal como se pidió
  // ("Comienza aquí" / "Configura aquí").
  return (
    <Link
      href={listo ? "/dashboard/oportunidades" : "/dashboard/configuracion"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "11px 20px",
        borderRadius: 980,
        fontSize: 15,
        fontWeight: 500,
        textDecoration: "none",
        color: "#ffffff",
        background: "#1d1d1f",
      }}
    >
      {listo ? "Comienza aquí" : "Configura aquí"}
      <span aria-hidden="true">›</span>
    </Link>
  );
}

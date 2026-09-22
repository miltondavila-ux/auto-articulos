import MobileInstructions from "@/components/MobileInstructions";

export default function BrowserTabsConnectionNotice() {
  return (
    <section
      style={{
        padding: "12px 0",
        borderBottom: "1px solid #e5e5ea",
        background: "transparent",
        color: "#1d1d1f",
        fontSize: 13,
        lineHeight: 1.55,
      }}
      aria-label="Instrucciones para conectar redes sociales"
    >
      <MobileInstructions>
        <strong style={{ fontSize: 14 }}>Proceso estándar de conexión</strong>
        <ol style={{ margin: "10px 0 0", paddingLeft: 20 }}>
        <li>
          <strong>Prepara la cuenta:</strong> abre la aplicación en otra pestaña del mismo navegador e inicia sesión.
        </li>
        <li>
          <strong>Confirma la identidad:</strong> verifica que es la cuenta, página o propiedad correcta.
        </li>
        <li>
          <strong>Autoriza y prueba:</strong> vuelve a SEO TOTAL, acepta los permisos, elige el recurso y pulsa Probar conexión.
        </li>
        </ol>
      </MobileInstructions>
    </section>
  );
}

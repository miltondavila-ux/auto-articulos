export default function BrowserTabsConnectionNotice() {
  return (
    <section
      style={{
        padding: 16,
        border: "1px solid #d2d2d7",
        borderRadius: 14,
        background: "#f5f5f7",
        color: "#1d1d1f",
        fontSize: 13,
        lineHeight: 1.55,
      }}
      aria-label="Instrucciones para conectar redes sociales"
    >
      <strong style={{ fontSize: 14 }}>
        Proceso estándar de conexión
      </strong>
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
    </section>
  );
}

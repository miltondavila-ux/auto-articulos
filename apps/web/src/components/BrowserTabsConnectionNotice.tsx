export default function BrowserTabsConnectionNotice() {
  return (
    <section
      style={{
        padding: 16,
        border: "1px solid #d2d2d7",
        borderRadius: 14,
        background: "#fffaf0",
        color: "#1d1d1f",
        fontSize: 13,
        lineHeight: 1.55,
      }}
      aria-label="Instrucciones para conectar redes sociales"
    >
      <strong style={{ fontSize: 14 }}>
        Antes de configurar cualquier red social
      </strong>
      <ol style={{ margin: "10px 0 0", paddingLeft: 20 }}>
        <li>
          Cierra todas las pestañas del navegador excepto la pestaña donde está
          abierto Auto Artículos.
        </li>
        <li>
          Abre la red social que vas a configurar en una pestaña nueva del mismo
          navegador e inicia sesión en la cuenta correcta.
        </li>
        <li>
          Regresa a la pestaña de Auto Artículos y completa la conexión. Si se
          abre otra pestaña para autorizar, no cierres la pestaña del sistema y
          vuelve a ella al terminar.
        </li>
      </ol>
    </section>
  );
}

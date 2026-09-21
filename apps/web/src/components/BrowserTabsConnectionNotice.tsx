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
        Antes de configurar cualquier red social
      </strong>
      <ol style={{ margin: "10px 0 0", paddingLeft: 20 }}>
        <li>
          Abre la red social que vas a configurar en una pestaña nueva del mismo
          navegador e inicia sesión en la cuenta correcta. Así puedes comprobar
          visualmente que no estás usando otra cuenta.
        </li>
        <li>
          Regresa a la pestaña de SEO TOTAL y completa la conexión. Si se
          abre otra pestaña para autorizar, no cierres la pestaña del sistema y
          vuelve a ella al terminar.
        </li>
        <li>
          No cambies de usuario durante el proceso. Si la cuenta mostrada no es
          la correcta, cancela y avisa antes de autorizar.
        </li>
      </ol>
    </section>
  );
}

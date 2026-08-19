import LogoutButton from "@/components/LogoutButton";

export default function MaintenanceScreen() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#f5f5f7",
        color: "#1d1d1f",
      }}
    >
      <section
        style={{
          width: "min(100%, 560px)",
          padding: "42px 32px",
          borderRadius: 22,
          background: "#fff",
          border: "1px solid #e5e5ea",
          textAlign: "center",
          boxShadow: "none",
        }}
      >
        <p style={{ margin: "0 0 10px", color: "#1d1d1f", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", fontSize: 12 }}>
          Auto Artículos
        </p>
        <h1 style={{ margin: "0 0 12px", fontSize: 28 }}>Estamos en mantenimiento</h1>
        <p style={{ margin: "0 auto 24px", color: "#6e6e73", lineHeight: 1.55 }}>
          Estamos realizando ajustes para mejorar el sistema. El acceso para usuarios estará disponible nuevamente cuando finalice el mantenimiento.
        </p>
        <LogoutButton />
      </section>
    </main>
  );
}

import { TRIAL_WHATSAPP_LINK } from "@/lib/trial";

// Pantalla de bloqueo al vencer el período de prueba gratuita (13/8/2026).
// Reemplaza TODO el contenido del dashboard (ver dashboard/layout.tsx) — la
// persona no puede usar ningún módulo hasta que el admin la desbloquee
// manualmente (o hable con Milton y se una al programa real).
export default function TrialBlockedScreen() {
  const qrUrl = `https://quickchart.io/chart?cht=qr&chl=${encodeURIComponent(TRIAL_WHATSAPP_LINK)}&chs=220x220`;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 18,
        background: "#0d214a",
        border: "1px solid rgba(77, 216, 232, 0.25)",
        borderRadius: 16,
        padding: "48px 24px",
        marginTop: 24,
      }}
    >
      <h2 style={{ margin: 0, fontSize: 22, color: "#f2f5fb" }}>
        Tu período de prueba terminó
      </h2>
      <p
        style={{
          margin: 0,
          maxWidth: 480,
          fontSize: 14,
          lineHeight: 1.6,
          color: "#a8b3c7",
        }}
      >
        Esta plataforma está disponible únicamente para las personas
        inscritas en el <strong>Programa de Posicionamiento de Milton
        Dávila</strong>. Para seguir usándola, es necesario formar parte de
        este grupo.
      </p>
      <a
        href={TRIAL_WHATSAPP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          background: "linear-gradient(135deg, #2f5fdb 0%, #1b3f9e 100%)",
          color: "#fff",
          fontWeight: 700,
          fontSize: 14,
          padding: "12px 28px",
          borderRadius: 10,
          textDecoration: "none",
          boxShadow: "0 8px 20px rgba(47, 95, 219, 0.35)",
        }}
      >
        Conversar con Milton
      </a>
      <img
        src={qrUrl}
        alt="Código QR para conversar con Milton por WhatsApp"
        width={160}
        height={160}
        style={{ borderRadius: 8, background: "#fff", padding: 8 }}
      />
      <p style={{ margin: 0, fontSize: 12, color: "#6b7a94" }}>
        Escanea el código o toca el botón para escribirle directamente.
      </p>
    </div>
  );
}

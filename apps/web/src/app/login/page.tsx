"use client";

import { Suspense, useState, type CSSProperties, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Registro de prueba gratuita (pedido explícito del usuario, 13/8/2026):
  // botón "SOLICITAR PRUEBA" que despliega un formulario corto, crea una
  // cuenta con 7 días de acceso y loguea directo — ver
  // /api/auth/trial-signup. `?trial=1` en el dashboard dispara el banner
  // grande de bienvenida una sola vez.
  const [mode, setMode] = useState<"login" | "trial">("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [trialEmail, setTrialEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [trialPassword, setTrialPassword] = useState("");
  const [trialError, setTrialError] = useState<string | null>(null);
  const [trialLoading, setTrialLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Error al iniciar sesión");
        return;
      }
      const returnTo = searchParams.get("returnTo");
      router.push(returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleTrialSubmit(e: FormEvent) {
    e.preventDefault();
    setTrialError(null);
    setTrialLoading(true);
    try {
      const res = await fetch("/api/auth/trial-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email: trialEmail,
          phone,
          password: trialPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTrialError(data.error ?? "No se pudo crear la cuenta de prueba.");
        return;
      }
      router.push("/dashboard?trial=1");
      router.refresh();
    } finally {
      setTrialLoading(false);
    }
  }

  return (
    <main
      style={{
        position: "relative",
        minHeight: "100vh",
        background: "#031537",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Una sola imagen de fondo a pantalla completa, sin división entre
          zonas: se desvanece hacia el azul sólido con un único degradado. */}
      <img
        src="/login-hero.jpg"
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "20% 15%",
          opacity: 0.55,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 25% 30%, rgba(3,21,55,0.15) 0%, rgba(3,21,55,0.55) 45%, rgba(3,21,55,0.97) 78%), linear-gradient(to bottom, rgba(3,21,55,0.5) 0%, rgba(3,21,55,0.2) 20%, rgba(3,21,55,0.85) 100%)",
        }}
      />

      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 1080,
          padding: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 40,
          flexWrap: "wrap",
        }}
      >
        <div style={{ maxWidth: 420, minWidth: 260 }}>
          <p
            style={{
              fontSize: 13,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#4dd8e8",
              fontWeight: 700,
              margin: 0,
            }}
          >
            Automatización con IA
          </p>
          <h2
            style={{
              fontSize: 32,
              lineHeight: 1.2,
              color: "#f2f5fb",
              margin: "10px 0 0",
              fontWeight: 700,
            }}
          >
            Creador de artículos en secuencia
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "#a8b3c7",
              marginTop: 12,
              lineHeight: 1.5,
            }}
          >
            Herramienta exclusiva para el programa de posicionamiento de
            10minutesWebsite.
          </p>
        </div>

        {mode === "login" ? (
          <form
            onSubmit={handleSubmit}
            style={{
              background: "rgba(13, 33, 74, 0.45)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(77, 216, 232, 0.2)",
              padding: 36,
              borderRadius: 16,
              width: 340,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <h1
              style={{
                fontSize: 22,
                margin: 0,
                marginBottom: 4,
                color: "#f2f5fb",
                fontWeight: 700,
              }}
            >
              Auto Artículos
            </h1>
            <p style={{ fontSize: 13, color: "#a8b3c7", margin: "0 0 8px" }}>
              Ingresa con tu usuario para continuar.
            </p>
            <input
              type="email"
              placeholder="Correo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
            />
            {error && (
              <p style={{ color: "#ff8a8a", margin: 0, fontSize: 13 }}>
                {error}
              </p>
            )}
            <button type="submit" disabled={loading} style={buttonStyle}>
              {loading ? "Entrando..." : "Entrar"}
            </button>
            <button
              type="button"
              onClick={() => setMode("trial")}
              style={trialButtonStyle}
            >
              SOLICITAR PRUEBA
            </button>
          </form>
        ) : (
          <form
            onSubmit={handleTrialSubmit}
            style={{
              background: "rgba(13, 33, 74, 0.45)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(77, 216, 232, 0.2)",
              padding: 36,
              borderRadius: 16,
              width: 340,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <h1
              style={{
                fontSize: 20,
                margin: 0,
                color: "#f2f5fb",
                fontWeight: 700,
              }}
            >
              Solicitar prueba gratuita
            </h1>
            <p style={{ fontSize: 13, color: "#a8b3c7", margin: "0 0 4px" }}>
              7 días de acceso completo. Deja tus datos para empezar.
            </p>
            <input
              type="text"
              placeholder="Nombre"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="Apellido"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              style={inputStyle}
            />
            <input
              type="email"
              placeholder="Correo"
              value={trialEmail}
              onChange={(e) => setTrialEmail(e.target.value)}
              required
              style={inputStyle}
            />
            <input
              type="tel"
              placeholder="Teléfono (con código de país)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Crea una contraseña"
              value={trialPassword}
              onChange={(e) => setTrialPassword(e.target.value)}
              required
              minLength={8}
              style={inputStyle}
            />
            {trialError && (
              <p style={{ color: "#ff8a8a", margin: 0, fontSize: 13 }}>
                {trialError}
              </p>
            )}
            <button type="submit" disabled={trialLoading} style={buttonStyle}>
              {trialLoading ? "Creando cuenta..." : "Empezar prueba de 7 días"}
            </button>
            <button
              type="button"
              onClick={() => setMode("login")}
              style={trialButtonStyle}
            >
              ← Volver a iniciar sesión
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

const inputStyle: CSSProperties = {
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid rgba(232, 236, 245, 0.18)",
  background: "rgba(3, 21, 55, 0.5)",
  color: "#f2f5fb",
  fontSize: 14,
  outline: "none",
};

const buttonStyle: CSSProperties = {
  marginTop: 6,
  padding: "12px 14px",
  borderRadius: 10,
  border: "none",
  background: "linear-gradient(135deg, #2f5fdb 0%, #1b3f9e 100%)",
  color: "white",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
  boxShadow: "0 8px 20px rgba(47, 95, 219, 0.35)",
};

const trialButtonStyle: CSSProperties = {
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid rgba(77, 216, 232, 0.4)",
  background: "transparent",
  color: "#4dd8e8",
  fontWeight: 700,
  fontSize: 13,
  letterSpacing: 0.5,
  cursor: "pointer",
};

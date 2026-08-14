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
        background: "var(--apple-bg, #070d1a)",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}
    >
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
          opacity: 0.35,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 30% 30%, rgba(7, 13, 26, 0.2) 0%, rgba(7, 13, 26, 0.7) 50%, rgba(7, 13, 26, 0.98) 100%), linear-gradient(to bottom, rgba(7, 13, 26, 0.5) 0%, rgba(7, 13, 26, 0.85) 100%)",
        }}
      />

      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 1040,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 40,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 300px", maxWidth: 440 }}>
          <span
            style={{
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--apple-cyan, #00c7be)",
              fontWeight: 700,
              display: "inline-block",
              background: "rgba(0, 199, 190, 0.12)",
              padding: "4px 10px",
              borderRadius: 9999,
              border: "1px solid rgba(0, 199, 190, 0.25)",
            }}
          >
            Automatización con IA
          </span>
          <h2
            style={{
              fontSize: 34,
              lineHeight: 1.15,
              color: "#f5f5f7",
              margin: "14px 0 0",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Creador de artículos en secuencia
          </h2>
          <p
            style={{
              fontSize: 15,
              color: "#98a2b3",
              marginTop: 14,
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
              flex: "1 1 320px",
              maxWidth: 380,
              background: "rgba(13, 26, 51, 0.7)",
              backdropFilter: "blur(24px) saturate(180%)",
              WebkitBackdropFilter: "blur(24px) saturate(180%)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              padding: 32,
              borderRadius: 20,
              display: "flex",
              flexDirection: "column",
              gap: 14,
              boxShadow: "0 24px 48px rgba(0, 0, 0, 0.4)",
              boxSizing: "border-box",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  background: "linear-gradient(135deg, #0071e3 0%, #004b99 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                A
              </div>
              <h1
                style={{
                  fontSize: 20,
                  margin: 0,
                  color: "#f5f5f7",
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                }}
              >
                Auto Artículos
              </h1>
            </div>
            <p style={{ fontSize: 13, color: "#98a2b3", margin: "0 0 6px" }}>
              Ingresa con tu usuario para continuar.
            </p>
            <input
              type="email"
              placeholder="Correo electrónico"
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
              <p
                style={{
                  color: "#ff453a",
                  background: "rgba(255, 69, 58, 0.12)",
                  border: "1px solid rgba(255, 69, 58, 0.25)",
                  padding: "8px 12px",
                  borderRadius: 8,
                  margin: 0,
                  fontSize: 13,
                }}
              >
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
              Solicitar prueba gratuita
            </button>
          </form>
        ) : (
          <form
            onSubmit={handleTrialSubmit}
            style={{
              flex: "1 1 320px",
              maxWidth: 380,
              background: "rgba(13, 26, 51, 0.7)",
              backdropFilter: "blur(24px) saturate(180%)",
              WebkitBackdropFilter: "blur(24px) saturate(180%)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              padding: 32,
              borderRadius: 20,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              boxShadow: "0 24px 48px rgba(0, 0, 0, 0.4)",
              boxSizing: "border-box",
            }}
          >
            <h1
              style={{
                fontSize: 20,
                margin: 0,
                color: "#f5f5f7",
                fontWeight: 700,
                letterSpacing: "-0.01em",
              }}
            >
              Solicitar prueba gratuita
            </h1>
            <p style={{ fontSize: 13, color: "#98a2b3", margin: "0 0 4px" }}>
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
              placeholder="Correo electrónico"
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
              <p
                style={{
                  color: "#ff453a",
                  background: "rgba(255, 69, 58, 0.12)",
                  border: "1px solid rgba(255, 69, 58, 0.25)",
                  padding: "8px 12px",
                  borderRadius: 8,
                  margin: 0,
                  fontSize: 13,
                }}
              >
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
  border: "1px solid rgba(255, 255, 255, 0.14)",
  background: "rgba(5, 12, 28, 0.65)",
  color: "#f5f5f7",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  width: "100%",
  transition: "all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)",
};

const buttonStyle: CSSProperties = {
  marginTop: 6,
  padding: "12px 16px",
  borderRadius: 10,
  border: "none",
  background: "#0071e3",
  color: "#ffffff",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
  boxShadow: "0 4px 14px rgba(0, 113, 227, 0.35)",
  transition: "all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)",
  minHeight: 44,
};

const trialButtonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid rgba(255, 255, 255, 0.16)",
  background: "rgba(255, 255, 255, 0.06)",
  color: "#f5f5f7",
  fontWeight: 500,
  fontSize: 13,
  cursor: "pointer",
  transition: "all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)",
  minHeight: 40,
};

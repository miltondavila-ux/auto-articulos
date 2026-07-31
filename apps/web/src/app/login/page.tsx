"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#031537",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <style>{`
        @keyframes login-glow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.08); }
        }
        @media (max-width: 860px) {
          .login-hero-panel { display: none; }
          .login-form-panel { flex-basis: 100% !important; }
        }
      `}</style>

      {/* Halo de luz cian detrás de todo, para dar el efecto "espectacular" */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "28%",
          width: 520,
          height: 520,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(77,216,232,0.35) 0%, rgba(77,216,232,0) 70%)",
          filter: "blur(10px)",
          animation: "login-glow 6s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />

      <div
        className="login-hero-panel"
        style={{
          flex: "1 1 50%",
          position: "relative",
          display: "flex",
          alignItems: "flex-end",
          minHeight: "100vh",
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
            objectPosition: "center 15%",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to right, rgba(3,21,55,0) 55%, rgba(3,21,55,0.95) 100%), linear-gradient(to top, rgba(3,21,55,0.85) 0%, rgba(3,21,55,0.1) 45%)",
          }}
        />
        <div
          style={{
            position: "relative",
            padding: "0 0 48px 48px",
            maxWidth: 420,
          }}
        >
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
              fontSize: 30,
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
      </div>

      <div
        className="login-form-panel"
        style={{
          flex: "1 1 50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          padding: 20,
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{
            position: "relative",
            background: "rgba(13, 33, 74, 0.55)",
            backdropFilter: "blur(14px)",
            border: "1px solid rgba(77, 216, 232, 0.25)",
            boxShadow:
              "0 20px 60px rgba(0, 0, 0, 0.45), 0 0 40px rgba(77, 216, 232, 0.08)",
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
            <p style={{ color: "#ff8a8a", margin: 0, fontSize: 13 }}>{error}</p>
          )}
          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
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

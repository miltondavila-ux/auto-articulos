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

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
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#ffffff",
          border: "1px solid #e5e8ec",
          boxShadow: "0 1px 3px rgba(16, 24, 40, 0.06)",
          padding: 32,
          borderRadius: 12,
          width: 320,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <h1 style={{ fontSize: 20, margin: 0, marginBottom: 8 }}>
          Auto Artículos
        </h1>
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
          <p style={{ color: "#d64545", margin: 0, fontSize: 14 }}>{error}</p>
        )}
        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}

const inputStyle: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #dfe3e8",
  background: "#f7f8fa",
  color: "#16181d",
  fontSize: 14,
};

const buttonStyle: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "none",
  background: "#2f5fdb",
  color: "white",
  fontWeight: 600,
  cursor: "pointer",
};

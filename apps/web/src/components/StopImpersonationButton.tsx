"use client";

export default function StopImpersonationButton() {
  async function handleStop() {
    await fetch("/api/admin/impersonate", { method: "DELETE" });
    window.location.href = "/dashboard/usuarios";
  }

  return (
    <button
      onClick={handleStop}
      style={{
        padding: "6px 12px",
        borderRadius: 8,
        border: "1px solid rgba(255, 159, 10, 0.35)",
        background: "rgba(255, 159, 10, 0.15)",
        color: "#ff9f0a",
        fontWeight: 600,
        fontSize: 12,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)",
      }}
    >
      Volver a mi cuenta
    </button>
  );
}

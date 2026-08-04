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
        border: "1px solid #f0deac",
        background: "#fff8e6",
        color: "#8a6d1a",
        fontWeight: 600,
        fontSize: 12,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      Volver a mi cuenta
    </button>
  );
}

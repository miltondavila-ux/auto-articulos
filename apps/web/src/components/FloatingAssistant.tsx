"use client";
import { useState } from "react";

export default function FloatingAssistant() {
  const [open, setOpen] = useState(false); const [message, setMessage] = useState(""); const [answer, setAnswer] = useState(""); const [loading, setLoading] = useState(false);
  async function ask() { if (!message.trim() || loading) return; setLoading(true); setAnswer(""); try { const r = await fetch("/api/assistant/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) }); const d = await r.json() as { answer?: string; error?: string }; setAnswer(d.answer ?? d.error ?? "No pude responder ahora."); } catch { setAnswer("No pude responder ahora."); } finally { setLoading(false); } }
  return <div style={{ position: "fixed", right: 20, bottom: 20, zIndex: 50 }}>
    {open && <div style={{ width: 330, padding: 14, marginBottom: 10, borderRadius: 12, background: "#fff", boxShadow: "0 8px 30px #0003" }}><strong>Ayuda de Auto Artículos</strong><p style={{ fontSize: 13 }}>Pregúntame cómo usar una función.</p>{answer && <p style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{answer}</p>}<textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="¿Cómo publico un artículo?" rows={3} style={{ width: "100%" }} /><button onClick={ask} disabled={loading} style={{ marginTop: 8 }}>{loading ? "Consultando…" : "Preguntar"}</button></div>}
    <button onClick={() => setOpen(!open)} style={{ borderRadius: 99, padding: "13px 16px", border: 0, background: "#2f5fdb", color: "white", fontWeight: 700 }}>{open ? "Cerrar ayuda" : "¿Necesitas ayuda?"}</button>
  </div>;
}

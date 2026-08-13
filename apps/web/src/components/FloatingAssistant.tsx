"use client";

import { FormEvent, KeyboardEvent, useState } from "react";

const quickQuestions = [
  "¿Cómo publico un artículo?",
  "¿Cómo conecto Google?",
  "¿Dónde veo oportunidades SEO?",
];

export default function FloatingAssistant() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  async function ask(question = message) {
    const cleanQuestion = question.trim();
    if (!cleanQuestion || loading) return;

    setMessage(cleanQuestion);
    setLoading(true);
    setAnswer("");

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: cleanQuestion }),
      });
      const data = (await response.json()) as { answer?: string; error?: string };
      setAnswer(data.answer ?? data.error ?? "No pude responder ahora. Inténtalo de nuevo en un momento.");
    } catch {
      setAnswer("No pude responder ahora. Inténtalo de nuevo en un momento.");
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void ask();
    }
  }

  return (
    <div className="floating-assistant" aria-live="polite">
      {open && (
        <section id="floating-help-panel" className="assistant-panel" aria-label="Asistente de ayuda">
          <header className="assistant-header">
            <div className="assistant-avatar" aria-hidden="true">✦</div>
            <div className="assistant-heading">
              <span className="assistant-eyebrow">ASISTENTE DE AYUDA</span>
              <h2>¿Cómo puedo ayudarte?</h2>
              <p>Guía rápida de Auto Artículos</p>
            </div>
            <button
              className="assistant-close"
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar asistente de ayuda"
            >
              ×
            </button>
          </header>

          <div className="assistant-content">
            <div className="assistant-welcome">
              <strong>Hola, estoy aquí para orientarte.</strong>
              <span>Pregúntame sobre artículos, SEO, conexiones y configuración.</span>
            </div>

            {!answer && !loading && (
              <div className="assistant-suggestions" aria-label="Preguntas frecuentes">
                {quickQuestions.map((question) => (
                  <button key={question} type="button" onClick={() => void ask(question)}>
                    {question}
                    <span aria-hidden="true">↗</span>
                  </button>
                ))}
              </div>
            )}

            {(answer || loading) && (
              <div className="assistant-answer">
                {loading ? (
                  <span className="assistant-typing">Buscando una respuesta<span>•••</span></span>
                ) : (
                  answer
                )}
              </div>
            )}
          </div>

          <form className="assistant-form" onSubmit={submit}>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu pregunta aquí…"
              rows={2}
              aria-label="Pregunta para el asistente"
            />
            <button type="submit" disabled={!message.trim() || loading} aria-label="Enviar pregunta">
              <span aria-hidden="true">↑</span>
            </button>
          </form>
          <p className="assistant-hint">Pulsa Enter para enviar · Mayús + Enter para una nueva línea</p>
        </section>
      )}

      <button
        className="assistant-launcher"
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="floating-help-panel"
      >
        <span className="assistant-launcher-icon" aria-hidden="true">✦</span>
        <span className="assistant-launcher-copy">
          <small>AYUDA IA</small>
          <strong>{open ? "Cerrar ayuda" : "¿Necesitas ayuda?"}</strong>
        </span>
      </button>

      <style jsx>{`
        .floating-assistant { position: fixed; right: 24px; bottom: 24px; z-index: 50; font-family: inherit; }
        .assistant-panel { width: min(390px, calc(100vw - 32px)); margin: 0 0 14px; overflow: hidden; border: 1px solid rgba(148, 163, 184, .28); border-radius: 22px; background: #fff; box-shadow: 0 24px 70px rgba(15, 23, 42, .24); animation: assistant-enter .22s ease-out; }
        .assistant-header { display: flex; align-items: flex-start; gap: 11px; padding: 18px 18px 17px; color: #fff; background: radial-gradient(circle at 86% 0%, #60a5fa 0, transparent 32%), linear-gradient(135deg, #172554, #1d4ed8); }
        .assistant-avatar, .assistant-launcher-icon { display: grid; flex: 0 0 auto; place-items: center; color: #1d4ed8; background: #fff; box-shadow: 0 4px 14px rgba(15, 23, 42, .18); }
        .assistant-avatar { width: 36px; height: 36px; border-radius: 12px; font-size: 20px; }
        .assistant-heading { min-width: 0; flex: 1; }
        .assistant-eyebrow { display: block; margin-bottom: 3px; color: #bfdbfe; font-size: 9px; font-weight: 800; letter-spacing: .13em; }
        .assistant-heading h2 { margin: 0; color: #fff; font-size: 18px; line-height: 1.2; font-weight: 800; letter-spacing: -.02em; }
        .assistant-heading p { margin: 4px 0 0; color: #dbeafe; font-size: 12px; }
        .assistant-close { width: 30px; height: 30px; padding: 0; border: 1px solid rgba(255,255,255,.25); border-radius: 9px; color: #fff; background: rgba(15, 23, 42, .16); font-size: 24px; line-height: 1; cursor: pointer; }
        .assistant-content { padding: 17px 18px 12px; background: linear-gradient(180deg, #f8fbff, #fff); }
        .assistant-welcome { display: grid; gap: 4px; margin-bottom: 13px; color: #475569; font-size: 13px; line-height: 1.45; }
        .assistant-welcome strong { color: #172554; font-size: 14px; }
        .assistant-suggestions { display: grid; gap: 7px; }
        .assistant-suggestions button { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 10px 11px; border: 1px solid #dbeafe; border-radius: 11px; color: #1e3a8a; background: #fff; text-align: left; font-size: 12px; font-weight: 650; cursor: pointer; transition: .16s ease; }
        .assistant-suggestions button:hover { border-color: #93c5fd; background: #eff6ff; transform: translateY(-1px); }
        .assistant-suggestions span { color: #2563eb; font-size: 15px; }
        .assistant-answer { max-height: 218px; overflow: auto; padding: 12px 13px; border-radius: 13px; color: #1e293b; background: #eaf2ff; white-space: pre-wrap; font-size: 13px; line-height: 1.55; }
        .assistant-typing { color: #475569; font-weight: 600; }
        .assistant-typing span { display: inline-block; width: 22px; overflow: hidden; vertical-align: bottom; animation: assistant-dots 1.2s steps(4, end) infinite; }
        .assistant-form { display: flex; align-items: flex-end; gap: 8px; padding: 8px 12px; border-top: 1px solid #e2e8f0; background: #fff; }
        .assistant-form textarea { min-width: 0; flex: 1; resize: none; border: 0; outline: 0; color: #0f172a; background: transparent; font: inherit; font-size: 13px; line-height: 1.45; }
        .assistant-form textarea::placeholder { color: #94a3b8; }
        .assistant-form button { display: grid; width: 34px; height: 34px; flex: 0 0 auto; place-items: center; border: 0; border-radius: 10px; color: #fff; background: #2563eb; font-size: 20px; font-weight: 700; cursor: pointer; transition: .16s ease; }
        .assistant-form button:disabled { opacity: .42; cursor: not-allowed; }
        .assistant-form button:not(:disabled):hover { background: #1d4ed8; transform: translateY(-1px); }
        .assistant-hint { margin: 0; padding: 0 14px 11px; color: #94a3b8; background: #fff; font-size: 10px; text-align: center; }
        .assistant-launcher { display: flex; align-items: center; gap: 10px; padding: 9px 15px 9px 10px; border: 1px solid rgba(255,255,255,.25); border-radius: 17px; color: #fff; background: linear-gradient(135deg, #1e3a8a, #2563eb); box-shadow: 0 12px 28px rgba(30, 64, 175, .32); text-align: left; cursor: pointer; transition: transform .16s ease, box-shadow .16s ease; }
        .assistant-launcher:hover { box-shadow: 0 15px 34px rgba(30, 64, 175, .42); transform: translateY(-2px); }
        .assistant-launcher-icon { width: 34px; height: 34px; border-radius: 11px; font-size: 18px; }
        .assistant-launcher-copy { display: grid; gap: 1px; }
        .assistant-launcher-copy small { color: #bfdbfe; font-size: 9px; font-weight: 800; letter-spacing: .1em; }
        .assistant-launcher-copy strong { color: #fff; font-size: 13px; line-height: 1.2; }
        @keyframes assistant-enter { from { opacity: 0; transform: translateY(10px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes assistant-dots { to { width: 0; } }
        @media (max-width: 560px) { .floating-assistant { right: 16px; bottom: 16px; } .assistant-panel { margin-bottom: 10px; } .assistant-launcher-copy small { display: none; } }
      `}</style>
    </div>
  );
}

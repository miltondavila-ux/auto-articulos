"use client";

import { FormEvent, KeyboardEvent, useEffect, useState } from "react";

const STORAGE_KEY = "auto-articulos:floating-assistant:v1";
const MAX_STORED_MESSAGES = 30;
const quickQuestions = [
  "¿Cómo publico un artículo?",
  "¿Cómo conecto Google?",
  "¿Dónde veo oportunidades SEO?",
];

type ConversationMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

function renderAnswer(text: string) {
  const parts = text.split(/(\[[^\]]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s),]+)/g);

  return parts.map((part, index) => {
    const markdownLink = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    const url = (markdownLink?.[2] ?? (/^https?:\/\//i.test(part) ? part : null))
      ?.replace(/[.,!?;:]+$/, "");
    if (!url) return part;

    return (
      <a key={`${url}-${index}`} className="assistant-module-link" href={url}>
        {markdownLink?.[1] ?? "Abrir este módulo"}
        <span aria-hidden="true">→</span>
      </a>
    );
  });
}

function createMessage(role: ConversationMessage["role"], content: string): ConversationMessage {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, role, content };
}

export default function FloatingAssistant() {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const value = JSON.parse(stored) as { open?: unknown; messages?: unknown };
        if (typeof value.open === "boolean") setOpen(value.open);
        if (Array.isArray(value.messages)) {
          setMessages(value.messages.filter((item): item is ConversationMessage =>
            typeof item === "object" && item !== null &&
            (item.role === "user" || item.role === "assistant") &&
            typeof item.content === "string" && item.content.length > 0,
          ).slice(-MAX_STORED_MESSAGES));
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ open, messages: messages.slice(-MAX_STORED_MESSAGES) }));
  }, [messages, open, ready]);

  async function ask(question = message) {
    const cleanQuestion = question.trim();
    if (!cleanQuestion || loading) return;

    const userMessage = createMessage("user", cleanQuestion);
    setMessages((current) => [...current, userMessage].slice(-MAX_STORED_MESSAGES));
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: cleanQuestion }),
      });
      const data = (await response.json()) as { answer?: string; error?: string };
      setMessages((current) => [...current, createMessage("assistant", data.answer ?? data.error ?? "No pude responder ahora. Inténtalo de nuevo en un momento.")].slice(-MAX_STORED_MESSAGES));
    } catch {
      setMessages((current) => [...current, createMessage("assistant", "No pude responder ahora. Inténtalo de nuevo en un momento.")].slice(-MAX_STORED_MESSAGES));
    } finally {
      setLoading(false);
    }
  }

  function clearConversation() {
    setMessages([]);
    window.localStorage.removeItem(STORAGE_KEY);
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
            {messages.length > 0 && <button className="assistant-reset" type="button" onClick={clearConversation}>Nueva</button>}
            <button className="assistant-close" type="button" onClick={() => setOpen(false)} aria-label="Cerrar asistente de ayuda">×</button>
          </header>

          <div className="assistant-content">
            {messages.length === 0 ? (
              <>
                <div className="assistant-welcome">
                  <strong>Hola, estoy aquí para orientarte.</strong>
                  <span>Esta conversación se guarda aunque abras otro módulo.</span>
                </div>
                <div className="assistant-suggestions" aria-label="Preguntas frecuentes">
                  {quickQuestions.map((question) => (
                    <button key={question} type="button" onClick={() => void ask(question)}>
                      {question}<span aria-hidden="true">↗</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="assistant-messages">
                {messages.map((item) => (
                  <div key={item.id} className={`assistant-message assistant-message-${item.role}`}>
                    {item.role === "assistant" ? renderAnswer(item.content) : item.content}
                  </div>
                ))}
                {loading && <div className="assistant-message assistant-message-assistant assistant-typing">Buscando una respuesta<span>•••</span></div>}
              </div>
            )}
          </div>

          <form className="assistant-form" onSubmit={submit}>
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={handleKeyDown} placeholder="Escribe tu pregunta aquí…" rows={2} aria-label="Pregunta para el asistente" />
            <button type="submit" disabled={!message.trim() || loading} aria-label="Enviar pregunta"><span aria-hidden="true">↑</span></button>
          </form>
          <p className="assistant-hint">Pulsa Enter para enviar · Mayús + Enter para una nueva línea</p>
        </section>
      )}

      <button className="assistant-launcher" type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-controls="floating-help-panel">
        <span className="assistant-launcher-icon" aria-hidden="true">✦</span>
        <span className="assistant-launcher-copy"><small>AYUDA IA</small><strong>{open ? "Cerrar ayuda" : "¿Necesitas ayuda?"}</strong></span>
      </button>

      <style jsx>{`
        .floating-assistant { position: fixed; right: max(16px, env(safe-area-inset-right)); bottom: max(16px, env(safe-area-inset-bottom)); z-index: 100; font-family: inherit; }
        .assistant-panel { display: flex; width: min(440px, calc(100vw - 32px)); height: min(680px, calc(100svh - 112px)); min-height: 460px; flex-direction: column; box-sizing: border-box; margin: 0 0 14px; overflow: hidden; overscroll-behavior: contain; border: 1px solid rgba(148, 163, 184, .28); border-radius: 22px; background: #fff; box-shadow: 0 24px 70px rgba(15, 23, 42, .24); animation: assistant-enter .18s ease-out; }
        .assistant-header { display: flex; align-items: flex-start; gap: 11px; padding: 18px; color: #fff; background: radial-gradient(circle at 86% 0%, #60a5fa 0, transparent 32%), linear-gradient(135deg, #172554, #1d4ed8); }
        .assistant-avatar, .assistant-launcher-icon { display: grid; flex: 0 0 auto; place-items: center; color: #1d4ed8; background: #fff; box-shadow: 0 4px 14px rgba(15, 23, 42, .18); }
        .assistant-avatar { width: 36px; height: 36px; border-radius: 12px; font-size: 20px; }
        .assistant-heading { min-width: 0; flex: 1; }.assistant-eyebrow { display: block; margin-bottom: 3px; color: #bfdbfe; font-size: 9px; font-weight: 800; letter-spacing: .13em; }.assistant-heading h2 { margin: 0; color: #fff; font-size: 18px; line-height: 1.2; font-weight: 800; letter-spacing: -.02em; }.assistant-heading p { margin: 4px 0 0; color: #dbeafe; font-size: 12px; }
        .assistant-close, .assistant-reset { min-height: 30px; padding: 0 8px; border: 1px solid rgba(255,255,255,.25); border-radius: 9px; color: #fff; background: rgba(15, 23, 42, .16); cursor: pointer; }.assistant-close { width: 30px; padding: 0; font-size: 24px; line-height: 1; }.assistant-reset { font-size: 11px; font-weight: 700; }
        .assistant-content { min-height: 0; flex: 1; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; padding: 17px 18px 12px; background: linear-gradient(180deg, #f8fbff, #fff); }.assistant-welcome { display: grid; gap: 4px; margin-bottom: 13px; color: #475569; font-size: 13px; line-height: 1.45; }.assistant-welcome strong { color: #172554; font-size: 14px; }
        .assistant-suggestions { display: grid; gap: 7px; }.assistant-suggestions button { display: flex; align-items: center; justify-content: space-between; width: 100%; min-height: 44px; padding: 10px 11px; border: 1px solid #dbeafe; border-radius: 11px; color: #1e3a8a; background: #fff; text-align: left; font-size: 12px; font-weight: 650; cursor: pointer; touch-action: manipulation; }.assistant-suggestions span { color: #2563eb; font-size: 15px; }
        .assistant-messages { display: grid; gap: 10px; }.assistant-message { max-width: 92%; padding: 11px 12px; border-radius: 14px; white-space: pre-wrap; font-size: 13px; line-height: 1.55; }.assistant-message-user { justify-self: end; color: #fff; background: #2563eb; border-bottom-right-radius: 4px; }.assistant-message-assistant { justify-self: start; color: #1e293b; background: #eaf2ff; border-bottom-left-radius: 4px; }.assistant-message :global(.assistant-module-link) { display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%; box-sizing: border-box; margin: 8px 0; padding: 10px 11px; border: 1px solid #93c5fd; border-radius: 10px; color: #1d4ed8; background: #fff; font-weight: 750; text-decoration: none; cursor: pointer; }.assistant-typing { color: #475569; font-weight: 600; }.assistant-typing span { display: inline-block; width: 22px; overflow: hidden; vertical-align: bottom; animation: assistant-dots 1.2s steps(4, end) infinite; }
        .assistant-form { display: flex; align-items: flex-end; gap: 8px; padding: 8px 12px; border-top: 1px solid #e2e8f0; background: #fff; }.assistant-form textarea { min-width: 0; flex: 1; resize: none; border: 0; outline: 0; color: #0f172a; background: transparent; font: inherit; font-size: 13px; line-height: 1.45; }.assistant-form textarea::placeholder { color: #94a3b8; }.assistant-form button { display: grid; width: 42px; height: 42px; flex: 0 0 auto; place-items: center; border: 0; border-radius: 12px; color: #fff; background: #2563eb; font-size: 20px; font-weight: 700; cursor: pointer; touch-action: manipulation; }.assistant-form button:disabled { opacity: .42; cursor: not-allowed; }
        .assistant-hint { margin: 0; padding: 0 14px 11px; color: #94a3b8; background: #fff; font-size: 10px; text-align: center; }.assistant-launcher { display: flex; align-items: center; gap: 10px; min-height: 48px; padding: 9px 15px 9px 10px; border: 1px solid rgba(255,255,255,.25); border-radius: 17px; color: #fff; background: linear-gradient(135deg, #1e3a8a, #2563eb); box-shadow: 0 12px 28px rgba(30, 64, 175, .32); text-align: left; cursor: pointer; touch-action: manipulation; }.assistant-launcher-icon { width: 34px; height: 34px; border-radius: 11px; font-size: 18px; }.assistant-launcher-copy { display: grid; gap: 1px; }.assistant-launcher-copy small { color: #bfdbfe; font-size: 9px; font-weight: 800; letter-spacing: .1em; }.assistant-launcher-copy strong { color: #fff; font-size: 13px; line-height: 1.2; }
        @keyframes assistant-enter { from { opacity: 0; transform: translateY(10px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } } @keyframes assistant-dots { to { width: 0; } }
        @media (max-width: 560px) { .floating-assistant { right: max(12px, env(safe-area-inset-right)); bottom: max(12px, env(safe-area-inset-bottom)); left: max(12px, env(safe-area-inset-left)); display: flex; flex-direction: column; align-items: stretch; pointer-events: none; }.assistant-panel, .assistant-launcher { pointer-events: auto; }.assistant-panel { width: 100%; height: min(680px, calc(100svh - 92px)); min-height: 0; max-height: none; margin-bottom: 10px; border-radius: 20px; animation: assistant-mobile-enter .16s ease-out; }.assistant-header { padding: 16px; }.assistant-content { padding: 15px 16px 10px; }.assistant-launcher { align-self: flex-end; }.assistant-launcher-copy small, .assistant-hint { display: none; }}
        @media (prefers-reduced-motion: reduce) { .assistant-panel, .assistant-typing span { animation: none; } } @keyframes assistant-mobile-enter { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}

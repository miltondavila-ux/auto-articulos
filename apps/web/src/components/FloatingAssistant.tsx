"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

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

  // Estados para posicionamiento de arrastre
  const [position, setPosition] = useState<{ right: number; bottom: number } | null>(null);

  /*
   * Permite abrir el asistente desde cualquier parte de la plataforma con una
   * pregunta ya escrita, disparando el evento "auto-articulos:preguntar".
   * Lo usan los círculos de ayuda que acompañan a los avisos: la persona pulsa
   * y llega al chat con la pregunta puesta, en vez de tener que redactarla.
   */
  useEffect(() => {
    function alPreguntar(evento: Event) {
      const detalle = (evento as CustomEvent<{ pregunta?: string }>).detail;
      setOpen(true);
      if (detalle?.pregunta) setMessage(detalle.pregunta);
    }
    window.addEventListener("auto-articulos:preguntar", alPreguntar);
    return () => window.removeEventListener("auto-articulos:preguntar", alPreguntar);
  }, []);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragInfoRef = useRef<{
    startX: number;
    startY: number;
    startRight: number;
    startBottom: number;
    isPressed: boolean;
    hasMoved: boolean;
  }>({
    startX: 0,
    startY: 0,
    startRight: 0,
    startBottom: 0,
    isPressed: false,
    hasMoved: false,
  });

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const value = JSON.parse(stored) as { open?: unknown; messages?: unknown; position?: unknown };
        if (typeof value.open === "boolean") setOpen(value.open);
        if (Array.isArray(value.messages)) {
          setMessages(value.messages.filter((item): item is ConversationMessage =>
            typeof item === "object" && item !== null &&
            (item.role === "user" || item.role === "assistant") &&
            typeof item.content === "string" && item.content.length > 0,
          ).slice(-MAX_STORED_MESSAGES));
        }
        if (value.position && typeof value.position === "object") {
          const pos = value.position as { right?: unknown; bottom?: unknown };
          if (typeof pos.right === "number" && typeof pos.bottom === "number") {
            setPosition({ right: pos.right, bottom: pos.bottom });
          }
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
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        open,
        messages: messages.slice(-MAX_STORED_MESSAGES),
        position,
      })
    );
  }, [messages, open, position, ready]);

  // Manejadores globales de movimiento para el arrastre
  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      const drag = dragInfoRef.current;
      if (!drag.isPressed || !containerRef.current) return;

      const deltaX = clientX - drag.startX;
      const deltaY = clientY - drag.startY;

      // Usar umbral de 5 píxeles para iniciar el arrastre y evitar confundirlo con clics
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (!drag.hasMoved && distance > 5) {
        drag.hasMoved = true;
        setIsDragging(true);
      }

      if (drag.hasMoved) {
        let newRight = drag.startRight - deltaX;
        let newBottom = drag.startBottom - deltaY;

        const rect = containerRef.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        const isMobile = window.innerWidth <= 560;

        if (!isMobile) {
          // Clamp horizontal en escritorio
          newRight = Math.max(0, Math.min(newRight, window.innerWidth - width));
        } else {
          // En móvil, dejamos que el ancho completo sea controlado por el CSS flex layout
          newRight = 0;
        }

        // Clamp vertical
        newBottom = Math.max(0, Math.min(newBottom, window.innerHeight - height));

        setPosition({
          right: isMobile ? 0 : newRight,
          bottom: newBottom,
        });
      }
    };

    const handleEnd = () => {
      const drag = dragInfoRef.current;
      if (!drag.isPressed) return;

      drag.isPressed = false;
      if (drag.hasMoved) {
        // timeout mínimo para asegurar que los eventos onClick no se disparen inmediatamente tras soltar el arrastre
        setTimeout(() => {
          setIsDragging(false);
        }, 50);
      }
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        handleMove(touch.clientX, touch.clientY);
      }
    };

    const onMouseUp = () => handleEnd();
    const onTouchEnd = () => handleEnd();

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [position]);

  // Listener para ajustar el widget dentro de los bordes si se cambia el tamaño de pantalla
  useEffect(() => {
    const handleResize = () => {
      if (!position || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const isMobile = window.innerWidth <= 560;

      let newRight = position.right;
      let newBottom = position.bottom;

      if (!isMobile) {
        newRight = Math.max(0, Math.min(newRight, window.innerWidth - rect.width));
      } else {
        newRight = 0;
      }
      newBottom = Math.max(0, Math.min(newBottom, window.innerHeight - rect.height));

      if (newRight !== position.right || newBottom !== position.bottom) {
        setPosition({ right: newRight, bottom: newBottom });
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [position]);

  const handleStart = (clientX: number, clientY: number, target: EventTarget) => {
    if (target instanceof HTMLElement) {
      // El botón lanzador es un <button>, pero sí debe permitir el arrastre
      const isLauncher = target.closest(".assistant-launcher");

      // Si no es el lanzador, evitamos arrastrar si se presiona un botón del panel, input, etc.
      if (!isLauncher) {
        if (
          target.closest("button") ||
          target.closest("textarea") ||
          target.closest("a") ||
          target.closest("input")
        ) {
          return;
        }
      }
    }

    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const currentRight = position ? position.right : (window.innerWidth - rect.right);
    const currentBottom = position ? position.bottom : (window.innerHeight - rect.bottom);

    dragInfoRef.current = {
      startX: clientX,
      startY: clientY,
      startRight: currentRight,
      startBottom: currentBottom,
      isPressed: true,
      hasMoved: false,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Solo botón izquierdo
    handleStart(e.clientX, e.clientY, e.target);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) {
      handleStart(touch.clientX, touch.clientY, e.target);
    }
  };

  const handleLauncherClick = (e: React.MouseEvent) => {
    if (dragInfoRef.current.hasMoved) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    setOpen((current) => !current);
  };

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

  const isMobile = typeof window !== "undefined" && window.innerWidth <= 560;
  const inlineStyle: React.CSSProperties = position
    ? {
        right: isMobile ? "max(12px, env(safe-area-inset-right))" : `${position.right}px`,
        left: isMobile ? "max(12px, env(safe-area-inset-left))" : "auto",
        bottom: `${position.bottom}px`,
      }
    : {};

  return (
    <div ref={containerRef} className={`floating-assistant ${isDragging ? "dragging" : ""}`} style={inlineStyle} aria-live="polite">
      {open && (
        <section id="floating-help-panel" className="assistant-panel" aria-label="Asistente de ayuda">
          <header className="assistant-header" onMouseDown={handleMouseDown} onTouchStart={handleTouchStart}>
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

      <button className="assistant-launcher" type="button" onMouseDown={handleMouseDown} onTouchStart={handleTouchStart} onClick={handleLauncherClick} aria-expanded={open} aria-controls="floating-help-panel">
        <span className="assistant-launcher-icon" aria-hidden="true">✦</span>
        <span className="assistant-launcher-copy"><small>AYUDA IA</small><strong>{open ? "Cerrar ayuda" : "¿Necesitas ayuda?"}</strong></span>
      </button>

      <style jsx>{`
        .floating-assistant { position: fixed; right: max(16px, env(safe-area-inset-right)); bottom: max(16px, env(safe-area-inset-bottom)); z-index: 100; font-family: inherit; }
        .floating-assistant.dragging, .floating-assistant.dragging * { cursor: grabbing !important; user-select: none; }
        .assistant-panel { display: flex; width: min(440px, calc(100vw - 32px)); height: min(680px, calc(100svh - 112px)); min-height: 460px; flex-direction: column; box-sizing: border-box; margin: 0 0 14px; overflow: hidden; overscroll-behavior: contain; border: 1px solid rgba(0, 0, 0, .07); border-radius: 22px; background: #fff; box-shadow: 0 24px 70px rgba(0, 0, 0, .18); animation: assistant-enter .18s ease-out; }
        .assistant-header { display: flex; align-items: flex-start; gap: 11px; padding: 18px; color: #fff; background: #1d1d1f; cursor: grab; }
        .assistant-header:active { cursor: grabbing; }
        .assistant-avatar, .assistant-launcher-icon { display: grid; flex: 0 0 auto; place-items: center; color: #1d1d1f; background: #fff; box-shadow: 0 4px 14px rgba(0, 0, 0, .18); }
        .assistant-avatar { width: 36px; height: 36px; border-radius: 12px; font-size: 20px; }
        .assistant-heading { min-width: 0; flex: 1; }.assistant-eyebrow { display: block; margin-bottom: 3px; color: rgba(255, 255, 255, .75); font-size: 9px; font-weight: 800; letter-spacing: .13em; }.assistant-heading h2 { margin: 0; color: #fff; font-size: 18px; line-height: 1.2; font-weight: 800; letter-spacing: -.02em; }.assistant-heading p { margin: 4px 0 0; color: rgba(255, 255, 255, .85); font-size: 12px; }
        .assistant-close, .assistant-reset { min-height: 30px; padding: 0 8px; border: 1px solid rgba(255,255,255,.25); border-radius: 9px; color: #fff; background: rgba(255, 255, 255, .15); cursor: pointer; }.assistant-close { width: 30px; padding: 0; font-size: 24px; line-height: 1; }.assistant-reset { font-size: 11px; font-weight: 700; }
        .assistant-content { min-height: 0; flex: 1; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; padding: 17px 18px 12px; background: #fff; }.assistant-welcome { display: grid; gap: 4px; margin-bottom: 13px; color: #6e6e73; font-size: 13px; line-height: 1.45; }.assistant-welcome strong { color: #1d1d1f; font-size: 14px; }
        .assistant-suggestions { display: grid; gap: 7px; }.assistant-suggestions button { display: flex; align-items: center; justify-content: space-between; width: 100%; min-height: 44px; padding: 10px 11px; border: 1px solid rgba(0, 113, 227, .2); border-radius: 11px; color: #1d1d1f; background: #fff; text-align: left; font-size: 12px; font-weight: 650; cursor: pointer; touch-action: manipulation; }.assistant-suggestions span { color: #1d1d1f; font-size: 15px; }
        .assistant-messages { display: grid; gap: 10px; }.assistant-message { max-width: 92%; padding: 11px 12px; border-radius: 14px; white-space: pre-wrap; font-size: 13px; line-height: 1.55; }.assistant-message-user { justify-self: end; color: #fff; background: #1d1d1f; border-bottom-right-radius: 4px; }.assistant-message-assistant { justify-self: start; color: #1d1d1f; background: #f5f5f7; border-bottom-left-radius: 4px; }.assistant-message :global(.assistant-module-link) { display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%; box-sizing: border-box; margin: 8px 0; padding: 10px 11px; border: 1px solid rgba(0, 113, 227, .3); border-radius: 10px; color: #1d1d1f; background: #fff; font-weight: 750; text-decoration: none; cursor: pointer; }.assistant-typing { color: #6e6e73; font-weight: 600; }.assistant-typing span { display: inline-block; width: 22px; overflow: hidden; vertical-align: bottom; animation: assistant-dots 1.2s steps(4, end) infinite; }
        .assistant-form { display: flex; align-items: flex-end; gap: 8px; padding: 8px 12px; border-top: 1px solid rgba(0, 0, 0, .07); background: #fff; }.assistant-form textarea { min-width: 0; flex: 1; resize: none; border: 0; outline: 0; color: #1d1d1f; background: transparent; font: inherit; font-size: 13px; line-height: 1.45; }.assistant-form textarea::placeholder { color: #6e6e73; }.assistant-form button { display: grid; width: 42px; height: 42px; flex: 0 0 auto; place-items: center; border: 0; border-radius: 12px; color: #fff; background: #1d1d1f; font-size: 20px; font-weight: 700; cursor: pointer; touch-action: manipulation; }.assistant-form button:disabled { opacity: .42; cursor: not-allowed; }
        .assistant-hint { margin: 0; padding: 0 14px 11px; color: #6e6e73; background: #fff; font-size: 10px; text-align: center; }
        .assistant-launcher { display: flex; align-items: center; gap: 10px; min-height: 48px; padding: 9px 15px 9px 10px; border: 1px solid rgba(255,255,255,.25); border-radius: 17px; color: #fff; background: #1d1d1f; box-shadow: 0 12px 28px rgba(0, 113, 227, .32); text-align: left; cursor: grab; touch-action: none; }
        .assistant-launcher:active { cursor: grabbing; }
        .assistant-launcher-icon { width: 34px; height: 34px; border-radius: 11px; font-size: 18px; }.assistant-launcher-copy { display: grid; gap: 1px; }.assistant-launcher-copy small { color: rgba(255, 255, 255, .75); font-size: 9px; font-weight: 800; letter-spacing: .1em; }.assistant-launcher-copy strong { color: #fff; font-size: 13px; line-height: 1.2; }
        @keyframes assistant-enter { from { opacity: 0; transform: translateY(10px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } } @keyframes assistant-dots { to { width: 0; } }
        @media (max-width: 560px) {
          .floating-assistant { right: max(12px, env(safe-area-inset-right)); bottom: max(12px, env(safe-area-inset-bottom)); left: max(12px, env(safe-area-inset-left)); display: flex; flex-direction: column; align-items: stretch; pointer-events: none; }
          .assistant-panel, .assistant-launcher { pointer-events: auto; }
          .assistant-panel { width: 100%; height: min(680px, calc(100svh - 92px)); min-height: 0; max-height: none; margin-bottom: 10px; border-radius: 20px; animation: assistant-mobile-enter .16s ease-out; }
          .assistant-header { padding: 16px; }
          .assistant-content { padding: 15px 16px 10px; }
          .assistant-launcher { align-self: flex-end; }
          .assistant-launcher-copy small, .assistant-hint { display: none; }
        }
        @media (prefers-reduced-motion: reduce) { .assistant-panel, .assistant-typing span { animation: none; } } @keyframes assistant-mobile-enter { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}

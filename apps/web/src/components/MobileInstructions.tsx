import type { ReactNode } from "react";

/** Texto de apoyo visible en escritorio y plegado por defecto en móvil. */
export default function MobileInstructions({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="mobile-instructions-desktop">{children}</div>
      <details className="mobile-instructions-mobile">
        <summary>Ver instrucciones</summary>
        <div style={{ marginTop: 12 }}>{children}</div>
      </details>
      <style>{`
        .mobile-instructions-mobile { display: none; border: 1px solid #e5e5ea; border-radius: 12px; padding: 12px 14px; background: #ffffff; }
        @media (max-width: 700px) {
          .mobile-instructions-desktop { display: none; }
          .mobile-instructions-mobile { display: block; }
          .mobile-instructions-mobile summary { cursor: pointer; list-style: none; color: #1d1d1f; font-size: 12px; font-weight: 600; }
          .mobile-instructions-mobile summary::-webkit-details-marker { display: none; }
          .mobile-instructions-mobile summary::after { content: "＋"; float: right; font-size: 16px; }
          .mobile-instructions-mobile[open] summary::after { content: "−"; }
        }
      `}</style>
    </>
  );
}

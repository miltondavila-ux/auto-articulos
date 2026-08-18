"use client";

import Link from "next/link";
import { sectionStyle } from "@/components/dashboard-ui";

export default function ComoFuncionaPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28, maxWidth: 1120, margin: "0 auto" }}>
      <style>{`
        .minimal-hero {
          padding: 40px 0 20px;
        }
        .minimal-hero h1 {
          font-size: 32px;
          font-weight: 700;
          letter-spacing: -0.03em;
          color: #1d1d1f;
          margin-bottom: 8px;
        }
        .minimal-hero p {
          font-size: 15px;
          color: #86868b;
          margin: 0;
        }

        /* Contenedor del flujo */
        .diagram-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          padding: 40px 24px;
          background: #ffffff;
          border: 1px solid #e5e5ea;
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.01);
        }

        /* Fila del diagrama en Desktop */
        .diagram-row {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          max-width: 1000px;
          position: relative;
        }

        /* Cajas de pasos */
        .step-node {
          background: #ffffff;
          border: 1px solid #d2d2d7;
          border-radius: 14px;
          padding: 20px;
          width: 240px;
          flex-shrink: 0;
          transition: border-color 0.2s ease;
        }
        .step-node:hover {
          border-color: #86868b;
        }
        .step-node .node-num {
          font-size: 11px;
          font-weight: 600;
          color: #86868b;
          letter-spacing: 0.05em;
          margin-bottom: 6px;
          text-transform: uppercase;
        }
        .step-node h3 {
          font-size: 16px;
          font-weight: 600;
          color: #1d1d1f;
          margin: 0 0 6px 0;
        }
        .step-node p {
          font-size: 13px;
          color: #6e6e73;
          line-height: 1.4;
          margin: 0;
        }

        /* Líneas y flechas SVG */
        .flow-line {
          flex-grow: 1;
          height: 2px;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 40px;
        }
        .flow-line svg {
          color: #86868b;
          width: 100%;
        }

        /* Bifurcación */
        .split-branches {
          display: flex;
          flex-direction: column;
          gap: 20px;
          width: 240px;
          flex-shrink: 0;
        }

        /* Responsive */
        @media (max-width: 820px) {
          .diagram-row {
            flex-direction: column;
            gap: 16px;
          }
          .flow-line {
            height: 40px;
            width: 2px;
            min-width: 0;
            transform: rotate(90deg);
            margin: 8px 0;
          }
          .split-branches {
            width: 100%;
            align-items: center;
          }
        }
      `}</style>

      {/* Hero */}
      <div className="minimal-hero">
        <h1>Cómo Funciona el Flujo</h1>
        <p>Esquema simplificado de los pasos que sigue Auto Artículos en tu cuenta.</p>
      </div>

      {/* Infografía Minimalista */}
      <div className="diagram-container">
        <div className="diagram-row">

          {/* Paso 1 */}
          <div className="step-node">
            <div className="node-num">01. Buscadores</div>
            <h3>Google & Bing</h3>
            <p>El sistema detecta los temas y consultas reales que la gente busca en internet.</p>
          </div>

          {/* Flecha Conectora 1 */}
          <div className="flow-line">
            <svg height="8" width="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 4H92M92 4L87 1M92 4L87 7" stroke="#d2d2d7" strokeWidth="1.5" />
            </svg>
          </div>

          {/* Paso 2 */}
          <div className="step-node">
            <div className="node-num">02. El Cerebro</div>
            <h3>Auto Artículos</h3>
            <p>Analiza las consultas y las organiza por tus categorías de contenido.</p>
          </div>

          {/* Flecha Conectora 2 (Bifurcación) */}
          <div className="flow-line">
            <svg height="8" width="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 4H92M92 4L87 1M92 4L87 7" stroke="#d2d2d7" strokeWidth="1.5" />
            </svg>
          </div>

          {/* Bifurcación (Paso 3) */}
          <div className="split-branches">

            {/* Paso 3A */}
            <div className="step-node" style={{ width: "100%" }}>
              <div className="node-num" style={{ color: "#0071e3" }}>03A. Automático</div>
              <h3>Tu Blog Web</h3>
              <p>Genera artículos SEO optimizados y los publica directamente en tu blog.</p>
            </div>

            {/* Paso 3B */}
            <div className="step-node" style={{ width: "100%" }}>
              <div className="node-num" style={{ color: "#86868b" }}>03B. Borrador</div>
              <h3>Redes Sociales</h3>
              <p>Prepara propuestas de posts para que los apruebes con un solo clic.</p>
            </div>

          </div>

        </div>
      </div>

      {/* Detalle en tarjetas limpias */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>

        <div className="panel" style={{ ...sectionStyle, marginTop: 0, padding: 24 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Fase Inicial</span>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1d1d1f", margin: "8px 0 10px 0" }}>1. Detección Inteligente</h3>
          <p style={{ fontSize: 13.5, color: "#6e6e73", lineHeight: 1.5, margin: "0 0 16px 0" }}>
            El sistema se vincula de forma segura a Google Search Console y Bing Webmaster.
            Extrae de forma desatendida las dudas y temas con mayor tráfico e interés.
          </p>
          <Link href="/dashboard/configuracion?tab=integrations" style={{ fontSize: 13, fontWeight: 500, color: "#0071e3", textDecoration: "none" }}>
            Gestionar buscadores &rarr;
          </Link>
        </div>

        <div className="panel" style={{ ...sectionStyle, marginTop: 0, padding: 24 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#0071e3", textTransform: "uppercase", letterSpacing: "0.05em" }}>Flujo Principal</span>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1d1d1f", margin: "8px 0 10px 0" }}>2. Publicación de Artículos</h3>
          <p style={{ fontSize: 13.5, color: "#6e6e73", lineHeight: 1.5, margin: "0 0 16px 0" }}>
            La Inteligencia Artificial escribe los contenidos según los términos sugeridos por el buscador.
            Se publican de manera automática e indexan al instante para ganar visitas en tu blog.
          </p>
          <Link href="/dashboard/oportunidades" style={{ fontSize: 13, fontWeight: 500, color: "#0071e3", textDecoration: "none" }}>
            Ver Oportunidades SEO &rarr;
          </Link>
        </div>

        <div className="panel" style={{ ...sectionStyle, marginTop: 0, padding: 24 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#86868b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Flujo Alterno</span>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1d1d1f", margin: "8px 0 10px 0" }}>3. Presencia en Redes</h3>
          <p style={{ fontSize: 13.5, color: "#6e6e73", lineHeight: 1.5, margin: "0 0 16px 0" }}>
            El sistema toma los temas de los artículos y crea borradores de posts.
            Tú tienes el control total: puedes revisarlos, modificarlos y aprobar su publicación.
          </p>
          <Link href="/dashboard/oportunidades-redes" style={{ fontSize: 13, fontWeight: 500, color: "#0071e3", textDecoration: "none" }}>
            Revisar propuestas &rarr;
          </Link>
        </div>

      </div>
    </div>
  );
}

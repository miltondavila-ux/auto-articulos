"use client";

import { sectionStyle, h2Style } from "./dashboard-ui";
import ComposioConnect from "./ComposioConnect";

export default function GoogleSearchConsoleSection() {
  return (
    <section style={sectionStyle}>
      <h2 style={h2Style}>Google Search Console</h2>
      <p className="lead-copy" style={{ margin: "0 0 16px 0" }}>
        Conexión administrada desde esta tarjeta. Elige aquí la propiedad que usará SEO TOTAL.
      </p>
      <ComposioConnect inline apps={["google_search_console"]} />
    </section>
  );
}

"use client";

import { sectionStyle, h2Style } from "./dashboard-ui";
import ComposioConnect from "./ComposioConnect";

export default function GoogleAnalyticsSection() {
  return <section style={sectionStyle}>
    <h2 style={h2Style}>Google Analytics 4</h2>
    <p className="lead-copy" style={{ margin: "0 0 16px" }}>
      Conexión administrada desde esta tarjeta. Elige aquí la propiedad que usará SEO TOTAL.
    </p>
    <ComposioConnect inline apps={["google_analytics"]} />
  </section>;
}

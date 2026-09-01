"use client";
import { useEffect, useState } from "react";
import { inputStyle, sectionStyle, h2Style, buttonStyle } from "@/components/dashboard-ui";
import { PLATFORM_SERVERS, PLATFORM_DOMAIN_VALUES } from "@auto-articulos/shared";

type Config = { platformDomain: string; monthlyArticleLimit: number | null; dailyArticleLimit: number | null; maxTitlesPerBatch: number };
export default function ArticleLimitsPanel() {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [domain, setDomain] = useState("net");
  const [values, setValues] = useState({ monthlyArticleLimit: "", dailyArticleLimit: "", maxTitlesPerBatch: "" });
  const [message, setMessage] = useState("");
  useEffect(() => { fetch("/api/admin/article-limits", { cache: "no-store" }).then((r) => r.json()).then((d) => setConfigs(d.configs ?? [])); }, []);
  useEffect(() => { const c = configs.find((x) => x.platformDomain === domain); if (c) setValues({ monthlyArticleLimit: c.monthlyArticleLimit == null ? "" : String(c.monthlyArticleLimit), dailyArticleLimit: c.dailyArticleLimit == null ? "" : String(c.dailyArticleLimit), maxTitlesPerBatch: String(c.maxTitlesPerBatch) }); }, [configs, domain]);
  async function save() {
    const body = { platformDomain: domain, monthlyArticleLimit: values.monthlyArticleLimit === "" ? null : Number(values.monthlyArticleLimit), dailyArticleLimit: values.dailyArticleLimit === "" ? null : Number(values.dailyArticleLimit), maxTitlesPerBatch: Number(values.maxTitlesPerBatch) };
    const res = await fetch("/api/admin/article-limits", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json(); if (!res.ok) { setMessage(data.error ?? "No se pudo guardar"); return; }
    setConfigs((old) => old.map((c) => c.platformDomain === domain ? data.config : c)); setMessage("Límites globales guardados.");
  }
  return <section style={sectionStyle}><h2 style={h2Style}>Límites globales de artículos</h2><p style={{ color: "#6e6e73", fontSize: 13 }}>Los usuarios heredan estos valores. Puedes establecer excepciones desde la ficha individual.</p><label style={{ display: "grid", gap: 6, maxWidth: 420, fontSize: 13 }}>Servidor<select value={domain} onChange={(e) => setDomain(e.target.value)} style={inputStyle}>{PLATFORM_DOMAIN_VALUES.map((d) => <option key={d} value={d}>{PLATFORM_SERVERS[d].label}</option>)}</select></label><div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginTop: 12 }}>{([['monthlyArticleLimit','Límite mensual'],['dailyArticleLimit','Límite diario'],['maxTitlesPerBatch','Máximo por lote']] as const).map(([key,label]) => <label key={key} style={{ display: "grid", gap: 6, fontSize: 13 }}>{label}<input type="number" min={key === "maxTitlesPerBatch" ? 1 : 0} value={values[key]} onChange={(e) => setValues({ ...values, [key]: e.target.value })} style={inputStyle} /></label>)}</div><button onClick={save} style={{ ...buttonStyle, marginTop: 14 }}>Guardar límites globales</button>{message && <p style={{ fontSize: 13 }}>{message}</p>}</section>;
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Metric,
  Text,
  Title,
  Flex,
  ProgressBar,
  LineChart,
} from "@tremor/react";

interface DashboardStats {
  totalPublished: number;
  totalAttempted: number;
  successRate: number | null;
  publishedThisMonth: number;
  monthlyArticleLimit: number | null;
  publishedToday: number;
  dailyArticleLimit: number | null;
  daysSinceLastPublish: number | null;
  streak: number;
  chart: { date: string; label: string; "Artículos publicados": number }[];
  pendingOpportunityTitles: number;
}

const statsBlockStyle = {
  background: "#ffffff",
  border: "1px solid #d2d2d7",
  borderRadius: 6,
  padding: "16px 18px",
  boxSizing: "border-box" as const,
};

export default function PerformanceDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetch("/api/dashboard-stats")
      .then((r) => (r.ok ? r.json() : null))
      .then(setStats)
      .catch(() => {});
  }, []);

  if (!stats) return null;

  const monthlyPercent = stats.monthlyArticleLimit
    ? Math.min(
        100,
        Math.round((stats.publishedThisMonth / stats.monthlyArticleLimit) * 100),
      )
    : null;
  const dailyPercent = stats.dailyArticleLimit
    ? Math.min(
        100,
        Math.round((stats.publishedToday / stats.dailyArticleLimit) * 100),
      )
    : null;
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ ...statsBlockStyle, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", columnGap: 24, rowGap: 0 }}>
        <div style={{ padding: "14px 0", borderTop: "1px solid #e5e5ea" }}>
          <Text>Publicados este mes</Text>
          <Metric>{stats.publishedThisMonth}</Metric>
          {stats.monthlyArticleLimit ? (
            <>
              <Flex className="mt-3">
                <Text className="text-xs">Límite {stats.monthlyArticleLimit}</Text>
                <Text className="text-xs">{monthlyPercent}%</Text>
              </Flex>
              <ProgressBar
                value={monthlyPercent ?? 0}
                className="mt-1"
                color="neutral"
              />
            </>
          ) : (
            <Text className="mt-3 text-xs">Sin límite mensual</Text>
          )}
        </div>

        <div style={{ padding: "14px 0", borderTop: "1px solid #e5e5ea" }}>
          <Text>Publicados hoy</Text>
          <Metric>{stats.publishedToday}</Metric>
          {stats.dailyArticleLimit ? (
            <>
              <Flex className="mt-3">
                <Text className="text-xs">Límite {stats.dailyArticleLimit}</Text>
                <Text className="text-xs">{dailyPercent}%</Text>
              </Flex>
              <ProgressBar
                value={dailyPercent ?? 0}
                className="mt-1"
                color="neutral"
              />
            </>
          ) : (
            <Text className="mt-3 text-xs">Sin límite diario</Text>
          )}
        </div>

        <div style={{ padding: "14px 0", borderTop: "1px solid #e5e5ea" }}>
          <Text>Total publicado</Text>
          <Metric>{stats.totalPublished}</Metric>
          <Text className="mt-3 text-xs">
            {stats.successRate !== null
              ? `${stats.successRate}% de éxito sobre ${stats.totalAttempted} intentos`
              : "Sin intentos todavía"}
          </Text>
        </div>

        <div style={{ padding: "14px 0", borderTop: "1px solid #e5e5ea" }}>
          <Text>Contenido listo para publicar</Text>
          <Metric>{stats.pendingOpportunityTitles}</Metric>
          <Link
            href="/dashboard/oportunidades"
            className="mt-3 inline-block text-xs font-semibold no-underline"
            style={{ color: "#1d1d1f" }}
          >
            Ver contenido inteligente →
          </Link>
        </div>
      </div>

      <div style={{ ...statsBlockStyle, marginTop: 16 }}>
            <Title>Tu ritmo — últimos 14 días</Title>
            {(() => {
              /*
               * Dos líneas, a pedido de Milton: la recta es lo que deberías
               * publicar cada día (tu lote máximo) y la curva es lo que
               * realmente publicaste. Un día sin publicar hunde la curva; un
               * día flojo la baja. De un vistazo se ve si el ritmo se sostiene.
               */
              const meta = stats.dailyArticleLimit ?? 0;
              const datos = stats.chart.map((d) => ({
                ...d,
                "Tu meta diaria": meta,
              }));
              const publicados = stats.chart.reduce(
                (suma, d) => suma + d["Artículos publicados"],
                0,
              );
              const esperados = meta * stats.chart.length;
              const porcentaje =
                esperados > 0 ? Math.round((publicados / esperados) * 100) : null;
              const diasSinPublicar = stats.chart.filter(
                (d) => d["Artículos publicados"] === 0,
              ).length;

              return (
                <>
                  <LineChart
                    className="mt-4 h-56"
                    data={datos}
                    index="label"
                    categories={
                      meta > 0
                        ? ["Artículos publicados", "Tu meta diaria"]
                        : ["Artículos publicados"]
                    }
                    colors={meta > 0 ? ["neutral", "gray"] : ["neutral"]}
                    curveType="natural"
                    showLegend={meta > 0}
                    showAnimation
                    allowDecimals={false}
                  />
                  {porcentaje !== null && (
                    <div
                      style={{
                        marginTop: 14,
                        paddingTop: 14,
                        borderTop: "1px solid #d2d2d7",
                        fontSize: 15,
                        lineHeight: 1.55,
                        color: "#1d1d1f",
                      }}
                    >
                      <strong>
                        {publicados} de {esperados} artículos ({porcentaje}%)
                      </strong>{" "}
                      en estos 14 días.{" "}
                      {porcentaje >= 90
                        ? "Vas al ritmo que toca: sigue así y el efecto se acumula solo."
                        : porcentaje >= 50
                          ? `Vas a medio gas. ${diasSinPublicar} día(s) sin publicar te dejaron por debajo de la meta.`
                          : `Vas muy por debajo: ${diasSinPublicar} de ${stats.chart.length} días sin publicar. Cada día vacío es posicionamiento que no se recupera.`}
                    </div>
                  )}
                </>
              );
            })()}
      </div>
    </div>
  );
}

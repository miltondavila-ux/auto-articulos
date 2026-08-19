"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  Grid,
  Col,
  Metric,
  Text,
  Title,
  Flex,
  ProgressBar,
  LineChart,
  BarList,
  Callout,
  Badge,
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
  googleConnected: boolean;
  googleSiteUrl: string | null;
  topCategories: {
    name: string;
    impressions: number;
    clicks: number;
    opportunities: number;
  }[];
  pendingOpportunityTitles: number;
}

function empathyMessage(stats: DashboardStats): {
  color: "emerald" | "amber" | "blue";
  title: string;
  text: string;
  cta?: { label: string; href: string };
} {
  if (stats.streak >= 3) {
    return {
      color: "emerald",
      title: `¡${stats.streak} días seguidos publicando!`,
      text: "Excelente ritmo constante — así se construye posicionamiento a largo plazo.",
    };
  }
  if (stats.daysSinceLastPublish === null) {
    return {
      color: "blue",
      title: "Todavía no has publicado ningún artículo",
      text: "Elige una categoría y pega tus primeros títulos para arrancar.",
      cta: { label: "Ir a Publicar", href: "/dashboard/publicar" },
    };
  }
  if (stats.daysSinceLastPublish >= 7) {
    return {
      color: "amber",
      title: `Han pasado ${stats.daysSinceLastPublish} días sin publicar`,
      text: "No pasa nada — pero el posicionamiento avanza más rápido con contenido constante. ¿Vemos las oportunidades sugeridas?",
      cta: { label: "Ver oportunidades", href: "/dashboard/oportunidades" },
    };
  }
  if (stats.daysSinceLastPublish === 0) {
    return {
      color: "emerald",
      title: "¡Publicaste hoy!",
      text: "Sigue así — cada artículo suma para tu posicionamiento.",
    };
  }
  return {
    color: "blue",
    title: `Última publicación hace ${stats.daysSinceLastPublish} día${stats.daysSinceLastPublish === 1 ? "" : "s"}`,
    text: "Cuando quieras retomar, ya tienes oportunidades listas para ejecutar.",
    cta: { label: "Ver oportunidades", href: "/dashboard/oportunidades" },
  };
}

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
  const msg = empathyMessage(stats);

  return (
    <div style={{ marginTop: 20 }}>
      <Callout title={msg.title} color={msg.color}>
        {msg.text}{" "}
        {msg.cta && (
          <Link href={msg.cta.href} className="font-medium underline" style={{ color: "#1d1d1f" }}>
            {msg.cta.label} →
          </Link>
        )}
      </Callout>

      <Grid numItemsSm={2} numItemsLg={4} className="mt-4 gap-4">
        <Card>
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
                color={monthlyPercent && monthlyPercent >= 90 ? "red" : "blue"}
              />
            </>
          ) : (
            <Text className="mt-3 text-xs">Sin límite mensual</Text>
          )}
        </Card>

        <Card>
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
                color={dailyPercent && dailyPercent >= 90 ? "red" : "blue"}
              />
            </>
          ) : (
            <Text className="mt-3 text-xs">Sin límite diario</Text>
          )}
        </Card>

        <Card>
          <Text>Total publicado</Text>
          <Metric>{stats.totalPublished}</Metric>
          <Text className="mt-3 text-xs">
            {stats.successRate !== null
              ? `${stats.successRate}% de éxito sobre ${stats.totalAttempted} intentos`
              : "Sin intentos todavía"}
          </Text>
        </Card>

        <Card>
          <Text>Oportunidades listas</Text>
          <Metric>{stats.pendingOpportunityTitles}</Metric>
          <Link
            href="/dashboard/oportunidades"
            className="mt-3 inline-block text-xs font-semibold text-blue-400 no-underline"
          >
            Ver oportunidades →
          </Link>
        </Card>
      </Grid>

      <Grid numItemsLg={3} className="mt-4 gap-4">
        <Col numColSpanLg={2}>
          <Card>
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
          </Card>
        </Col>
        <Col>
          <Card>
            <Title>Google Search Console</Title>
            {stats.googleConnected ? (
              <>
                <Badge color="emerald" className="mt-2">
                  Conectado
                </Badge>
                <Text className="mt-3 text-xs" title={stats.googleSiteUrl ?? ""}>
                  Propiedad: {stats.googleSiteUrl}
                </Text>
                <Text className="mt-4 font-medium">
                  Categorías con más impresiones
                </Text>
                {stats.topCategories.length > 0 ? (
                  <div className="mt-2">
                    <BarList
                      data={stats.topCategories.map((c) => ({
                        name: c.name,
                        value: c.impressions,
                      }))}
                    />
                  </div>
                ) : (
                  <Text className="mt-2 text-xs">
                    Todavía no hay datos de impresiones.
                  </Text>
                )}
              </>
            ) : (
              <>
                <Badge color="gray" className="mt-2">
                  No conectado
                </Badge>
                <Text className="mt-3 text-xs">
                  Conecta Google Search Console para que el sistema entienda qué
                  busca la gente y sugiera oportunidades reales.
                </Text>
                <Link
                  href="/dashboard/configuracion"
                  className="mt-3 inline-block text-xs font-semibold text-blue-400 no-underline"
                >
                  Conectar ahora →
                </Link>
              </>
            )}
          </Card>
        </Col>
      </Grid>
    </div>
  );
}

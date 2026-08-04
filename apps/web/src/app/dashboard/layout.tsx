import type { ReactNode } from "react";
import DashboardNav from "@/components/DashboardNav";
import LogoutButton from "@/components/LogoutButton";
import StopImpersonationButton from "@/components/StopImpersonationButton";
import { displayName, getSessionContext } from "@/lib/current-user";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, actingAdmin } = await getSessionContext();

  return (
    <main
      className="dashboard-main"
      style={{
        maxWidth: 1400,
        margin: "0 auto",
        padding: "24px 16px",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        @media (min-width: 700px) {
          .mobile-notice { display: none; }
          .dashboard-main { padding: 32px 40px !important; }
        }
        /*
         * Tablas anchas (Accesos a usuarios, Uso de la base de datos,
         * Historial): en vez de scroll horizontal, cada fila se apila como
         * una tarjeta y cada celda muestra su encabezado como etiqueta
         * (truco clásico de "tabla responsive" solo con CSS, sin duplicar
         * la lógica/estado de cada fila).
         */
        @media (max-width: 699px) {
          table.responsive-table {
            min-width: 0 !important;
            width: 100% !important;
          }
          table.responsive-table thead { display: none; }
          table.responsive-table,
          table.responsive-table tbody,
          table.responsive-table tr,
          table.responsive-table td {
            display: block;
            width: 100%;
          }
          table.responsive-table tr {
            border-top: none !important;
            border: 1px solid #dfe3e8;
            border-radius: 8px;
            padding: 8px 10px;
            margin-bottom: 10px;
            box-sizing: border-box;
          }
          table.responsive-table td {
            padding: 6px 2px;
          }
          table.responsive-table td[data-label]::before {
            content: attr(data-label);
            display: block;
            font-size: 11px;
            font-weight: 700;
            color: #8a94a6;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            margin-bottom: 3px;
          }
        }
      `}</style>
      <div
        className="dashboard-header"
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
        }}
      >
        <h1 style={{ fontSize: 20, margin: 0, color: "#e8ecf5" }}>
          Auto Artículos
        </h1>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          {actingAdmin ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 2,
                maxWidth: "100%",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: "#a8b3c7",
                  wordBreak: "break-word",
                  textAlign: "right",
                }}
              >
                {displayName(actingAdmin)}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#ffd98a",
                  wordBreak: "break-word",
                  textAlign: "right",
                }}
              >
                Actuando como: {displayName(user)}
              </span>
            </div>
          ) : (
            <span
              style={{
                fontSize: 12,
                color: "#a8b3c7",
                wordBreak: "break-word",
              }}
            >
              {displayName(user)}
            </span>
          )}
          {actingAdmin && <StopImpersonationButton />}
          <LogoutButton />
        </div>
      </div>
      <p
        className="mobile-notice"
        style={{
          fontSize: 12,
          color: "#8a6d1a",
          background: "#fff8e6",
          border: "1px solid #f0deac",
          borderRadius: 8,
          padding: "8px 12px",
          marginTop: 12,
        }}
      >
        📱 Esta aplicación funciona en el celular, pero se recomienda usarla
        desde una computadora para una mejor experiencia.
      </p>
      <DashboardNav />
      {children}
    </main>
  );
}

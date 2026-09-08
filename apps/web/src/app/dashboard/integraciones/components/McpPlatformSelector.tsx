"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export type McpPlatform = {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: "available" | "coming_soon";
  isConnected?: boolean;
};

const MCP_PLATFORMS: McpPlatform[] = [
  {
    id: "10mws",
    name: "10minutesWebsite",
    description: "Crea y publica artículos directamente en tu sitio 10MWS",
    icon: "🌐",
    status: "available",
  },
  {
    id: "wordpress",
    name: "WordPress",
    description: "Publica en cualquier sitio WordPress.com o auto-hospedado",
    icon: "📝",
    status: "coming_soon",
  },
  {
    id: "wix",
    name: "Wix",
    description: "Integración con sitios Wix",
    icon: "✨",
    status: "coming_soon",
  },
  {
    id: "shopify",
    name: "Shopify",
    description: "Publica en blogs de Shopify",
    icon: "🛍️",
    status: "coming_soon",
  },
];

type Props = {
  connectedProviders?: string[];
  onConnect?: (platform: string) => void;
};

export function McpPlatformSelector({ connectedProviders = [], onConnect }: Props) {
  const [connecting, setConnecting] = useState<string | null>(null);

  const handleConnect = (platformId: string) => {
    setConnecting(platformId);
    if (onConnect) {
      onConnect(platformId);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Plataformas de Publicación (MCP)</h2>
        <p className="text-gray-600 text-sm">
          Conecta tus plataformas favoritas y SEO Total publicará artículos directamente sin necesidad de navegador.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MCP_PLATFORMS.map((platform) => {
          const isConnected = connectedProviders.includes(platform.id);
          const isAvailable = platform.status === "available";

          return (
            <div
              key={platform.id}
              className={`
                border rounded-lg p-4 transition-all
                ${isConnected ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"}
                ${!isAvailable ? "opacity-60" : ""}
              `}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-2xl">{platform.icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{platform.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{platform.description}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                {isConnected ? (
                  <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Conectada
                  </div>
                ) : isAvailable ? (
                  <Button
                    asChild
                    variant="default"
                    size="sm"
                    disabled={connecting === platform.id}
                    onClick={() => handleConnect(platform.id)}
                  >
                    <Link href={`/api/integrations/${platform.id}-mcp/authorize`}>
                      {connecting === platform.id ? "Conectando..." : "Conectar"}
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    Próximamente
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import OAuthNetworkSection, { type OAuthNetworkConfig } from "./OAuthNetworkSection";

const PINTEREST: OAuthNetworkConfig = {
  id: "pinterest",
  title: "Pinterest",
  lead: "Conexión administrada desde esta tarjeta. Autoriza tu cuenta y elige aquí el tablero que usará SEO TOTAL.",
  note: "Publica automáticamente tus artículos como Pins con imagen y enlace al artículo.",
  admin: {
    title: "Credenciales de la aplicación",
    help: "Client ID y Client Secret de Pinterest Developers.",
    idLabel: "Client ID",
    secretLabel: "Client Secret",
    keys: { shown: "clientId", raw: "rawClientId", bodyId: "clientId", bodySecret: "clientSecret" },
  },
  destination: { noun: "el tablero", label: "Tablero", listKey: "boards", idField: "id", nameField: "name", savedIdKey: "boardId", savedNameKey: "boardName", patchKey: "boardId", note: "Elige el tablero de esta cuenta; los demás no se usarán." },
};

export default function PinterestSection({ allowed = true }: { allowed?: boolean }) {
  return <OAuthNetworkSection config={PINTEREST} allowed={allowed} />;
}

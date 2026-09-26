"use client";

import OAuthNetworkSection, { type OAuthNetworkConfig } from "./OAuthNetworkSection";

const BLOGGER: OAuthNetworkConfig = {
  id: "blogger",
  title: "Blogger",
  lead: "Conexión administrada desde esta tarjeta. Autoriza tu cuenta de Google y elige aquí el blog que usará SEO TOTAL.",
  note: "Publica artículos en el blog de Blogger que elijas.",
  admin: {
    title: "Credenciales de la aplicación",
    help: "Client ID y Client Secret de Google Cloud.",
    idLabel: "Client ID",
    secretLabel: "Client Secret",
    keys: { shown: "clientId", raw: "rawClientId", bodyId: "clientId", bodySecret: "clientSecret" },
  },
  destination: { noun: "el blog", label: "Blog", listKey: "blogs", idField: "id", nameField: "name", savedIdKey: "blogId", savedNameKey: "blogName", patchKey: "blogId", note: "Elige el blog de esta cuenta; los demás no se usarán." },
};

export default function BloggerSection({ allowed = true }: { allowed?: boolean }) {
  return <OAuthNetworkSection config={BLOGGER} allowed={allowed} />;
}

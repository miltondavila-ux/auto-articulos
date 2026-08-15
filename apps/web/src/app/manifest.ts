import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Auto Artículos",
    short_name: "Auto Artículos",
    description:
      "Crea artículos en secuencia. Herramienta de posicionamiento web para creación de contenido en secuencia.",
    start_url: "/",
    display: "standalone",
    background_color: "#031537",
    theme_color: "#031537",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}

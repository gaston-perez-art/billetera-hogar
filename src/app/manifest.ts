import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Billetera Hogar",
    short_name: "Billetera",
    description: "Gastos del hogar, reparto y lo que queda del mes.",
    start_url: `${base}/`,
    display: "standalone",
    background_color: "#f3f5f4",
    theme_color: "#0f7a50",
    lang: "es-AR",
    // PNG para Android (el SVG no siempre lo toma para la pantalla de inicio). El iPhone usa apple-icon.png.
    icons: [
      { src: `${base}/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${base}/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${base}/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: `${base}/icon.svg`, sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}

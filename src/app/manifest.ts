import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Billetera Hogar",
    short_name: "Billetera",
    description: "Gastos del hogar, reparto y lo que queda del mes.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f5f8",
    theme_color: "#1d4ed8",
    lang: "es-AR",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}

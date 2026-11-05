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
    background_color: "#f3f5f8",
    theme_color: "#1d4ed8",
    lang: "es-AR",
    icons: [{ src: `${base}/icon.svg`, sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}

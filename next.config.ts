import type { NextConfig } from "next";

// En GitHub Pages la app vive en /billetera-hogar; en local, en la raíz.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // El POC no tiene backend: se exporta como sitio estático.
  output: "export",
  basePath,
  // Con basePath, Next pide los datos de Inicio en "/billetera-hogar.txt", que en GitHub Pages
  // queda fuera del sitio (404) y fuerza a recargar toda la app. Con barra final los pide en
  // "/billetera-hogar/index.txt", que sí existe.
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;

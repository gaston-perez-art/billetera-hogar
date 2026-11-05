import type { NextConfig } from "next";

// En GitHub Pages la app vive en /billetera-hogar; en local, en la raíz.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // El POC no tiene backend: se exporta como sitio estático.
  output: "export",
  basePath,
  images: { unoptimized: true },
};

export default nextConfig;
